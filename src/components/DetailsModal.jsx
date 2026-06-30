import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]
const TBD = 'Уточняется'

// Берём первое непустое значение из возможных имён поля (бэкенд ещё может их не отдавать).
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

/**
 * Модалка «Подробнее» для объекта. Показывает карту, описание, застройщика,
 * этажность и полный адрес. Поля, которых нет в PropertyDto, отображаются как «Уточняется».
 */
export default function DetailsModal({ property, onClose }) {
  const isOpen = Boolean(property)

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

  const data = useMemo(() => {
    if (!property) return null
    const address = pick(property, ['address', 'fullAddress', 'location'])
    const developer = pick(property, ['developer', 'builder', 'constructor', 'contractor'])
    const floors = pick(property, ['floors', 'floor', 'floorCount', 'storeys'])
    const description = pick(property, ['description'])
    // Запрос для карты: адрес, иначе название + страна.
    const mapQuery = address || `${property.name}, Кыргызстан`
    return { address, developer, floors, description, mapQuery }
  }, [property])

  if (!property || !data) return null

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    data.mapQuery,
  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`

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
            className="reg-card details-card"
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

            <span className="eyebrow">Об объекте</span>
            <h2 className="reg-title display details-title">{property.name}</h2>

            <div className="details-map">
              <iframe
                title={`Карта: ${property.name}`}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="details-section">
              <h4>Подробное описание</h4>
              <p>{data.description || TBD}</p>
            </div>

            <div className="details-rows">
              <div className="details-row">
                <span className="details-row-label">Застройщик</span>
                <span className="details-row-value">{data.developer || TBD}</span>
              </div>
              <div className="details-row">
                <span className="details-row-label">Этажность</span>
                <span className="details-row-value">{data.floors || TBD}</span>
              </div>
              <div className="details-row">
                <span className="details-row-label">Полный адрес</span>
                <span className="details-row-value">{data.address || TBD}</span>
              </div>
            </div>

            <button className="btn btn-ghost details-close-btn" onClick={onClose}>
              <span>Закрыть</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
