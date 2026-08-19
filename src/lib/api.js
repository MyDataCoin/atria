// Тонкий HTTP-клиент для Atria API.
// Базовый адрес берётся из VITE_API_URL (см. .env). Все запросы идут через apiFetch,
// который сам подставляет Bearer-токен и разбирает ProblemDetails-ошибки.

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const ACCESS_KEY = 'atria.accessToken'
const EXPIRES_KEY = 'atria.accessExpiresAt'

// Ключ, под которым refresh-токен хранился раньше. Оставлен ТОЛЬКО чтобы вычистить его у тех,
// кто успел залогиниться до этой правки: долгоживущий токен обновления не должен лежать там,
// где его прочитает любой скрипт, исполнившийся на atria.kg.
const LEGACY_REFRESH_KEY = 'atria.refreshToken'

// Access-токен живёт 15 минут (Jwt:AccessTokenMinutes). Обновляем чуть заранее, чтобы
// запрос не улетел с токеном, который протухнет по дороге.
const EXPIRY_SKEW_MS = 30_000

// Разовая уборка: у всех, кто входил до этой правки, в localStorage лежит refresh-токен.
localStorage.removeItem(LEGACY_REFRESH_KEY)

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) || null
  },
  /**
   * Сохранить выданную пару. Refresh-токен из ответа НЕ сохраняется: бэкенд кладёт его в
   * HttpOnly-куку `.atria.kg` (см. RefreshTokenCookie), недоступную JS, — а копия в localStorage
   * ровно это и обнуляла: любой скрипт на странице (скомпрометированная зависимость, сторонний
   * виджет, `javascript:`-ссылка) мог унести бесконечно продлеваемую сессию на чужой сервер.
   * Ротация тут не спасает — атакующий просто обновляется первым.
   */
  save({ accessToken, expiresAtUtc }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
    if (accessToken) notifyAuthChanged()
    // Бэкенд отдаёт срок жизни явно (AuthTokensDto.expiresAtUtc) — храним его, чтобы не
    // гадать по содержимому JWT. Без 'Z' Date разберёт строку как локальное время.
    if (expiresAtUtc) {
      const iso = /([Zz]|[+-]\d{2}:?\d{2})$/.test(expiresAtUtc) ? expiresAtUtc : `${expiresAtUtc}Z`
      localStorage.setItem(EXPIRES_KEY, iso)
    }
    scheduleProactiveRefresh()
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(LEGACY_REFRESH_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    cancelProactiveRefresh()
    notifyAuthChanged()
  },
  /** Протух ли access-токен. Без сохранённого срока считаем, что протух — пусть refresh решит. */
  get isAccessExpired() {
    const raw = localStorage.getItem(EXPIRES_KEY)
    if (!raw) return true
    const at = Date.parse(raw)
    return Number.isNaN(at) ? true : Date.now() + EXPIRY_SKEW_MS >= at
  },
  /**
   * Входил ли человек в аккаунт. Ответ обязательно приблизительный, и это не недосмотр:
   * refresh-токен бэкенд кладёт в HttpOnly-куку, которую JS прочитать не может, поэтому
   * «продлится ли сессия» здесь в принципе не вычисляется — это знает только сервер.
   *
   * Раньше тут стояло `!isAccessExpired || Boolean(<refresh из localStorage>)`, и человек с живой кукой,
   * но без копии токена в localStorage, читался как незалогиненный. Теперь наличие access-токена
   * считается сессией, а мёртвая сессия обнаруживается на первом же запросе: apiFetch пробует
   * обновление, не получается — токены стираются и срабатывает onSessionLost.
   */
  get isAuthed() {
    return Boolean(localStorage.getItem(ACCESS_KEY))
  },
}

