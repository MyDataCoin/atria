// Объекты недвижимости (Properties) поверх Atria API.
// Эндпоинты: GET /properties (список), GET /properties/{id} (карточка),
// POST /properties (создание — только для админов).

import { apiFetch, tokens } from './api.js'

/**
 * Черновик ли объект (помещение или здание). Админам бэкенд отдаёт черновики вместе
 * с опубликованными — на витрине их быть не должно. Статус сравниваем без учёта
 * регистра и разделителей и заодно смотрим на возможные флаги: если бэкенд назовёт
 * поле иначе, черновик всё равно не утечёт на сайт.
 * @param {object} dto PropertyDto или BuildingDto
 */
export function isDraft(dto) {
  if (!dto) return true
  if (dto.isDraft === true || dto.isPublished === false || dto.published === false) return true
  const status = String(dto.status ?? '')
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  return status === 'draft' || status === 'archived' || status === 'hidden'
}

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
 * Список зданий вместе с помещениями внутри (`units` — те же PropertyDto).
 * Здание само токенов не выпускает: оно только группирует квартиры и гаражи,
 * у каждого из которых свой выпуск. Чтение публичное; черновые помещения
 * бэкенд отдаёт только сотрудникам.
 * @returns {Promise<Array>} массив BuildingDto
 */
export function listBuildings() {
  return apiFetch('/buildings', { auth: tokens.isAuthed })
}

/**
 * Одно здание по id (с его помещениями).
 * @param {string} id uuid здания
 * @returns {Promise<object>} BuildingDto
 */
export function getBuilding(id) {
  return apiFetch(`/buildings/${id}`, { auth: tokens.isAuthed })
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
