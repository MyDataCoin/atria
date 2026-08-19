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

/**
 * Шаг 1: запросить SMS-код.
 *
 * ВРЕМЕННО ОТКЛЮЧЕНО: SMS-шлюз дёргать нельзя ни при каких условиях. Функция ничего
 * не запрашивает у бэкенда — на UI работает фиксированный код 111111 (см. Registration.jsx).
 * Оставлена как no-op, чтобы даже случайный вызов не ушёл на /request-otp.
 * Чтобы вернуть реальную отправку — раскомментируй тело и убери return.
 */
export function requestOtp(phone) {
  void phone
  return Promise.resolve(null)
  // return apiFetch('/auth/register/phone/request-otp', {
  //   method: 'POST',
  //   body: { phone: toApiPhone(phone) },
  // })
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

/**
 * Выйти из аккаунта.
 *
 * Локальной очистки недостаточно: refresh-токен живёт в HttpOnly-куке `.atria.kg`, стереть
 * которую из JS нельзя. Не сказав об этом серверу, мы бы оставили сессию живой — первый же
 * 401 привёл бы к молчаливому восстановлению входа по куке. Поэтому сначала просим сервер
 * отозвать токен и погасить куку, и только потом чистим локальное состояние. Ответ не ждём
 * дольше необходимого: если запрос не дошёл, человек всё равно должен увидеть себя вышедшим.
 */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST', body: {} })
  } catch {
    /* сеть/сервер недоступны — локальный выход всё равно выполняем */
  } finally {
    tokens.clear()
  }
}

export { tokens }
