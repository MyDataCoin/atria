import { PRIVACY_POLICY } from './content.policy.js'
import { CONSENT_FORM } from './content.consent.js'
import { TERMS_OF_SERVICE } from './content.tos.js'
import { WHITE_PAPER } from './content.whitepaper.js'
import { DATA_DELETION } from './content.deletion.js'

// Юр-документы, у каждого своя страница (atria.kg/privacy-policy и т.п.).
// Порядок = порядок ссылок в футере.
export const DOC_PAGES = [
  { path: '/white-paper', label: 'White Paper', doc: WHITE_PAPER },
  { path: '/terms-of-service', label: 'Пользовательское соглашение', doc: TERMS_OF_SERVICE },
  { path: '/privacy-policy', label: 'Политика конфиденциальности', doc: PRIVACY_POLICY },
  { path: '/consent', label: 'Согласие на обработку данных', doc: CONSENT_FORM },
  { path: '/data-deletion', label: 'Удаление данных', doc: DATA_DELETION },
]

/** Страница документа для текущего адреса или null (тогда показываем лендинг). */
export function docPageFor(pathname) {
  const path = pathname.replace(/\/+$/, '').toLowerCase()
  return DOC_PAGES.find((p) => p.path === path) || null
}
