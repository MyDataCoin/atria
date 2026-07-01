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
