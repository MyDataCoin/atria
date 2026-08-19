import { useState } from 'react'
import { motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import Reveal from '../components/Reveal.jsx'
import DocModal from '../components/DocModal.jsx'
import { CONSENT_FORM } from '../content.consent.js'
import { useContent, useLang } from '../i18n.jsx'
import { submitFeedback, feedbackErrorText } from '../lib/feedback.js'

const EASE = [0.16, 1, 0.3, 1]

// Те же грубые проверки, что и на сервере. Строгие маски отсекают живых людей с непривычным
// форматом записи, а точность здесь не нужна — отвечает всё равно человек.
function emailLooksUsable(value) {
  const v = (value || '').trim()
  const at = v.indexOf('@')
  return at > 0 && at < v.length - 1 && v.indexOf('.', at) > at + 1 && !v.includes(' ')
}

function phoneLooksUsable(value) {
  const v = (value || '').trim()
  const digits = (v.match(/\d/g) || []).length
  return digits >= 9 && /^[\d+()\-\s]+$/.test(v)
}

/**
 * Форма обратной связи: имя, способ связи и вопрос. Отправляется анонимно (POST /feedback),
 * согласие на обработку данных — обязательная галочка, текст открывается тут же.
 */
export default function Contact() {
  const c = useContent().contact
  const { lang } = useLang()

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', message: '' })
  const [consent, setConsent] = useState(false)
  const [showConsentDoc, setShowConsentDoc] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    setError('')
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const canSubmit =
    form.fullName.trim().length > 1 &&
    emailLooksUsable(form.email) &&
    phoneLooksUsable(form.phone) &&
    form.message.trim().length > 4 &&
    consent &&
    !sending

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError('')
    try {
      await submitFeedback(form)
      setSent(true)
      setForm({ fullName: '', email: '', phone: '', message: '' })
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
                  placeholder={c.fields.namePlaceholder}
                  maxLength={256}
                  autoComplete="name"
                />
              </label>

              <div className="contact-pair">
                <label className="reg-field">
                  <span className="reg-label mono">{c.fields.email}</span>
                  <input
                    type="text"
                    value={form.email}
                    onChange={set('email')}
                    placeholder={c.fields.emailPlaceholder}
                    maxLength={256}
                    autoComplete="email"
                    inputMode="email"
                  />
                </label>

                <label className="reg-field">
                  <span className="reg-label mono">{c.fields.phone}</span>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder={c.fields.phonePlaceholder}
                    maxLength={32}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>
              </div>
              <span className="contact-hint">{c.fields.contactHint}</span>

              <label className="reg-field">
                <span className="reg-label mono">{c.fields.message}</span>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  placeholder={c.fields.messagePlaceholder}
                  rows={5}
                  maxLength={4000}
                />
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

              <button type="submit" className="btn btn-primary contact-submit" disabled={!canSubmit}>
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
