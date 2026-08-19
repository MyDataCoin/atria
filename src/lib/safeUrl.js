/**
 * Возвращает URL, который безопасно подставить в `href`/`src`, либо `undefined`.
 *
 * React НЕ санитизирует `href`: строка `javascript:...`, пришедшая из API вместе с карточкой
 * объекта, выполнится в origin atria.kg по клику — то есть чужой скрипт получит доступ ко всему,
 * что доступно странице. Пропускаем только веб-ссылки; всё остальное считаем непригодным.
 *
 * Та же функция есть в кабинете инвестора (`src/utils.js`) — держим поведение одинаковым.
 */
export function safeUrl(url) {
  if (typeof url !== 'string') return undefined
  return /^https?:\/\//i.test(url.trim()) ? url : undefined
}
