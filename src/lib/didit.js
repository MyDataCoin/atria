// Обёртка над Didit web-SDK (@didit-protocol/sdk-web).
// SDK грузится лениво (code-split), чтобы не тянуть его в основной бандл.
// url приходит с нашего бэкенда — это KycSubmissionDto.verificationUrl из POST /kyc/submit.
// ВАЖНО: onComplete/результат SDK — лишь подсказка для UI; источник истины по решению KYC —
// webhook на бэкенде, поэтому после закрытия модалки статус берём из GET /kyc/me.

/**
 * Открыть hosted-флоу Didit в модалке поверх страницы.
 * Промис резолвится, когда пользователь закрыл флоу (завершил/отменил/ошибка).
 * @param {string} url verificationUrl с бэкенда
 * @returns {Promise<{type: 'completed'|'cancelled'|'failed', session?: {sessionId: string, status: string}, error?: {type: string, message: string}}>}
 */
export async function openDiditVerification(url) {
  const { DiditSdk } = await import('@didit-protocol/sdk-web')
  return new Promise((resolve, reject) => {
    DiditSdk.shared.onComplete = (result) => resolve(result)
    DiditSdk.shared.startVerification({ url }).catch(reject)
  })
}
