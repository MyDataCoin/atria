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
export function createApplication(propertyId, amount, referralToken) {
  return apiFetch('/investments', {
    method: 'POST',
    auth: true,
    body: { propertyId, amount: Number(amount) || 0, referralToken },
  })
}
