// Форма обратной связи с публичного сайта поверх Atria API.
//
// Эндпоинт анонимный (POST /feedback): пишет человек без аккаунта. Обращение никуда не пересылается
// почтой — его читают в супер-админке. Бэкенд ограничивает частоту по IP и удаляет обращения через
// 90 дней — ровно то, что обещает текст согласия под формой.

import { apiFetch, ApiError } from './api.js'

/**
 * Отправить вопрос через форму обратной связи.
 *
 * @param {{fullName: string, email: string, phone: string, message: string}} form
 * @returns {Promise<string>} uuid обращения
 */
export function submitFeedback({ fullName, email, phone, message }) {
  return apiFetch('/feedback', {
    method: 'POST',
    body: {
      fullName: (fullName || '').trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      message: (message || '').trim(),
    },
  })
}

/** Человекочитаемая причина отказа: 429 у формы обратной связи — самый вероятный ответ. */
export function feedbackErrorText(err, lang = 'ru') {
  const tooMany = lang === 'kg'
    ? 'Өтө көп жөнөтүү. Бир аздан кийин кайра аракет кылыңыз.'
    : 'Слишком много отправок подряд. Попробуйте через минуту.'
  const generic = lang === 'kg'
    ? 'Жөнөтүү мүмкүн болбоду. Кайра аракет кылыңыз.'
    : 'Не удалось отправить. Попробуйте ещё раз.'

  if (!(err instanceof ApiError)) return generic
  if (err.status === 429) return tooMany
  // 400 приходит с ProblemDetails: там уже написано, какое поле не устроило.
  if (err.status === 400) return err.message || generic
  return generic
}
