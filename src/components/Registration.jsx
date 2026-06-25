import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { requestOtp, verifyOtp } from '../lib/auth.js'
import { ApiError } from '../lib/api.js'

const EASE = [0.16, 1, 0.3, 1]
const CODE_LENGTH = 4
const RESEND_SECONDS = 30

/**
 * Formats raw digits into a KG-style phone mask: +996 XXX XXX XXX
 */
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').replace(/^996/, '').slice(0, 9)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6, 9)
  let out = '+996'
  if (p1) out += ' ' + p1
  if (p2) out += ' ' + p2
  if (p3) out += ' ' + p3
  return out
}

function digitsOnly(formatted) {
  return formatted.replace(/\D/g, '').replace(/^996/, '')
}

/**
 * Auth modal — phone number + SMS code over the real Atria phone-OTP flow.
 * The same UI serves both "register" and "login": the backend's verify-otp
 * creates the account on first use or signs into the existing one.
 *
 * Usage:
 *   const [mode, setMode] = useState(null) // null | 'register' | 'login'
 *   <Registration mode={mode} onClose={() => setMode(null)} onSuccess={(p) => ...} />
 */
export default function Registration({ mode, onClose, onSuccess }) {
  const isOpen = mode === 'register' || mode === 'login'

  // steps: 1 = phone, 2 = code, 3 = success, 4 = kyc prompt
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('+996 ')
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [justResent, setJustResent] = useState(false)

  const inputsRef = useRef([])

  const phoneDigits = digitsOnly(phone)
  const phoneValid = phoneDigits.length === 9

  // reset internal state whenever the modal is (re)opened or switches mode
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setPhone('+996 ')
      setCode(Array(CODE_LENGTH).fill(''))
      setError('')
      setLoading(false)
      setResendIn(0)
      setJustResent(false)
    }
  }, [isOpen, mode])

  // lock page scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // countdown for "resend code"
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const handlePhoneChange = (e) => {
    setError('')
    setPhone(formatPhone(e.target.value))
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!phoneValid) {
      setError('Введите корректный номер телефона')
      return
    }
    setError('')
    setLoading(true)
    try {
      await requestOtp(phone)
      setStep(2)
      setResendIn(RESEND_SECONDS)
      setCode(Array(CODE_LENGTH).fill(''))
      setTimeout(() => inputsRef.current[0]?.focus(), 50)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Слишком много запросов кода. Попробуйте позже')
      } else {
        setError('Не удалось отправить код. Попробуйте ещё раз')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    setError('')
    setCode((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
    if (v && i < CODE_LENGTH - 1) {
      inputsRef.current[i + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const joined = code.join('')
    if (joined.length < CODE_LENGTH) {
      setError('Введите код полностью')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await verifyOtp(phone, joined)
      setStep(3)
      onSuccess?.({ phone, mode, tokens: result })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Код заблокирован после нескольких попыток. Запросите новый')
      } else {
        setError('Неверный код, попробуйте снова')
      }
      setCode(Array(CODE_LENGTH).fill(''))
      setTimeout(() => inputsRef.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendIn > 0 || loading) return
    setLoading(true)
    setError('')
    try {
      await requestOtp(phone)
      setResendIn(RESEND_SECONDS)
      setCode(Array(CODE_LENGTH).fill(''))
      setJustResent(true)
      setTimeout(() => setJustResent(false), 2400)
      setTimeout(() => inputsRef.current[0]?.focus(), 50)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Слишком много запросов кода. Попробуйте позже')
      } else {
        setError('Не удалось отправить код повторно')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="reg-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            className="reg-card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.45, ease: EASE }}
            role="dialog"
            aria-modal="true"
          >
            <button className="reg-close" onClick={onClose} aria-label="Закрыть">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <span className="eyebrow">{mode === 'login' ? 'Вход' : 'Регистрация'}</span>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <h2 className="reg-title display">Войдите по номеру телефона</h2>
                  <p className="reg-sub">Мы отправим SMS с кодом подтверждения</p>

                  <form onSubmit={handleSendCode} className="reg-form">
                    <label className="reg-field">
                      <span className="reg-label mono">Номер телефона</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="+996 XXX XXX XXX"
                        autoFocus
                      />
                    </label>

                    {error && <div className="reg-error">{error}</div>}

                    <button type="submit" className="btn btn-primary reg-submit" disabled={loading}>
                      <span>{loading ? 'Отправка...' : 'Получить код'}</span>
                      <span className="dot" />
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <h2 className="reg-title display">Введите код из SMS</h2>
                  <p className="reg-sub">
                    Код отправлен на <span className="reg-phone">{phone}</span>
                  </p>

                  <form onSubmit={handleVerify} className="reg-form">
                    <div className="reg-code-row">
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => (inputsRef.current[i] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className="reg-code-cell"
                          value={digit}
                          onChange={(e) => handleCodeChange(i, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        />
                      ))}
                    </div>

                    {error && <div className="reg-error">{error}</div>}
                    {justResent && !error && <div className="reg-info">Код отправлен повторно</div>}

                    <button type="submit" className="btn btn-primary reg-submit" disabled={loading}>
                      <span>{loading ? 'Проверка...' : 'Подтвердить'}</span>
                      <span className="dot" />
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost reg-resend-btn"
                      onClick={handleResend}
                      disabled={resendIn > 0 || loading}
                    >
                      <span>
                        {resendIn > 0 ? `Отправить код повторно (${resendIn}с)` : 'Отправить код повторно'}
                      </span>
                    </button>

                    <button type="button" className="reg-back" onClick={() => setStep(1)}>
                      ← Изменить номер
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 3 && mode === 'register' && (
                <motion.div
                  key="step3-register"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="reg-success"
                >
                  <div className="reg-success-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path
                        d="M4 12.5L9.5 18L20 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <h2 className="reg-title display">Готово!</h2>
                  <p className="reg-sub">Вы успешно зарегистрированы в ATRIA</p>
                  <button className="btn btn-primary reg-submit" onClick={() => setStep(4)}>
                    <span>Продолжить</span>
                    <span className="dot" />
                  </button>
                </motion.div>
              )}

              {step === 3 && mode === 'login' && (
                <motion.div
                  key="step3-login"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="reg-success"
                >
                  <div className="reg-success-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path
                        d="M4 12.5L9.5 18L20 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <h2 className="reg-title display">Вы вошли</h2>
                  <p className="reg-sub">Добро пожаловать обратно в ATRIA</p>
                  <button className="btn btn-primary reg-submit" onClick={onClose}>
                    <span>Продолжить</span>
                    <span className="dot" />
                  </button>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4-kyc"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="reg-success"
                >
                  <div className="reg-success-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path
                        d="M9 12h6M9 16h6M9 8h3M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <h2 className="reg-title display">Пройдите KYC</h2>
                  <p className="reg-sub">
                    Для начала работы с нами подтвердите личность — это займёт несколько минут
                  </p>
                  <button className="btn btn-primary reg-submit" onClick={onClose}>
                    <span>Начать</span>
                    <span className="dot" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}