import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0))

// Берём первое непустое значение из возможных имён поля (бэкенд может ещё не отдавать часть).
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

/**
 * Модалка «Подробнее» для объекта: галерея фото, описание, параметры выпуска,
 * характеристики (появляются по мере того, как бэкенд добавляет их в PropertyDto),
 * документы. Если выпуск на паузе — показываем пометку.
 */
export default function DetailsModal({ property, onClose }) {
  const isOpen = Boolean(property)
  const [imgIndex, setImgIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false) // открыт ли лайтбокс с увеличенным фото

  useEffect(() => {
    if (isOpen) {
      setImgIndex(0)
      setZoomed(false)
    }
  }, [isOpen, property?.id])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (zoomed) setZoomed(false)
      else onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose, zoomed])

  const data = useMemo(() => {
    if (!property) return null
    const images = (Array.isArray(property.images) ? property.images : []).filter((x) => x?.url)
    const documents = (Array.isArray(property.documents) ? property.documents : []).filter(
      (x) => x?.url,
    )
    const currency = property.currency || ''
    const total = Number(property.totalTokens) || 0
    const available = Number(property.availableTokens ?? total) || 0
    return {
      images,
      documents,
      currency,
      tokenPrice: Number(property.tokenPrice) || 0,
      total,
      available,
      description: pick(property, ['description']),
      // Характеристики — если бэкенд их отдаёт (в текущем PropertyDto их пока нет).
      type: pick(property, ['propertyType', 'type']),
      city: pick(property, ['city']),
      year: pick(property, ['yearBuilt', 'buildYear', 'year']),
      developer: pick(property, ['developer', 'builder', 'contractor']),
      floors: pick(property, ['floors', 'floor', 'floorCount', 'storeys']),
      address: pick(property, ['address', 'fullAddress', 'location']),
      salesPaused: property.salesPaused === true,
    }
  }, [property])

  if (!property || !data) return null

  const mapQuery = data.address || `${property.name}, Кыргызстан`
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    mapQuery,
  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`

  const rows = [
    ['Тип недвижимости', data.type],
    ['Город', data.city],
    ['Год постройки', data.year],
    ['Застройщик', data.developer],
    ['Этажность', data.floors],
    ['Адрес', data.address],
  ].filter(([, v]) => v != null)

  const imgCount = data.images.length
  const goImg = (dir) => setImgIndex((i) => (i + dir + imgCount) % imgCount)

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
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            className="reg-card details-card"
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

            <span className="eyebrow">Об объекте</span>
            <h2 className="reg-title display details-title">{property.name}</h2>

            {/* Галерея фото объекта: стрелки, счётчик, клик — увеличить. */}
            {imgCount > 0 && (
              <div className="details-gallery">
                <div className="details-gallery-frame">
                  <button
                    type="button"
                    className="details-gallery-main"
                    style={{ backgroundImage: `url(${data.images[imgIndex]?.url})` }}
                    onClick={() => setZoomed(true)}
                    aria-label="Увеличить фото"
                  >
                    <span className="details-zoom-hint" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M11 8v6M8 11h6M10 17a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                      </svg>
                    </span>
                  </button>
                  {imgCount > 1 && (
                    <>
                      <button
                        type="button"
                        className="details-nav prev"
                        onClick={() => goImg(-1)}
                        aria-label="Предыдущее фото"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      </button>
                      <button
                        type="button"
                        className="details-nav next"
                        onClick={() => goImg(1)}
                        aria-label="Следующее фото"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      </button>
                      <span className="details-counter">{imgIndex + 1} / {imgCount}</span>
                    </>
                  )}
                </div>
                {imgCount > 1 && (
                  <div className="details-thumbs">
                    {data.images.map((img, i) => (
                      <button
                        key={img.id || i}
                        type="button"
                        className={`details-thumb ${i === imgIndex ? 'on' : ''}`}
                        style={{ backgroundImage: `url(${img.url})` }}
                        onClick={() => setImgIndex(i)}
                        aria-label={`Фото ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {data.salesPaused && (
              <div className="details-paused">Выпуск временно приостановлен</div>
            )}

            {data.description && (
              <div className="details-section">
                <h4>Описание</h4>
                <p>{data.description}</p>
              </div>
            )}

            {rows.length > 0 && (
              <div className="details-rows">
                {rows.map(([label, value]) => (
                  <div className="details-row" key={label}>
                    <span className="details-row-label">{label}</span>
                    <span className="details-row-value">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {data.documents.length > 0 && (
              <div className="details-section">
                <h4>Документы</h4>
                <div className="details-docs">
                  {data.documents.map((doc, i) => (
                    <a
                      key={doc.id || i}
                      className="details-doc"
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="details-doc-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4zM14 3v4h4M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                      <span className="details-doc-name">{doc.fileName || `Документ ${i + 1}`}</span>
                      <span className="details-doc-open" aria-hidden="true">Открыть ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Карта по адресу — в самом низу. */}
            <div className="details-section">
              <h4>На карте</h4>
              <div className="details-map">
                <iframe
                  title={`Карта: ${property.name}`}
                  src={mapSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <button className="btn btn-ghost details-close-btn" onClick={onClose}>
              <span>Закрыть</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Лайтбокс: увеличенное фото поверх модалки. Клик по фону — закрыть. */}
    {zoomed && imgCount > 0 && (
      <div
        className="details-lightbox"
        data-lenis-prevent
        onClick={() => setZoomed(false)}
        role="dialog"
        aria-modal="true"
      >
        <button className="details-lightbox-close" aria-label="Закрыть" onClick={() => setZoomed(false)}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {imgCount > 1 && (
          <>
            <button
              className="details-nav prev lb"
              aria-label="Предыдущее фото"
              onClick={(e) => { e.stopPropagation(); goImg(-1) }}
            >
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
            </button>
            <button
              className="details-nav next lb"
              aria-label="Следующее фото"
              onClick={(e) => { e.stopPropagation(); goImg(1) }}
            >
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
            </button>
            <span className="details-counter lb">{imgIndex + 1} / {imgCount}</span>
          </>
        )}
        <img src={data.images[imgIndex]?.url} alt={property.name} onClick={(e) => e.stopPropagation()} />
      </div>
    )}
    </>
  )
}
