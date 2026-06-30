// Заявки на покупку токенов объекта (Applications) поверх Atria API.
// Эндпоинты: POST /applications (создать заявку), POST /applications/{id}/submit.

import { apiFetch } from './api.js'

/**
 * Создать заявку на покупку доли в объекте.
 * @param {string} propertyId uuid объекта
 * @param {number} amount сумма инвестиции (в валюте объекта)
 * @returns {Promise<object>} ApplicationDto
 */
export function createApplication(propertyId, amount) {
  return apiFetch('/applications', {
    method: 'POST',
    auth: true,
    body: { propertyId, amount: Number(amount) || 0 },
  })
}

/**
 * Отправить заявку на рассмотрение.
 * @param {string} id uuid заявки
 */
export function submitApplication(id) {
  return apiFetch(`/applications/${id}/submit`, { method: 'POST', auth: true })
}
