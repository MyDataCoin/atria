// Объекты недвижимости (Properties) поверх Atria API.
// Эндпоинты: GET /properties (список), GET /properties/{id} (карточка),
// POST /properties (создание — только для админов).

import { apiFetch, tokens } from './api.js'

/**
 * Список объектов. Чтение публичное, но если пользователь авторизован —
 * шлём Bearer (бэкенд может вернуть расширенные поля).
 * @returns {Promise<Array>} массив PropertyDto
 */
export function listProperties() {
  return apiFetch('/properties', { auth: tokens.isAuthed })
}

/**
 * Один объект по id.
 * @param {string} id uuid объекта
 * @returns {Promise<object>} PropertyDto
 */
export function getProperty(id) {
  return apiFetch(`/properties/${id}`, { auth: tokens.isAuthed })
}

/**
 * Создать объект. Требует прав администратора (Bearer обязателен).
 * @param {object} data CreatePropertyRequest:
 *   { name, description, address, totalValue, tokenPrice, totalTokens, currency }
 * @returns {Promise<object>} созданный PropertyDto
 */
export function createProperty(data) {
  return apiFetch('/properties', {
    method: 'POST',
    auth: true,
    body: {
      name: data.name ?? null,
      description: data.description ?? null,
      address: data.address ?? null,
      totalValue: Number(data.totalValue) || 0,
      tokenPrice: Number(data.tokenPrice) || 0,
      totalTokens: Number(data.totalTokens) || 0,
      currency: data.currency ?? null,
    },
  })
}
