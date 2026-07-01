import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { requestOtp, verifyOtp } from '../lib/auth.js'
import { submitKyc, getKycStatus, KycStatus } from '../lib/kyc.js'
import { openDiditVerification } from '../lib/didit.js'
import { ApiError } from '../lib/api.js'

const EASE = [0.16, 1, 0.3, 1]
const CODE_LENGTH = 6
const RESEND_SECONDS = 30

// DEV: временно можно проматывать телефон + SMS-код и открывать модалку сразу на «Пройдите KYC».
// Флоу регистрации по номеру НЕ удалён — управляется этим флагом.
// true = сразу KYC (для отладки), false = обычный путь: телефон → код → успех → KYC.
const KYC_ONLY_DEV = false

// DEV-ЗАГЛУШКА OTP: SMS-провайдер лежит, отправка кода недоступна.
// При true «Получить код» НЕ дёргает SMS-шлюз (иначе 502), а сразу пускает на ввод
// кода и подставляет STUB_OTP_CODE. Сам код всё равно проверяется на бэкенде —
// бэкенд должен принимать этот номер как magic-code на время простоя провайдера
// и возвращать реальный JWT. Верни false, когда SMS починят.
const DEV_STUB_OTP = true
const STUB_OTP_CODE = '111111'

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
 * The same UI serves both даregister" and "login": the backend's verify-otp
 * creates the account on first use or signs into the existing one.
 *
 * Usage:
 *   const [mode, setMode] = useState(null) // null | 'register' | 'login'
 *   <Registration mode={mode} onClose={() => setMode(null)} onSuccess={(p) => ...} />
 */
