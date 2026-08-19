import { useState } from 'react'
import { motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import Reveal from '../components/Reveal.jsx'
import DocModal from '../components/DocModal.jsx'
import { CONSENT_FORM } from '../content.consent.js'
import { useContent, useLang } from '../i18n.jsx'
import { submitFeedback, feedbackErrorText } from '../lib/feedback.js'

const EASE = [0.16, 1, 0.3, 1]

// Проверка почты намеренно грубая — как и на сервере: строгая маска отсекает живых людей
// с непривычным адресом, а точность здесь не нужна.
function emailLooksUsable(value) {
  const v = (value || '').trim()
  const at = v.indexOf('@')
  return at > 0 && at < v.length - 1 && v.indexOf('.', at) > at + 1 && !v.includes(' ')
}

// Телефон вводится как в форме регистрации: +996 в поле уже стоит, человек набирает
// девять своих цифр. Маска не даёт ни стереть код страны, ни набрать десятую цифру.
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').replace(/^996/, '').slice(0, 9)
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean)
  return parts.length ? `+996 ${parts.join(' ')}` : '+996 '
}

const phoneDigits = (formatted) => formatted.replace(/\D/g, '').replace(/^996/, '')

/**
 * Форма обратной связи: имя, способ связи и вопрос. Отправляется анонимно (POST /feedback),
 * согласие на обработку данных — обязательная галочка, текст открывается тут же.
 */
export default function Contact() {
  const c = useContent().contact
  const { lang } = useLang()

  const [form, setForm] = useState({ fullName: '', email: '', phone: '+996 ', message: '' })
  // Поля, которые человек уже трогал: подсказку об ошибке показываем только по ним, а не
  // подсвечиваем красным форму, к которой ещё не притрагивались.
  const [touched, setTouched] = useState({})
  const [consent, setConsent] = useState(false)
  const [showConsentDoc, setShowConsentDoc] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    setError('')
    const value = key === 'phone' ? formatPhone(e.target.value) : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const markTouched = (key) => () => setTouched((t) => ({ ...t, [key]: true }))

  // Что именно не так с каждым полем. Одно место на форму: по нему и блокируется отправка,
  // и рисуются подсказки, поэтому «кнопка серая, а почему — непонятно» не получается.
  const problems = {
    fullName: form.fullName.trim().length > 1 ? '' : c.errors.name,
    email: emailLooksUsable(form.email) ? '' : c.errors.email,
    phone: phoneDigits(form.phone).length === 9 ? '' : c.errors.phone,
    message: form.message.trim().length > 4 ? '' : c.errors.message,
  }
  const firstProblem = Object.values(problems).find(Boolean) || ''

  const canSubmit = !firstProblem && consent && !sending

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) {
      // Форма не уходит наполовину заполненной, но и молчать нельзя: показываем, чего не хватает.
      setTouched({ fullName: true, email: true, phone: true, message: true })
      setError(firstProblem || (consent ? '' : c.errors.consent))
      return
    }
    setSending(true)
    setError('')
    try {
      await submitFeedback(form)
      setSent(true)
      setForm({ fullName: '', email: '', phone: '+996 ', message: '' })
      setTouched({})
      setConsent(false)
    } catch (err) {
      setError(feedbackErrorText(err, lang))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container contact-grid">
        <div className="contact-rail">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2 className="s-h2" style={{ marginTop: '1rem' }}>
            <Accent text={c.headline} />
          </h2>
          <p className="s-sub">{c.subhead}</p>
          <ul className="contact-points">
            {c.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <Reveal as="div" className="contact-card" y={20}>
          {sent ? (
            <motion.div
              className="contact-done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <span className="contact-done-mark">✓</span>
              <h3>{c.doneTitle}</h3>
              <p>{c.doneText}</p>
              <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>
                <span>{c.doneAgain}</span>
              </button>
            </motion.div>
          ) : (
            <form className="contact-form" onSubmit={onSubmit} noValidate>
              <label className="reg-field">
                <span className="reg-label mono">{c.fields.name}</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={set('fullName')}
                  onBlur={markTouched('fullName')}
                  placeholder={c.fields.namePlaceholder}
                  maxLength={256}
                  autoComplete="name"
                  aria-invalid={touched.fullName && !!problems.fullName}
                />
                {touched.fullName && problems.fullName && (
                  <span className="contact-invalid">{problems.fullName}</span>
                )}
              </label>

              <div className="contact-pair">
                <label className="reg-field">
                  <span className="reg-label mono">{c.fields.email}</span>
                  <input
                    type="text"
                    value={form.email}
                    onChange={set('email')}
                    onBlur={markTouched('email')}
                    placeholder={c.fields.emailPlaceholder}
                    maxLength={256}
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={touched.email && !!problems.email}
                  />
                  {touched.email && problems.email && (
                    <span className="contact-invalid">{problems.email}</span>
                  )}
                </label>

                <label className="reg-field">
                  <span className="reg-label mono">{c.fields.phone}</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    onBlur={markTouched('phone')}
                    placeholder={c.fields.phonePlaceholder}
                    maxLength={18}
                    autoComplete="tel"
                    inputMode="numeric"
                    aria-invalid={touched.phone && !!problems.phone}
                  />
                  {touched.phone && problems.phone && (
                    <span className="contact-invalid">{problems.phone}</span>
                  )}
                </label>
              </div>
              <span className="contact-hint">{c.fields.contactHint}</span>

              <label className="reg-field">
                <span className="reg-label mono">{c.fields.message}</span>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  onBlur={markTouched('message')}
                  placeholder={c.fields.messagePlaceholder}
                  rows={5}
                  maxLength={4000}
                  aria-invalid={touched.message && !!problems.message}
                />
                {touched.message && problems.message && (
                  <span className="contact-invalid">{problems.message}</span>
                )}
              </label>

              <label className="reg-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setError('')
                    setConsent(e.target.checked)
                  }}
                />
                <span>
                  {c.consent.before}{' '}
                  <button
                    type="button"
                    className="reg-consent-link"
                    onClick={() => setShowConsentDoc(true)}
                  >
                    {c.consent.link}
                  </button>{' '}
                  {c.consent.after}
                </span>
              </label>

              {error && <div className="reg-error">{error}</div>}

              {/* Кнопка не блокируется: нажатие по неполной форме показывает, какого поля не хватает,
                  а серая кнопка без объяснения оставляет человека гадать. */}
              <button type="submit" className="btn btn-primary contact-submit" disabled={sending}>
                <span className="dot" />
                <span>{sending ? c.sending : c.submit}</span>
              </button>

              <p className="contact-note">{c.note}</p>
            </form>
          )}
        </Reveal>
      </div>

      <DocModal doc={showConsentDoc ? CONSENT_FORM : null} onClose={() => setShowConsentDoc(false)} />
    </section>
  )
}
