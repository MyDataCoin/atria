import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createApplication } from '../lib/applications.js'
import { ApiError, tokens } from '../lib/api.js'

const EASE = [0.16, 1, 0.3, 1]
// Иллюстративная годовая доходность для оценки прироста дохода (как в калькуляторе).
const ANNUAL_RATE = 8

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0))

/**
 * Модалка покупки доли в объекте. Открывается по кнопке «Купить» на карточке.
 * property — это PropertyDto бэкенда: { id, name, tokenPrice, availableTokens, totalTokens, currency }.
 */
export default function PurchaseModal({ property, onClose, onSuccess }) {
  const isOpen = Boolean(property)

  const price = Number(property?.tokenPrice) || 0
  const currency = property?.currency || ''
  const total = Number(property?.totalTokens) || 0
  const maxQty = Math.max(1, Number(property?.availableTokens ?? total) || 1)

  const [qty, setQty] = useState(1)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')

  // Сброс при каждом открытии нового объекта.
  useEffect(() => {
    if (isOpen) {
      setQty(Math.min(100, maxQty))
      setStatus('idle')
      setError('')
    }
  }, [isOpen, maxQty])

  // Блокируем прокрутку страницы и закрываем по Escape.
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  const calc = useMemo(() => {
    const investment = qty * price
    const share = total > 0 ? (qty / total) * 100 : 0
    const monthly = (investment * ANNUAL_RATE) / 100 / 12
    return { investment, share, monthly }
  }, [qty, price, total])

  if (!property) return null

  const clampQty = (v) => Math.min(maxQty, Math.max(1, Math.floor(Number(v) || 1)))
  const priceLabel = `${fmt(price)} ${currency}`.trim()

  const handleBuy = async () => {
    if (!tokens.isAuthed) {
      setStatus('error')
      setError('Войдите в аккаунт, чтобы оформить покупку')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const app = await createApplication(property.id, calc.investment)
      setStatus('done')
      onSuccess?.(app)
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof ApiError
          ? err.problem?.detail || 'Не удалось оформить заявку. Попробуйте позже'
          : 'Сеть недоступна. Попробуйте ещё раз',
      )
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
            className="reg-card buy-card"
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
                  Заявка на {fmt(qty)} токенов «{property.name}» отправлена. Мы свяжемся с вами для
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
                  <span className="buy-qty-value">{fmt(qty)} ATR-S</span>
                </div>

                <div className="buy-slider-row">
                  <input
                    type="range"
                    min={1}
                    max={maxQty}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(clampQty(e.target.value))}
                    aria-label="Количество токенов"
                  />
                  <input
                    type="number"
                    className="buy-qty-input"
                    min={1}
                    max={maxQty}
                    value={qty}
                    onChange={(e) => setQty(clampQty(e.target.value))}
                  />
                </div>

                <div className="buy-range-ends">
                  <span>
                    1 токен ({priceLabel})
                  </span>
                  <span>
                    {fmt(maxQty)} токенов ({fmt(maxQty * price)} {currency})
                  </span>
                </div>

                <div className="buy-summary">
                  <div className="buy-summary-row">
                    <span>Добавляемая доля:</span>
                    <strong>+{calc.share.toFixed(3)}% собственности</strong>
                  </div>
                  <div className="buy-summary-row">
                    <span>Прирост дохода:</span>
                    <strong className="buy-income">
                      +{fmt(calc.monthly)} {currency}/мес
                    </strong>
                  </div>
                  <hr className="buy-rule" />
                  <div className="buy-summary-row buy-total-row">
                    <span>Итого инвестиций в капитал:</span>
                    <strong className="buy-total">
                      {fmt(calc.investment)} {currency}
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

                {error && <div className="reg-error">{error}</div>}

                <div className="buy-actions">
                  <button type="button" className="btn btn-ghost" onClick={onClose}>
                    <span>Отмена</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBuy}
                    disabled={status === 'loading'}
                  >
                    <span>{status === 'loading' ? 'Оформляем…' : 'Купить'}</span>
                    <span className="dot" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
