import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createApplication } from '../lib/applications.js'
import {
  getKycStatus,
  isKycApproved,
  KycStatus,
  wasKycSubmitted,
  clearKycSubmitted,
} from '../lib/kyc.js'
import { ApiError, tokens } from '../lib/api.js'
import Registration from './Registration.jsx'

const EASE = [0.16, 1, 0.3, 1]
// Иллюстративная годовая доходность для оценки прироста дохода (как в калькуляторе).
const ANNUAL_RATE = 8

// Доля делится до одной сотой — тот же масштаб, что у TokenAmount.Scale на бэкенде и у
// decimals() токена. Мельче не существует, поэтому и вводить мельче нельзя.
const TOKEN_SCALE = 2
const SMALLEST_TOKEN = 1 / 10 ** TOKEN_SCALE

/** Количество токенов: показываем дробь только когда она есть, иначе целое без хвоста нулей. */
const fmtQty = (n) => {
  const value = Number(n) || 0
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: TOKEN_SCALE,
  }).format(value)
}

/** Сумма в валюте объекта: до копейки, потому что дробный токен стоит дробных денег. */
const fmtMoney = (n) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    Number(n) || 0,
  )

/**
 * Доля собственности в процентах. Трёх знаков хватало, пока минимум был целый токен; с сотыми
 * долями маленькая покупка показывалась бы как «+0,000%», поэтому у мелких значений знаков
 * больше — вплоть до первой значащей цифры.
 */
const fmtShare = (percent) => {
  const value = Number(percent) || 0
  if (value === 0) return '0'
  const digits = value >= 0.001 ? 3 : Math.min(8, Math.ceil(-Math.log10(value)) + 2)
  // Через Intl, а не toFixed: иначе доля печаталась бы через точку рядом с суммами через запятую.
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/**
 * Отсечение вниз до масштаба доли — ровно как TokenAmount.Floor на бэкенде.
 *
 * Домножение сначала приводится к целому с допуском: в двоичной арифметике `0.29 * 100` равно
 * 28.999999999999996, и голый Math.floor вернул бы 0.28. Из-за этого стрелка «вверх» в поле
 * количества намертво застревала на 0.28 — каждый клик давал 0.29, а мы срезали его обратно.
 * Значения, у которых дробь настоящая (33.333 → 33.33), отсекаются как и раньше: допуск на
 * девятом знаке их не задевает.
 */
const floorToScale = (n) => {
  const scaled = (Number(n) || 0) * 10 ** TOKEN_SCALE
  return Math.floor(Math.round(scaled * 1e6) / 1e6) / 10 ** TOKEN_SCALE
}

/** Деньги существуют до копейки: сумма заявки должна быть представима в валюте объекта. */
const roundMoney = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100

// Ползунок работает в позициях, а не в токенах: шкала логарифмическая.
// Выпуск — это 10 000 долей, а покупают доли вроде 0,28 или 1,63; на линейной дорожке они все
// прижаты к левому краю и ползунок выглядит замершим. По логарифму каждый порядок величины
// получает равный кусок дорожки, поэтому бегунок заметно двигается и на сотых, и на тысячах.
const SLIDER_POSITIONS = 1000

/**
 * Шаг, круглый для своего порядка: сотые у мелких значений, десятые у десятков, единицы у сотен.
 * Без этого логарифм давал бы значения вроде 1,6374829 — ползунок должен попадать в числа,
 * которые человек готов увидеть в заявке.
 */
const stepFor = (value) => {
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(Number(value) || SMALLEST_TOKEN)))
  return Math.max(SMALLEST_TOKEN, magnitude / 100)
}

/** Округление к ближайшему шагу своего порядка. */
const snapQty = (value) => {
  const step = stepFor(value)
  return Math.round(Math.round((value / step) * 1e6) / 1e6) * step
}