/** Ошибка с http-статусом и распарсенным телом ProblemDetails (если было). */
export class ApiError extends Error {
  constructor(message, status, problem) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

const REFRESH_PATH = '/auth/refresh'

// Один общий запрос обновления на всех: если сразу несколько вызовов упрутся в протухший
// токен, они дождутся одного и того же refresh, а не выпустят пачку параллельных —
// бэкенд ротирует refresh-токен, и второй такой запрос получил бы уже отозванный.
let refreshInFlight = null

/** Подписчики на потерю сессии — UI использует это, чтобы вернуть человека ко входу. */
const sessionLostHandlers = new Set()

/**
 * Подписчики на смену состояния входа. Нужны потому, что войти можно из нескольких мест
 * (шапка, модалка покупки), а шапка обязана показать «Дашборд» и «Выйти» сразу — не дожидаясь,
 * пока закроют ту модалку, через которую человек вошёл, и не по перезагрузке страницы.
 */
const authChangedHandlers = new Set()

function notifyAuthChanged() {
  authChangedHandlers.forEach((h) => {
    try {
      h()
    } catch {
      /* один упавший обработчик не должен рвать остальным цепочку */
    }
  })
}

/** Подписаться на «вошли или вышли». Возвращает функцию отписки. */
export function onAuthChange(handler) {
  authChangedHandlers.add(handler)
  return () => authChangedHandlers.delete(handler)
}

/** Подписаться на «сессия окончательно потеряна». Возвращает функцию отписки. */
export function onSessionLost(handler) {
  sessionLostHandlers.add(handler)
  return () => sessionLostHandlers.delete(handler)
}

/** Ошибка «сессии больше нет»: сервер отказал самому refresh-токену (401/403). */
export class SessionExpiredError extends ApiError {
  constructor(status, problem) {
    super('Сессия истекла — войдите снова', status, problem)
    this.name = 'SessionExpiredError'
  }
}

/**
 * Ошибка «обновиться сейчас не вышло»: сеть отвалилась, бэкенд перезапускается, шлюз отдал 502.
 * Сессия при этом НЕ трогается — именно смешение этих двух случаев и приводило к тому, что
 * секунда без интернета стоила человеку полного повторного входа.
 */
export class RefreshUnavailableError extends ApiError {
  constructor(cause) {
    super('Не удалось обновить сессию — проблема со связью', 0, null)
    this.name = 'RefreshUnavailableError'
    this.cause = cause
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Пара повторов перед тем, как признать обновление неудачным: одна неудачная попытка — это ещё
// не приговор сессии.
const REFRESH_RETRY_DELAYS_MS = [400, 1200]

// Таймер, который обновляет токен ЗАРАНЕЕ, а не после первого 401.
let proactiveTimer = null

function cancelProactiveRefresh() {
  if (proactiveTimer) clearTimeout(proactiveTimer)
  proactiveTimer = null
}

/**
 * Планирует обновление за EXPIRY_SKEW_MS до конца жизни access-токена.
 *
 * Без него сессия продлевалась только «по факту 401»: каждые пятнадцать минут первые запросы
 * падали и переигрывались, а запрос, который переиграть нельзя (отправка формы, загрузка файла),
 * просто терялся. Открытая на весь день вкладка — это та же история десятки раз.
 */
function scheduleProactiveRefresh() {
  cancelProactiveRefresh()
  const raw = localStorage.getItem(EXPIRES_KEY)
  if (!tokens.access || !raw) return

  const at = Date.parse(raw)
  if (Number.isNaN(at)) return

  // Не раньше чем через пару секунд: часы сервера могут идти вперёд, и цикл бы закрутился.
  proactiveTimer = setTimeout(
    () => {
      refreshSession().catch(() => {})
    },
    Math.max(at - Date.now() - EXPIRY_SKEW_MS, 5_000),
  )
}

/**
 * Обновить сессию. Токен обновления живёт только в HttpOnly-куке, которую браузер отправляет
 * сам при `credentials: 'include'`; в теле его больше нет и на клиенте его копии не существует
 * (см. `tokens.save`). Бэкенд и так читает куку ПЕРВОЙ — см. RefreshTokenCookie.
 *
 * Сессия стирается ТОЛЬКО когда сервер отказал токену (401/403). Раньше её стирала любая ошибка,
 * включая обрыв связи, — и человека выбрасывало на вход из-за одного неудачного запроса.
 */
async function refreshSession() {
  refreshInFlight ??= (async () => {
    let lastError = null

    for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS_MS.length; attempt += 1) {
      if (attempt > 0) await sleep(REFRESH_RETRY_DELAYS_MS[attempt - 1])

      let res
      try {
        res = await fetch(`${BASE_URL}/api/v1${REFRESH_PATH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          // Пустое тело: обновление идёт исключительно по HttpOnly-куке.
          body: JSON.stringify({}),
        })
      } catch (networkErr) {
        lastError = networkErr
        continue
      }

      if (res.status === 401 || res.status === 403) {
        throw new SessionExpiredError(res.status, safeJson(await res.text()))
      }

      if (!res.ok) {
        lastError = new ApiError('Не удалось обновить сессию', res.status, null)
        continue
      }

      const data = safeJson(await res.text())
      if (!data?.accessToken) {
        lastError = new ApiError('Ответ обновления без токена', res.status, data)
        continue
      }

      tokens.save(data)
      return data
    }

    throw new RefreshUnavailableError(lastError)
  })()

  try {
    return await refreshInFlight
  } catch (err) {
    // Сессия окончена — чистим и говорим об этом UI. Временный сбой сессию не трогает: следующий
    // запрос (или возврат во вкладку) попробует снова.
    if (err instanceof SessionExpiredError) {
      tokens.clear()
      sessionLostHandlers.forEach((h) => {
        try {
          h()
        } catch {
          /* один упавший обработчик не должен рвать остальным цепочку */
        }
      })
    }
    throw err
  } finally {
    refreshInFlight = null
  }
}

// Возвращение во вкладку и восстановление сети — два момента, когда сессия чаще всего выглядит
// «слетевшей»: в фоновых вкладках браузер тормозит таймеры, и плановое обновление могло не сработать.
if (typeof document !== 'undefined') {
  const renewIfStale = () => {
    if (tokens.access && tokens.isAccessExpired) refreshSession().catch(() => {})
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renewIfStale()
  })
  window.addEventListener('online', renewIfStale)

  // Вход или выход в соседней вкладке того же домена: localStorage шлёт событие, и шапка здесь
  // обязана перестроиться — иначе одна вкладка показывает «Дашборд», а вторая «Войти».
  window.addEventListener('storage', (event) => {
    if (event.key === ACCESS_KEY || event.key === null) {
      scheduleProactiveRefresh()
      notifyAuthChanged()
    }
  })

  // Стартовое расписание: вкладку могли открыть с уже сохранённым токеном.
  scheduleProactiveRefresh()
}

/**
 * Базовый запрос. path — это путь после /api/v1, например '/auth/login'.
 * options: { method, body (объект → JSON), auth (слать ли Bearer), headers }
 *
 * Для auth-запросов сессия поддерживается сама: протухший access обновляется ДО отправки,
 * а 401 в ответ (токен отозвали на сервере) вызывает одно обновление и повтор запроса.
 */
export async function apiFetch(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const isRefreshCall = path === REFRESH_PATH

  if (auth && !isRefreshCall && tokens.access && tokens.isAccessExpired) {
    // Ошибку глушим: пусть запрос уйдёт со старым токеном и получит честный 401 ниже,
    // чем мы здесь развалимся с невнятным исключением.
    await refreshSession().catch(() => {})
  }

  const send = () => {
    const finalHeaders = { ...headers }
    let payload = body

    if (body !== undefined && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    if (auth && tokens.access) {
      finalHeaders['Authorization'] = `Bearer ${tokens.access}`
    }

    return fetch(`${BASE_URL}/api/v1${path}`, {
      method,
      headers: finalHeaders,
      credentials: 'include',
      body: payload,
    })
  }

  let res = await send()

  // Пробуем обновиться на любом 401 по auth-запросу, а не только когда refresh-токен лежит
  // в localStorage: его там может не быть законно — он живёт в HttpOnly-куке. Условие
  // `&& tokens.refresh` означало, что клиент отказывался даже ПОПРОБОВАТЬ обновиться, хотя
  // куки хватило бы, и человек с истёкшим access-токеном просто упирался в мёртвый 401.
  if (res.status === 401 && auth && !isRefreshCall && tokens.access) {
    try {
      await refreshSession()
      res = await send()
    } catch {
      // Обновиться не вышло — токены уже стёрты, подписчики оповещены. Отдаём 401 ниже,
      // и вызывающий код увидит tokens.isAuthed === false.
    }
  }

  // 204 / пустое тело
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    if (res.ok) return null
  }

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const detail = data?.detail || data?.title || res.statusText
    throw new ApiError(detail || 'Request failed', res.status, data)
  }

  return data
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
