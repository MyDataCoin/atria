// Заявка инвестора на покупку долей объекта поверх Atria API.
//
// Эндпоинт один: POST /investments. Отдельного ресурса /applications на бэкенде нет и не было —
// «заявка» и «инвестиция» это одна и та же сущность на разных стадиях жизненного цикла
// (Reserved → Active). Шага «отправить на рассмотрение» тоже нет: заявка создаётся сразу
// в статусе Reserved и ждёт решения оператора.

import { apiFetch } from './api.js'

/**
 * Создать заявку на покупку доли в объекте.
 *
 * Уходит СУММА, а количество долей бэкенд выводит из неё сам (отсечением вниз до масштаба доли),
 * поэтому здесь нет параметра с количеством — иначе обе стороны считали бы его каждая по-своему.
 *
 * @param {string} propertyId uuid объекта
 * @param {number} amount сумма инвестиции в валюте объекта
 * @param {string} [referralToken] токен реферальной ссылки риелтора, если инвестор пришёл по ней
 * @returns {Promise<string>} uuid созданной заявки
 */
/**
 * Неоплаченная (Reserved, резерв ещё не истёк) заявка инвестора на этот объект — самая свежая,
 * либо null. Нужна, чтобы повторное «Купить» предлагало оплатить уже созданную заявку, а не
 * плодило новые резервы.
 */
export async function findOpenApplication(propertyId) {
  const list = await apiFetch('/investments/me', { auth: true })
  const now = Date.now()
  return (
    (Array.isArray(list) ? list : [])
      .filter(
        (a) =>
          a.propertyId === propertyId &&
          String(a.status).toLowerCase() === 'reserved' &&
          new Date(a.reservedUntilUtc).getTime() > now,
      )
      .sort((a, b) => new Date(b.createdAtUtc) - new Date(a.createdAtUtc))[0] ?? null
  )
}

export function createApplication(propertyId, amount, referralToken) {
  return apiFetch('/investments', {
    method: 'POST',
    auth: true,
    body: { propertyId, amount: Number(amount) || 0, referralToken },
  })
}