export default function Registration({ mode, onClose, onSuccess }) {
  const isOpen = mode === 'register' || mode === 'login'

  // steps: 1 = phone, 2 = code, 3 = success, 4 = kyc prompt, 5 = kyc result
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('+996 ')
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [justResent, setJustResent] = useState(false)
  const [kycResult, setKycResult] = useState(null) // KycStatusDto после возврата из Didit

  const inputsRef = useRef([])

  const phoneDigits = digitsOnly(phone)
  const phoneValid = phoneDigits.length === 9

  // reset internal state whenever the modal is (re)opened or switches mode
  useEffect(() => {
    if (isOpen) {
      setStep(KYC_ONLY_DEV ? 4 : 1)
      setPhone('+996 ')
      setCode(Array(CODE_LENGTH).fill(''))
      setError('')
      setLoading(false)
      setResendIn(0)
      setJustResent(false)
      setKycResult(null)
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
    // DEV-заглушка: SMS не отправляем (шлюз лежит) — сразу к вводу кода с подставленным 111111.
    if (DEV_STUB_OTP) {
      setStep(2)
      setResendIn(RESEND_SECONDS)
      setCode(STUB_OTP_CODE.padEnd(CODE_LENGTH, '').slice(0, CODE_LENGTH).split(''))
      setTimeout(() => inputsRef.current[0]?.focus(), 50)
      return
    }
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
      } else if (err instanceof ApiError && err.status === 502) {
        setError('Сервис отправки SMS временно недоступен. Попробуйте позже')
      } else if (err instanceof ApiError && err.status >= 500) {
        setError('Не удалось отправить код. Попробуйте позже')
      } else if (err instanceof ApiError) {
        setError(`Ошибка ${err.status}: ${err.message}`)
      } else {
        setError('Нет связи с сервером. Проверьте подключение.')
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
    setError('')
    // DEV-заглушка: SMS не шлём, просто перезапускаем таймер и подставляем тестовый код.
    if (DEV_STUB_OTP) {
      setResendIn(RESEND_SECONDS)
      setCode(STUB_OTP_CODE.padEnd(CODE_LENGTH, '').slice(0, CODE_LENGTH).split(''))
      setJustResent(true)
      setTimeout(() => setJustResent(false), 2400)
      return
    }
    setLoading(true)
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

  // Шаг 4: открыть сессию KYC на бэкенде и запустить hosted-флоу Didit в модалке.
  // Бэкенд (POST /kyc/submit) сам ходит в Didit с секретами и отдаёт нам verificationUrl.
  const handleStartKyc = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const { verificationUrl } = await submitKyc()
      if (!verificationUrl) {
        setError('Не удалось получить ссылку верификации. Попробуйте позже')
        setLoading(false)
        return
      }
      // Открываем модалку Didit; промис резолвится, когда пользователь её закрыл.
      const result = await openDiditVerification(verificationUrl)

      // Юзер закрыл проверку не завершив — просто закрываем модалку, без экрана результата.
      if (result?.type === 'cancelled') {
        onClose?.()
        return
      }
      // Флоу упал (камера/сессия/сеть) — остаёмся на шаге 4, даём повторить.
      if (result?.type === 'failed') {
        setError('Проверку не удалось завершить. Попробуйте ещё раз')
        return
      }

      // Завершено. Результат SDK — лишь подсказка; итог берём из /kyc/me (его пишет webhook).
      const profile = await getKycStatus()
      setKycResult(profile || { status: KycStatus.Pending })
      setStep(5)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('Проверка личности уже начата или завершена')
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Нужна авторизация: сначала войдите по номеру телефона')
      } else if (err instanceof ApiError && err.status >= 500) {
        // 500 на /kyc/submit = бэкенд не смог открыть сессию у провайдера (Didit).
        // correlationId из ProblemDetails пригодится бэкенд-разрабу для поиска в логах.
        console.error('KYC submit failed:', err.status, err.problem)
        setError('Сервис верификации временно недоступен. Попробуйте позже')
      } else if (err instanceof ApiError) {
        setError(`Ошибка ${err.status}: ${err.message}`)
      } else {
        setError('Не удалось запустить проверку. Попробуйте позже')
      }
    } finally {
      setLoading(false)
    }
  }

  // Шаг 5: перечитать статус KYC (webhook мог прийти уже после закрытия модалки).
  const handleRefreshKyc = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const profile = await getKycStatus()
      setKycResult(profile || { status: KycStatus.Pending })
    } catch {
      setError('Не удалось обновить статус. Попробуйте ещё раз')
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
                  {DEV_STUB_OTP && (
                    <p className="reg-info">Тестовый режим: SMS отключены, код — {STUB_OTP_CODE}</p>
                  )}

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
                  {error && <div className="reg-error">{error}</div>}
                  <button
                    className="btn btn-primary reg-submit"
                    onClick={handleStartKyc}
                    disabled={loading}
                  >
                    <span>{loading ? 'Открываем проверку…' : 'Начать'}</span>
                    <span className="dot" />
                  </button>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5-kyc-result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="reg-success"
                >
                  <div className="reg-success-icon">
                    {kycResult?.status === KycStatus.Approved ? (
                      <svg viewBox="0 0 24 24" width="28" height="28">
                        <path d="M4 12.5L9.5 18L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    ) : kycResult?.status === KycStatus.Rejected ? (
                      <svg viewBox="0 0 24 24" width="28" height="28">
                        <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="28" height="28">
                        <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    )}
                  </div>

                  {kycResult?.status === KycStatus.Approved ? (
                    <>
                      <h2 className="reg-title display">KYC пройден</h2>
                      <p className="reg-sub">Личность подтверждена — можно оформлять покупку</p>
                    </>
                  ) : kycResult?.status === KycStatus.Rejected ? (
                    <>
                      <h2 className="reg-title display">Проверка отклонена</h2>
                      <p className="reg-sub">
                        {kycResult?.rejectionReason || 'К сожалению, проверка не пройдена. Обратитесь в поддержку'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="reg-title display">Проверка на рассмотрении</h2>
                      <p className="reg-sub">
                        Мы получили ваши данные. Результат появится после проверки — обновите статус
                        через минуту.
                      </p>
                    </>
                  )}

                  {error && <div className="reg-error">{error}</div>}

                  {kycResult?.status === KycStatus.Approved ? (
                    <button className="btn btn-primary reg-submit" onClick={onClose}>
                      <span>Готово</span>
                      <span className="dot" />
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary reg-submit"
                      onClick={handleRefreshKyc}
                      disabled={loading}
                    >
                      <span>{loading ? 'Обновляем…' : 'Проверить статус'}</span>
                      <span className="dot" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}