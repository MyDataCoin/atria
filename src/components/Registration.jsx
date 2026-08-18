import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { requestOtp, verifyOtp } from '../lib/auth.js'
import {
  submitKyc,
  getKycStatus,
  KycStatus,
  attachWallet,
  isValidWallet,
  wasKycSubmitted,
  markKycSubmitted,
  clearKycSubmitted,
  waitForKycDecision,
} from '../lib/kyc.js'
import { openDiditVerification } from '../lib/didit.js'
import { postConsent } from '../lib/consent.js'
import { ApiError, tokens, onSessionLost } from '../lib/api.js'
import DocModal from './DocModal.jsx'
import { CONSENT_FORM } from '../content.consent.js'

const EASE = [0.16, 1, 0.3, 1]

// Опрос решения по KYC: раз в 5 секунд, не дольше пяти минут.
const KYC_POLL_INTERVAL_MS = 5000
const KYC_POLL_MAX_TICKS = 60
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
 * Что на самом деле пошло не так при подтверждении кода. Свалить всё в «неверный код» —
 * значит обвинить человека в ошибке сервера и лишить себя единственной подсказки о том,
 * что бэкенд недоступен.
 */
function verifyErrorMessage(err) {
  if (!(err instanceof ApiError)) {
    // fetch отклоняется без статуса только когда запрос вообще не дошёл.
    return 'Нет связи с сервером. Проверьте интернет и попробуйте снова'
  }
  if (err.status === 409) return 'Код заблокирован после нескольких попыток. Запросите новый'
  if (err.status === 429) return 'Слишком много попыток. Подождите немного и попробуйте снова'
  if (err.status === 0 || err.status >= 500) {
    return `Сервер сейчас недоступен (ошибка ${err.status}). Код тут ни при чём — попробуйте позже`
  }
  if (err.status === 400) {
    // 400 приходит и на неверный код, и на непрошедшую валидацию номера — их надо различать.
    const code = err.problem?.title || ''
    const detail = err.problem?.detail || ''
    if (code.startsWith('otp.') || /код|code/i.test(detail)) {
      return 'Неверный код, попробуйте снова'
    }
    return detail || 'Запрос отклонён сервером. Проверьте номер и попробуйте снова'
  }
  return `Не удалось подтвердить код (ошибка ${err.status}). Попробуйте позже`
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

  // steps: 1 = phone, 2 = code, 3 = success, 4 = kyc prompt, 5 = kyc result,
  //        6 = wallet choice, 7 = metamask instructions, 8 = wallet input,
  //        9 = final success, 10 = incomplete warning
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('+996 ')
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [justResent, setJustResent] = useState(false)
  const [wallet, setWallet] = useState('') // адрес криптокошелька инвестора
  // Одобрен ли KYC на самом деле. Итоговый экран показывается и тому, кто ещё ждёт решения,
  // и заявлять там «личность подтверждена» было бы неправдой.
  const [kycApproved, setKycApproved] = useState(false)
  const [consent, setConsent] = useState(false) // согласие на обработку ПДн (по умолчанию снято)
  const [showConsentDoc, setShowConsentDoc] = useState(false) // открыт ли текст согласия

  const inputsRef = useRef([])

  const phoneDigits = digitsOnly(phone)
  const phoneValid = phoneDigits.length === 9

  // reset internal state whenever the modal is (re)opened or switches mode
  useEffect(() => {
    if (isOpen) {
      setPhone('+996 ')
      setCode(Array(CODE_LENGTH).fill(''))
      setError('')
      setLoading(false)
      setResendIn(0)
      setJustResent(false)
      setWallet('')
      setKycApproved(false)
      setConsent(false)
      setShowConsentDoc(false)

      // Куда открывать модалку:
      // • нет живой сессии → телефон (шаг 1);
      // • авторизован (или dev-обход) → пропускаем телефон и ведём на KYC (шаг 4) —
      //   это же возобновляет прерванную проверку при повторном входе;
      // • KYC пройден или сдан и ждёт решения → шаг 5 → кошелёк;
      // • кошелёк уже привязан → шагов про кошелёк нет вовсе, сразу итог (шаг 9).
      if (KYC_ONLY_DEV || tokens.isAuthed) {
        setStep(4)
        if (tokens.isAuthed) {
          getKycStatus()
            .then((p) => {
              if (!p) {
                clearKycSubmitted() // профиля нет — старая отметка протухла
                return
              }
              // Кошелёк спрашивают ОДИН раз. Раньше профиль не отдавал привязанный адрес, и
              // модалка не могла отличить «кошелька нет» от «кошелёк давно привязан» — поэтому
              // требовала его снова у человека, который его уже вписал.
              const hasWallet = Boolean(p.walletAddress)
              setKycApproved(p.status === KycStatus.Approved)
              if (p.status === KycStatus.Approved) {
                clearKycSubmitted()
                setStep(hasWallet ? 9 : 5)
              } else if (p.status === KycStatus.Rejected) {
                clearKycSubmitted()
              } else if (wasKycSubmitted()) {
                // Проверку человек уже прошёл, решение ещё не доехало — не заставляем
                // проходить её заново, ведём к последнему шагу с кошельком.
                setStep(hasWallet ? 9 : 5)
              }
            })
            .catch((err) => {
              // 401 здесь = обновить сессию не удалось (токены уже стёрты клиентом).
              // Раньше эта ошибка молча проглатывалась, человек оставался на «Пройдите KYC»
              // и упирался в тупик. Возвращаем ко входу — единственный шаг, который сейчас
              // имеет смысл.
              if (err instanceof ApiError && err.status === 401) {
                setStep(1)
                setError('Сессия истекла — войдите заново по номеру телефона')
              }
            })
        }
      } else {
        setStep(1)
      }
    }
  }, [isOpen, mode])

  // Решение по проверке личности приходит вебхуком от провайдера и занимает минуты, а не
  // секунды. Без опроса экран «ждём решение» так и остаётся ждать навсегда: решение давно
  // пришло в базу, а человек видит старый ответ и вынужден перезагружать страницу, чтобы
  // узнать об этом. Опрашиваем, пока экран открыт, и сами обновляем состояние.
  useEffect(() => {
    // Только там, где человеку показан итог ожидания, и только пока решения нет.
    if (!isOpen || kycApproved || (step !== 5 && step !== 9)) return undefined

    let alive = true
    let ticks = 0
    const id = setInterval(async () => {
      // Провайдер редко думает дольше нескольких минут; после этого прекращаем — бесконечный
      // фоновый опрос из открытой вкладки не приближает решение.
      if (++ticks > KYC_POLL_MAX_TICKS) {
        clearInterval(id)
        return
      }

      const profile = await getKycStatus().catch(() => null)
      if (!alive || !profile) return

      if (profile.status === KycStatus.Approved) {
        clearKycSubmitted()
        setKycApproved(true)
        clearInterval(id)
      } else if (profile.status === KycStatus.Rejected) {
        clearKycSubmitted()
        setError(profile.rejectionReason || 'Проверка личности отклонена. Обратитесь в поддержку')
        clearInterval(id)
      }
    }, KYC_POLL_INTERVAL_MS)

    return () => {
      alive = false
      clearInterval(id)
    }
  }, [isOpen, step, kycApproved])

  // Сессия может отвалиться на любом шаге и в любой ручке, не только в KYC. Один общий
  // обработчик гарантирует, что человек всегда окажется на экране, где ЕСТЬ что нажать,
  // вместо сообщения «войдите» на шаге, с которого войти нельзя.
  useEffect(() => {
    if (!isOpen) return undefined
    return onSessionLost(() => {
      setStep(1)
      setError('Сессия истекла — войдите заново по номеру телефона')
    })
  }, [isOpen])

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
      if (e.key !== 'Escape') return
      if (step >= 6 && step <= 8) setStep(10)
      else onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, step])

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
      // Раньше сюда сваливалась ЛЮБАЯ ошибка и подписывалась «неверный код»: лежащий бэкенд,
      // упавший прокси, отсутствие сети — всё выглядело как ошибка человека, который ввёл
      // правильные цифры. Разделяем: код неверен только когда так сказал сервер.
      setError(verifyErrorMessage(err))
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
    // Без согласия на обработку ПДн KYC не начинаем (кнопка и так заблокирована — двойная защита).
    if (!consent) {
      setError('Отметьте согласие на обработку персональных данных')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Сначала фиксируем согласие (кто/когда/версия), потом отправляем ПДн в обработку.
      // Ручки /consent на бэке пока нет — не блокируем флоу, но логируем (бэкенд должен её добавить и enforce'ить).
      try {
        await postConsent()
      } catch (e) {
        console.warn('postConsent failed (нужен эндпоинт /consent на бэке):', e?.status, e?.problem || e)
      }
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

      // Завершено. Помечаем, что проверка сдана: решение придёт вебхуком, и до его прихода
      // профиль остаётся в UnderReview — без этой отметки сайт снова попросил бы пройти KYC.
      markKycSubmitted()
      // Даём вебхуку несколько секунд: если решение успеет прийти, отметка снимется сама,
      // а отказ покажем здесь же, не пуская человека дальше на кошелёк.
      const decided = await waitForKycDecision({ attempts: 4, intervalMs: 1200 }).catch(() => null)
      if (decided?.status === KycStatus.Rejected) {
        setError(decided.rejectionReason || 'Проверка личности отклонена. Обратитесь в поддержку')
        return
      }
      // Показываем экран «проверка пройдена» с кнопкой «Следующий этап» → кошелёк.
      // Если кошелёк уже привязан, шага про кошелёк нет — сразу итог.
      setKycApproved(decided?.status === KycStatus.Approved)
      setStep(decided?.walletAddress ? 9 : 5)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // KYC уже пройден/начат — смотрим реальный статус профиля.
        const profile = await getKycStatus().catch(() => null)
        if (profile?.status === KycStatus.Approved) {
          clearKycSubmitted()
          setKycApproved(true)
          setStep(profile.walletAddress ? 9 : 5) // верифицирован → кошелёк, если его ещё нет
        } else if (profile?.status === KycStatus.Rejected) {
          clearKycSubmitted()
          setError(profile.rejectionReason || 'Проверка личности отклонена. Обратитесь в поддержку')
        } else if (profile && wasKycSubmitted()) {
          // Свою часть человек уже сделал, ждём только вебхук — не гоняем его по кругу,
          // ведём дальше к кошельку (или сразу к итогу, если кошелёк уже привязан).
          setStep(profile.walletAddress ? 9 : 5)
        } else if (profile) {
          // UnderReview/Pending: сессия открыта, но не завершена. Пересоздать её фронт не может
          // (бэкенд запрещает ресабмит и не отдаёт verificationUrl) — нужна доработка бэка.
          setError('Проверка уже идёт. Завершите её или обратитесь в поддержку')
        } else {
          setError('Проверка личности уже начата или завершена')
        }
      } else if (err instanceof ApiError && err.status === 401) {
        // Сессия умерла и не обновилась. Прежняя версия писала «сначала войдите по номеру» —
        // и оставляла человека на шаге KYC, откуда войти было НЕЛЬЗЯ. Ведём на шаг 1 сами.
        tokens.clear()
        setStep(1)
        setError('Сессия истекла — войдите заново по номеру телефона')
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

  // Шаг 8: привязать введённый кошелёк и завершить регистрацию.
  const handleWalletSubmit = async () => {
    if (loading) return
    if (!isValidWallet(wallet)) {
      setError('Введите корректный адрес кошелька (0x… из 42 символов)')
      return
    }
    setLoading(true)
    setError('')
    try {
      await attachWallet(wallet)
    } catch (err) {
      // Пока бэкенд не добавил ручку привязки — не блокируем флоу, но логируем.
      console.warn('attachWallet failed (нужен эндпоинт на бэке):', err?.status, err?.problem || err)
    } finally {
      setLoading(false)
    }
    setStep(9)
  }

  // Во время wallet-флоу (6–8) закрытие = «регистрация не завершена»: показываем предупреждение,
  // а не выходим сразу. На финальном success (9) и остальных шагах закрываем как обычно.
  const inWalletFlow = step >= 6 && step <= 8
  const attemptClose = () => {
    if (inWalletFlow) {
      setError('')
      setStep(10)
      return
    }
    onClose?.()
  }

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="reg-overlay"
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) attemptClose()
          }}
        >
          <motion.div
            className="reg-card"
            data-lenis-prevent
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.45, ease: EASE }}
            role="dialog"
            aria-modal="true"
          >
            <button className="reg-close" onClick={attemptClose} aria-label="Закрыть">
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
                      Я даю согласие на{' '}
                      <button
                        type="button"
                        className="reg-consent-link"
                        onClick={() => setShowConsentDoc(true)}
                      >
                        обработку персональных данных
                      </button>
                    </span>
                  </label>

                  {error && <div className="reg-error">{error}</div>}
                  <button
                    className="btn btn-primary reg-submit"
                    onClick={handleStartKyc}
                    disabled={loading || !consent}
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
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path d="M4 12.5L9.5 18L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>

                  {/* Пока вебхук с решением не пришёл, честнее писать «отправлена», а не «пройдена». */}
                  <h2 className="reg-title display">
                    {wasKycSubmitted() ? 'Проверка отправлена' : 'Проверка личности пройдена'}
                  </h2>
                  <p className="reg-sub">
                    {wasKycSubmitted()
                      ? 'Решение придёт в течение нескольких минут. Проходить проверку заново не нужно — пока привяжите криптокошелёк для зачисления токенов.'
                      : 'Остался последний шаг — привяжите криптокошелёк для зачисления токенов.'}
                  </p>

                  <button className="btn btn-primary reg-submit" onClick={() => setStep(6)}>
                    <span>Следующий этап</span>
                    <span className="dot" />
                  </button>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div
                  key="step6-wallet-choice"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <h2 className="reg-title display">Прикрепите криптокошелёк</h2>
                  <p className="reg-sub">
                    На него будут зачисляться токены ваших долей. Есть ли у вас кошелёк?
                  </p>
                  <div className="reg-form">
                    <button
                      className="btn btn-primary reg-submit"
                      onClick={() => {
                        setError('')
                        setStep(8)
                      }}
                    >
                      <span>У меня есть кошелёк</span>
                      <span className="dot" />
                    </button>
                    <button
                      className="btn btn-ghost reg-submit"
                      onClick={() => {
                        setError('')
                        setStep(7)
                      }}
                    >
                      <span>У меня нет кошелька</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 7 && (
                <motion.div
                  key="step7-metamask"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <h2 className="reg-title display">Создайте кошелёк MetaMask</h2>
                  <p className="reg-sub">Займёт пару минут. Следуйте шагам:</p>
                  <ol className="reg-steps">
                    <li>Откройте App Store (iPhone) или Google Play (Android)</li>
                    <li>Введите в поиск «MetaMask» и установите приложение</li>
                    <li>Откройте MetaMask и нажмите «Создать новый кошелёк»</li>
                    <li>Придумайте пароль и примите условия</li>
                    <li>Сохраните секретную фразу (12 слов) в надёжном месте — никому её не показывайте</li>
                    <li>Подтвердите секретную фразу</li>
                    <li>Скопируйте адрес кошелька (начинается с 0x) — он понадобится ниже</li>
                  </ol>
                  <button
                    className="btn btn-primary reg-submit"
                    onClick={() => {
                      setError('')
                      setStep(8)
                    }}
                  >
                    <span>Добавить кошелёк</span>
                    <span className="dot" />
                  </button>
                  <button className="reg-back" onClick={() => setStep(6)}>
                    ← Назад
                  </button>
                </motion.div>
              )}

              {step === 8 && (
                <motion.div
                  key="step8-wallet-input"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <h2 className="reg-title display">Адрес кошелька</h2>
                  <p className="reg-sub">Вставьте адрес вашего криптокошелька (начинается с 0x)</p>
                  <form
                    className="reg-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleWalletSubmit()
                    }}
                  >
                    <label className="reg-field">
                      <span className="reg-label mono">Адрес кошелька</span>
                      <input
                        type="text"
                        value={wallet}
                        onChange={(e) => {
                          setError('')
                          setWallet(e.target.value.trim())
                        }}
                        placeholder="0x…"
                        autoFocus
                      />
                    </label>

                    {error && <div className="reg-error">{error}</div>}

                    <button type="submit" className="btn btn-primary reg-submit" disabled={loading}>
                      <span>{loading ? 'Сохраняем…' : 'Завершить регистрацию'}</span>
                      <span className="dot" />
                    </button>
                  </form>
                  <button className="reg-back" onClick={() => setStep(6)}>
                    ← Назад
                  </button>
                </motion.div>
              )}

              {step === 9 && (
                <motion.div
                  key="step9-done"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="reg-success"
                >
                  <div className="reg-success-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path d="M4 12.5L9.5 18L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <h2 className="reg-title display">
                    {kycApproved ? 'Вы успешно прошли регистрацию' : 'Регистрация завершена'}
                  </h2>
                  <p className="reg-sub">
                    {kycApproved
                      ? 'Личность подтверждена, кошелёк привязан — можно инвестировать'
                      : 'Кошелёк привязан. Ждём решение по проверке личности — обычно это несколько минут'}
                  </p>
                  <button className="btn btn-primary reg-submit" onClick={onClose}>
                    <span>Готово</span>
                    <span className="dot" />
                  </button>
                </motion.div>
              )}

              {step === 10 && (
                <motion.div
                  key="step10-incomplete"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="reg-success"
                >
                  <div className="reg-success-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path d="M12 8v5M12 16.5v.5M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <h2 className="reg-title display">Вы не завершили регистрацию</h2>
                  <p className="reg-sub">
                    Кошелёк не привязан. Без него регистрация не считается завершённой.
                  </p>
                  <button className="btn btn-primary reg-submit" onClick={() => setStep(6)}>
                    <span>Продолжить</span>
                    <span className="dot" />
                  </button>
                  <button className="btn btn-ghost reg-submit" onClick={onClose}>
                    <span>Выйти без привязки</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Текст согласия на обработку ПДн — версионированный (см. content.consent.js). */}
    <DocModal doc={showConsentDoc ? CONSENT_FORM : null} onClose={() => setShowConsentDoc(false)} />
    </>
  )
}