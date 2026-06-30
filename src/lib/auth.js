// Авторизация: phone-OTP флоу Кыргызстана (+996) поверх Atria API.
// Эндпоинты: POST /auth/register/phone/request-otp и /auth/register/phone/verify-otp.

import { apiFetch, tokens } from './api.js'

/**
 * Приводит маску '+996 700 123 456' к формату API '996700123456' (без +).
 * Принимает как сырые цифры, так и уже отформатированную строку.
 */
export function toApiPhone(input) {
  const digits = String(input).replace(/\D/g, '').replace(/^996/, '').slice(0, 9)
  return `996${digits}`
}

/** Шаг 1: запросить SMS-код. Возвращает null (204). */
export function requestOtp(phone) {
  return apiFetch('/auth/register/phone/request-otp', {
    method: 'POST',
    body: { phone: toApiPhone(phone) },
  })
}

/**
 * Шаг 2: подтвердить код. При первом успешном вызове создаётся аккаунт Investor.
 * Возвращает AuthTokensDto и сразу сохраняет токены.
 */
export async function verifyOtp(phone, code) {
  const data = await apiFetch('/auth/register/phone/verify-otp', {
    method: 'POST',
    body: { phone: toApiPhone(phone), code },
  })
  if (data) tokens.save(data)
  return data
}

export function logout() {
  tokens.clear()
}

export { tokens }
