// Согласие на обработку персональных данных (ПДн) поверх Atria API.
// Фиксируется ПЕРЕД первой передачей ПДн (POST /kyc/submit): бэкенд обязан сохранить
// кто/когда/версию текста — это доказательство факта и версии принятия для регулятора.
//
// ВНИМАНИЕ: на момент написания эндпоинта /consent в API нет — бэкенду нужно его добавить
// (POST /api/v1/consent). Пока ручки нет, вызов упадёт; UI-гейт (чекбокс) всё равно работает.

import { apiFetch } from './api.js'

// Версия текста согласия. Меняется при каждом изменении формулировок — бэкенд её сохраняет.
export const CONSENT_VERSION = '1.0'

/**
 * Зафиксировать согласие на обработку ПДн.
 * @param {object} [opts]
 * @param {string} [opts.type] тип согласия (по умолчанию 'pdn')
 * @param {string} [opts.version] версия текста (по умолчанию CONSENT_VERSION)
 * @returns {Promise<object|null>}
 */
export function postConsent({ type = 'pdn', version = CONSENT_VERSION } = {}) {
  return apiFetch('/consent', {
    method: 'POST',
    auth: true,
    body: { type, version, accepted: true },
  })
}
