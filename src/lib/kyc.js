// KYC-верификация (hosted-провайдер, по умолчанию Didit) поверх Atria API.
// Флоу: POST /kyc/submit открывает сессию у провайдера и возвращает verificationUrl
// (туда редиректим пользователя); решение приходит асинхронно через webhook на бэкенд,
// а фронт узнаёт итог, опрашивая GET /kyc/me.

import { apiFetch, ApiError } from './api.js'

/** Статусы KYC-профиля (KycStatus в API). */
export const KycStatus = {
  Pending: 'Pending',
  UnderReview: 'UnderReview',
  Approved: 'Approved',
  Rejected: 'Rejected',
}

/** Провайдеры KYC (KycProviderType в API). Для проекта основной — Didit. */
export const KycProvider = {
  Didit: 'Didit',
  SumSub: 'SumSub',
  Manual: 'Manual',
}

/**
 * Шаг 1: отправить KYC и открыть сессию верификации у провайдера.
 * Профиль переводится в UnderReview. Клиент ОБЯЗАН редиректнуть пользователя на
 * verificationUrl из ответа, чтобы завершить проверку.
 * @param {object} [opts]
 * @param {string} [opts.provider] провайдер (по умолчанию Didit)
 * @param {string} [opts.walletAddress] опц. 0x-адрес кошелька для аллокации токенов
 * @param {string} [opts.fullName] опц. полное имя
 * @param {string} [opts.documentNumber] опц. номер документа
 * @param {string} [opts.nationality] опц. гражданство
 * @returns {Promise<{profileId: string, status: string, sessionId: string, verificationUrl: string}>}
 */
export function submitKyc(opts = {}) {
  const { provider = KycProvider.Didit, walletAddress, fullName, documentNumber, nationality } = opts
  return apiFetch('/kyc/submit', {
    method: 'POST',
    auth: true,
    body: { provider, walletAddress, fullName, documentNumber, nationality },
  })
}

/**
 * Текущий статус KYC-профиля инвестора.
 * Возвращает null, если профиля ещё нет (API отдаёт 404 — значит KYC не начинали).
 * @returns {Promise<{id: string, status: string, rejectionReason: string|null}|null>}
 */
export async function getKycStatus() {
  try {
    return await apiFetch('/kyc/me', { method: 'GET', auth: true })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

/** Прошёл ли инвестор KYC (профиль в статусе Approved). */
export function isKycApproved(profile) {
  return profile?.status === KycStatus.Approved
}

/** Валидный ли адрес кошелька: 0x + 40 hex (как ждёт бэкенд для аллокации токенов). */
export function isValidWallet(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(address || '').trim())
}

/**
 * Привязать криптокошелёк к KYC-профилю инвестора (для аллокации токенов).
 * ВНИМАНИЕ: на момент написания в API нет отдельной ручки — walletAddress принимается
 * только в POST /kyc/submit. Бэкенду нужно добавить эндпоинт (напр. PATCH /kyc/wallet).
 * Путь ниже — предполагаемый; подтвердить/поправить, когда бэкенд его реализует.
 */
export function attachWallet(walletAddress) {
  return apiFetch('/kyc/wallet', {
    method: 'PATCH',
    auth: true,
    body: { walletAddress: String(walletAddress).trim() },
  })
}

// Решение по KYC приходит вебхуком от провайдера, поэтому сразу после того, как человек
// закрыл окно Didit, профиль ещё висит в UnderReview. Без отметки «проверку он уже прошёл»
// сайт при следующем заходе снова открывал ему экран «Пройдите KYC» — хотя пройти её
// повторно нельзя (бэкенд запрещает ресабмит). Флаг живёт в localStorage и снимается,
// когда бэкенд отдаёт финальный статус.
const SUBMITTED_KEY = 'atria.kyc.submitted'

/** Отметить, что пользователь довёл проверку до конца и ждёт решения провайдера. */
export function markKycSubmitted() {
  try {
    localStorage.setItem(SUBMITTED_KEY, String(Date.now()))
  } catch {
    /* приватный режим / переполненное хранилище — не критично */
  }
}

/** Снять отметку: решение пришло (Approved или Rejected) либо профиля больше нет. */
export function clearKycSubmitted() {
  try {
    localStorage.removeItem(SUBMITTED_KEY)
  } catch {
    /* см. выше */
  }
}

/** Проходил ли пользователь проверку в этом браузере и ждёт ли решения. */
export function wasKycSubmitted() {
  try {
    return Boolean(localStorage.getItem(SUBMITTED_KEY))
  } catch {
    return false
  }
}

/**
 * Дождаться решения по KYC: опрашиваем GET /kyc/me, пока статус не станет финальным
 * (Approved/Rejected) или пока не выйдет время. Нужен сразу после закрытия окна Didit —
 * вебхук обычно доходит за несколько секунд.
 * @param {object} [opts]
 * @param {number} [opts.attempts] сколько раз опросить
 * @param {number} [opts.intervalMs] пауза между опросами
 * @returns {Promise<object|null>} последний известный профиль
 */
export async function waitForKycDecision({ attempts = 6, intervalMs = 1500 } = {}) {
  let profile = null
  for (let i = 0; i < attempts; i += 1) {
    profile = await getKycStatus().catch(() => profile)
    if (profile?.status === KycStatus.Approved || profile?.status === KycStatus.Rejected) {
      clearKycSubmitted()
      return profile
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, intervalMs))
  }
  return profile
}