/** Позиция ползунка (0…SLIDER_POSITIONS) → количество токенов. */
const positionToQty = (position, max) => {
  const span = Math.log(max / SMALLEST_TOKEN)
  if (!(span > 0)) return max
  if (position <= 0) return SMALLEST_TOKEN
  if (position >= SLIDER_POSITIONS) return max
  return SMALLEST_TOKEN * Math.exp((span * position) / SLIDER_POSITIONS)
}

/** Количество токенов → позиция ползунка. Обратная к positionToQty. */
const qtyToPosition = (qty, max) => {
  const span = Math.log(max / SMALLEST_TOKEN)
  if (!(span > 0)) return SLIDER_POSITIONS
  const clamped = Math.min(max, Math.max(SMALLEST_TOKEN, Number(qty) || SMALLEST_TOKEN))
  return Math.round((SLIDER_POSITIONS * Math.log(clamped / SMALLEST_TOKEN)) / span)
}

/**
 * Модалка покупки доли в объекте. Открывается по кнопке «Купить» на карточке.
 * property — это PropertyDto бэкенда: { id, name, tokenPrice, availableTokens, totalTokens, currency }.
 */
export default function PurchaseModal({ property, onClose, onSuccess }) {
  const isOpen = Boolean(property)

  const price = Number(property?.tokenPrice) || 0
  const currency = property?.currency || ''
  const total = Number(property?.totalTokens) || 0
  const maxQty = Math.max(SMALLEST_TOKEN, Number(property?.availableTokens ?? total) || SMALLEST_TOKEN)


  const [qty, setQty] = useState(SMALLEST_TOKEN)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  // Гейт KYC: 'unknown' (ещё не знаем) | 'ok' | 'none' | 'review' | 'rejected'
  const [kyc, setKyc] = useState('unknown')
  const [kycReason, setKycReason] = useState('')
  const [showKyc, setShowKyc] = useState(false) // открыта ли модалка верификации
  const [kycChecking, setKycChecking] = useState(false) // идёт ручная перепроверка статуса

  // Сброс при каждом открытии нового объекта.
  useEffect(() => {
    if (isOpen) {
      setQty(floorToScale(Math.min(100, maxQty)) || SMALLEST_TOKEN)
      setStatus('idle')
      setError('')
      setShowKyc(false)
    }
  }, [isOpen, maxQty])

  // Разбор профиля в состояние гейта. Отметку «проверка сдана» снимаем, как только
  // бэкенд отдал финальное решение, — дальше она только мешала бы.
  const applyKyc = useCallback((p) => {
    if (!p) {
      clearKycSubmitted()
      setKyc('none')
    } else if (p.status === KycStatus.Approved) {
      clearKycSubmitted()
      setKyc('ok')
    } else if (p.status === KycStatus.Rejected) {
      clearKycSubmitted()
      setKycReason(p.rejectionReason || '')
      setKyc('rejected')
    } else {
      setKyc('review')
    }
  }, [])

  // Статус KYC тянем сразу при открытии (и после закрытия модалки верификации),
  // чтобы человек видел «нужно пройти KYC» до нажатия «Купить», а не после.
  useEffect(() => {
    if (!isOpen || showKyc) return
    if (!tokens.isAuthed) {
      setKyc('none')
      return
    }
    let alive = true
    getKycStatus()
      .then((p) => alive && applyKyc(p))
      .catch(() => alive && setKyc('unknown'))
    return () => {
      alive = false
    }
  }, [isOpen, showKyc, applyKyc])

  // Ручная перепроверка: решение по KYC приходит вебхуком, и человеку нужен способ
  // подтянуть его, не перезагружая страницу.
  const recheckKyc = async () => {
    if (kycChecking) return
    setKycChecking(true)
    try {
      applyKyc(await getKycStatus())
    } catch {
      setError('Не удалось проверить статус. Попробуйте ещё раз')
    } finally {
      setKycChecking(false)
    }
  }

  // Блокируем прокрутку страницы и закрываем по Escape.
  useEffect(() => {
    if (!isOpen || showKyc) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, showKyc, onClose])

  const calc = useMemo(() => {
    // Заявка уходит суммой, а количество долей бэкенд выводит из неё сам (floor до масштаба доли).
    // Поэтому сумму сперва приводим к копейкам — в валюте объекта меньше копейки ничего нет, —
    // и уже из неё считаем количество. Тогда показанное число ровно то, что зарегистрируется.
    const investment = roundMoney(qty * price)
    const effectiveQty = price > 0 ? floorToScale(investment / price) : 0
    const share = total > 0 ? (effectiveQty / total) * 100 : 0
    const monthly = (investment * ANNUAL_RATE) / 100 / 12
    return { investment, effectiveQty, share, monthly }
  }, [qty, price, total])

  if (!property) return null

  const kycBlocked = kyc === 'none' || kyc === 'review' || kyc === 'rejected'
  // Проверку человек уже сдал, ждём вебхук: предлагать «пройти KYC» тут бессмысленно —
  // бэкенд запрещает ресабмит, кнопка вела бы в тупик.
  const awaitingKyc = kyc === 'review' && wasKycSubmitted()
  // Раньше здесь стоял Math.floor до целого токена. Доли делимы, поэтому округляем не до штуки,
  // а до масштаба доли — и всегда вниз, чтобы заявка не просила больше, чем человек ввёл.
  const clampQty = (v) => {
    const parsed = floorToScale(Number(v))
    if (!Number.isFinite(parsed) || parsed <= 0) return SMALLEST_TOKEN
    return Math.min(maxQty, Math.max(SMALLEST_TOKEN, parsed))
  }
  const priceLabel = `${fmtMoney(price)} ${currency}`.trim()

  const handleBuy = async () => {
    if (!tokens.isAuthed) {
      setStatus('error')
      setError('Войдите в аккаунт, чтобы оформить покупку')
      return
    }
    setStatus('loading')
    setError('')
    try {
      // Гейт по KYC: заявку можно оформлять только с подтверждённой личностью.
      const profile = await getKycStatus()
      if (!isKycApproved(profile)) {
        setStatus('idle')
        applyKyc(profile)
        return
      }
      const app = await createApplication(property.id, calc.investment)
      setStatus('done')
      onSuccess?.(app)
    } catch (err) {
      setStatus('error')
      // 401 сюда доходит только когда обновить сессию не удалось (клиент уже стёр токены).
      // Общее «не удалось оформить заявку» тут врёт: с заявкой всё в порядке, кончился вход.
      if (err instanceof ApiError && err.status === 401) {
        setError('Сессия истекла — войдите заново по кнопке «Войти» вверху страницы')
      } else {
        setError(
          err instanceof ApiError
            ? err.problem?.detail || 'Не удалось оформить заявку. Попробуйте позже'
            : 'Сеть недоступна. Попробуйте ещё раз',
        )
      }
    }
  }

  return (
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
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            className="reg-card buy-card"
            data-lenis-prevent
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

            {status === 'done' ? (
              <div className="reg-success">
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
                <h2 className="reg-title display">Заявка создана</h2>
                <p className="reg-sub">
                  Заявка на {fmtQty(calc.effectiveQty)} токенов «{property.name}» отправлена. Мы свяжемся с вами для
                  подтверждения.
                </p>
                <button className="btn btn-primary reg-submit" onClick={onClose}>
                  <span>Готово</span>
                  <span className="dot" />
                </button>
              </div>
            ) : (
              <>
                <span className="eyebrow">Приобретение реального актива (RWA)</span>
                <h2 className="reg-title display buy-title">{property.name}</h2>
                <p className="buy-price-line">
                  Цена: <strong>{priceLabel}</strong>/токен
                </p>

                <hr className="buy-rule" />

                <div className="buy-qty-head">
                  <span className="buy-qty-label">Количество для покупки</span>
                  <span className="buy-qty-value">{fmtQty(calc.effectiveQty)} ATR-S</span>
                </div>

                <div className="buy-slider-row">
                  <input
                    type="range"
                    min={0}
                    max={SLIDER_POSITIONS}
                    step={1}
                    value={qtyToPosition(qty, maxQty)}
                    onChange={(e) =>
                      setQty(clampQty(snapQty(positionToQty(Number(e.target.value), maxQty))))
                    }
                    aria-label="Количество токенов"
                    aria-valuetext={`${fmtQty(qty)} токенов`}
                  />
                  <input
                    type="number"
                    className="buy-qty-input"
                    min={SMALLEST_TOKEN}
                    max={maxQty}
                    step={SMALLEST_TOKEN}
                    value={qty}
                    onChange={(e) => setQty(clampQty(e.target.value))}
                  />
                </div>

                <div className="buy-range-ends">
                  <span>
                    от {fmtQty(SMALLEST_TOKEN)} токена ({fmtMoney(SMALLEST_TOKEN * price)} {currency})
                  </span>
                  <span>
                    {fmtQty(maxQty)} токенов ({fmtMoney(maxQty * price)} {currency})
                  </span>
                </div>

                <div className="buy-summary">
                  <div className="buy-summary-row">
                    <span>Добавляемая доля:</span>
                    <strong>+{fmtShare(calc.share)}% собственности</strong>
                  </div>
                  <div className="buy-summary-row">
                    <span>Прирост дохода:</span>
                    <strong className="buy-income">
                      +{fmtMoney(calc.monthly)} {currency}/мес
                    </strong>
                  </div>
                  <hr className="buy-rule" />
                  <div className="buy-summary-row buy-total-row">
                    <span>Итого инвестиций в капитал:</span>
                    <strong className="buy-total">
                      {fmtMoney(calc.investment)} {currency}
                    </strong>
                  </div>
                </div>

                <div className="buy-compliance">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <strong>Соответствие регуляторным стандартам</strong>
                    <p>
                      Дробное владение обеспечено записями первичной ипотеки и оформляется по
                      законодательству Кыргызской Республики.
                    </p>
                  </div>
                </div>

                {kycBlocked && (
                  <div className="buy-kyc-gate">
                    <strong>{awaitingKyc ? 'Проверка на рассмотрении' : 'Для сделки нужно пройти KYC'}</strong>
                    <p>
                      {awaitingKyc
                        ? 'Вы уже прошли проверку — ждём решение провайдера, обычно это несколько минут. Проходить её заново не нужно.'
                        : kyc === 'review'
                          ? 'Проверка личности не завершена. Закончите её — покупка станет доступна сразу после подтверждения.'
                          : kyc === 'rejected'
                            ? kycReason ||
                              'Проверка личности отклонена. Пройдите KYC заново или обратитесь в поддержку.'
                            : 'Покупка токенов доступна только верифицированным инвесторам. Пройдите KYC — это займёт пару минут.'}
                    </p>
                  </div>
                )}

                {error && <div className="reg-error">{error}</div>}

                <div className="buy-actions">
                  <button type="button" className="btn btn-ghost" onClick={onClose}>
                    <span>Отмена</span>
                  </button>
                  {awaitingKyc ? (
                    // Проходить заново нечего — можно только подтянуть решение вебхука.
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={recheckKyc}
                      disabled={kycChecking}
                    >
                      <span>{kycChecking ? 'Проверяем…' : 'Проверить статус'}</span>
                      <span className="dot" />
                    </button>
                  ) : kycBlocked ? (
                    <button type="button" className="btn btn-primary" onClick={() => setShowKyc(true)}>
                      <span>Пройти KYC</span>
                      <span className="dot" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBuy}
                      disabled={status === 'loading'}
                    >
                      <span>{status === 'loading' ? 'Оформляем…' : 'Купить'}</span>
                      <span className="dot" />
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* Верификация переиспользует общий флоу регистрации: для авторизованного
              пользователя Registration открывается сразу на шаге «Пройдите KYC». */}
          <Registration mode={showKyc ? 'login' : null} onClose={() => setShowKyc(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
