// Тонкий HTTP-клиент для Atria API.
// Базовый адрес берётся из VITE_API_URL (см. .env). Все запросы идут через apiFetch,
// который сам подставляет Bearer-токен и разбирает ProblemDetails-ошибки.

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const ACCESS_KEY = 'atria.accessToken'
const REFRESH_KEY = 'atria.refreshToken'
const EXPIRES_KEY = 'atria.accessExpiresAt'

// Access-токен живёт 15 минут (Jwt:AccessTokenMinutes). Обновляем чуть заранее, чтобы
// запрос не улетел с токеном, который протухнет по дороге.
const EXPIRY_SKEW_MS = 30_000

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) || null
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY) || null
  },
  save({ accessToken, refreshToken, expiresAtUtc }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
    if (accessToken) notifyAuthChanged()
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    // Бэкенд отдаёт срок жизни явно (AuthTokensDto.expiresAtUtc) — храним его, чтобы не
    // гадать по содержимому JWT. Без 'Z' Date разберёт строку как локальное время.
    if (expiresAtUtc) {
      const iso = /([Zz]|[+-]\d{2}:?\d{2})$/.test(expiresAtUtc) ? expiresAtUtc : `${expiresAtUtc}Z`
      localStorage.setItem(EXPIRES_KEY, iso)
    }
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(EXPIRES_KEY)
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
   * Раньше тут стояло `!isAccessExpired || Boolean(tokens.refresh)`, и человек с живой кукой,
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

/**
 * Обновить сессию по refresh-токену. Токен уходит и в теле, и куки летят сами
 * (бэкенд кладёт refresh в HttpOnly-куку и читает её первой — см. RefreshTokenCookie).
 *
 * Если обновиться не удалось, токены стираются: держать мёртвую сессию в localStorage —
 * это ровно тот случай, когда UI считает человека вошедшим, а API отвечает 401.
 */
async function refreshSession() {
  refreshInFlight ??= (async () => {
    const res = await fetch(`${BASE_URL}/api/v1${REFRESH_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      // Токена в localStorage может не быть вовсе — тогда обновление идёт по куке,
      // и бэкенд читает её ПЕРВОЙ (см. RefreshTokenCookie), а тело остаётся запасным путём.
      body: JSON.stringify({ refreshToken: tokens.refresh }),
    })

    if (!res.ok) throw new ApiError('Не удалось обновить сессию', res.status, null)

    const data = safeJson(await res.text())
    if (!data?.accessToken) throw new ApiError('Ответ обновления без токена', res.status, data)

    tokens.save(data)
    return data
  })()

  try {
    return await refreshInFlight
  } catch (err) {
    tokens.clear()
    sessionLostHandlers.forEach((h) => {
      try {
        h()
      } catch {
        /* один упавший обработчик не должен рвать остальным цепочку */
      }
    })
    throw err
  } finally {
    refreshInFlight = null
  }
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
