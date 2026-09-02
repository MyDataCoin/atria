import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isDraft } from '../lib/properties.js'
import { safeUrl } from '../lib/safeUrl.js'

const EASE = [0.16, 1, 0.3, 1]

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0))

// Площадь показываем как есть, с двумя знаками: 128,82 м².
const area = (n) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n) || 0,
  )

/** Тип помещения с бэкенда → человеческая подпись. */
const UNIT_TYPES = {
  apartment: 'Квартира',
  garage: 'Гараж',
  parking_space: 'Парковочное место',
  commercial: 'Коммерческое помещение',
  storage: 'Кладовая',
  land_plot: 'Земельный участок',
  other: 'Помещение',
}

// Вид изображения. Рендер, показанный без подписи, — это картинка несуществующего здания,
// показанная человеку, который решает, вкладывать ли в него деньги. Поэтому подпись едет
// вместе с изображением, а не подразумевается.
const IMAGE_KIND_LABELS = {
  render: 'Визуализация',
  floor_plan: 'Планировка',
  site_plan: 'Генплан',
}

// Периодичность выплат. Показывается только по выпуску, который уже платит.
const PAYOUT_FREQUENCIES = {
  monthly: 'Ежемесячно',
  quarterly: 'Ежеквартально',
  annually: 'Раз в год',
  none: 'Без выплат',
}

// Стадия строительства. Участок на стадии проектирования без этой подписи читается как
// готовое здание — это раскрытие, а не оформление карточки.
const CONSTRUCTION_STAGES = {
  land_only: 'Земельный участок без строения',
  design: 'Проектирование',
  under_construction: 'Строительство',
  commissioned: 'Введён в эксплуатацию',
}

// Дата ввода — только месяц и год: точный день до получения проектной документации никто
// не назовёт, а показанный день читается как обязательство.
const plannedDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

// Берём первое непустое значение из возможных имён поля (бэкенд может ещё не отдавать часть).
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

/**
 * Модалка «Подробнее»: галерея фото, описание, характеристики, документы, карта.
 *
 * Работает и для помещения (PropertyDto), и для здания (BuildingDto) — у них общий
 * набор полей, а различаются они тем, что у здания нет выпуска и планировки, зато
 * есть список помещений внутри. Режим задаётся пропом `isBuilding`.
 */
export default function DetailsModal({ property, onClose, isBuilding = false, onOpenUnit }) {
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
    // Схему проверяем ЗДЕСЬ, а не при отрисовке: и картинка, и документ приходят из API, а
    // `javascript:`/`data:` в href React пропустит как есть. Ссылка с неподдерживаемой схемой
    // просто не показывается — лучше отсутствующий документ, чем исполняемая ссылка.
    const images = (Array.isArray(property.images) ? property.images : [])
      .map((x) => ({ ...x, url: safeUrl(x?.url) }))
      .filter((x) => x.url)
    const documents = (Array.isArray(property.documents) ? property.documents : [])
      .map((x) => ({ ...x, url: safeUrl(x?.url) }))
      .filter((x) => x.url)
    const currency = property.currency || ''
    const total = Number(property.totalTokens) || 0
    const available = Number(property.availableTokens ?? total) || 0
    return {
      images,
      documents,
      currency,
      tokenPrice: Number(property.tokenPrice) || 0,
      // Параметры выпуска, по которым человек и принимает решение.
      minPurchaseTokens: Number(property.minPurchaseTokens) > 0 ? Number(property.minPurchaseTokens) : null,
      minPurchaseAmount: Number(property.minPurchaseAmount) > 0 ? Number(property.minPurchaseAmount) : null,
      offeredArea: Number(property.offeredAreaSqM) > 0 ? Number(property.offeredAreaSqM) : null,
      areaPerToken: Number(property.areaPerTokenSqM) > 0 ? Number(property.areaPerTokenSqM) : null,
      // Периодичность — только если выпуск действительно платит. distributesYet считает бэкенд:
      // до ввода в эксплуатацию он false, какую бы частоту ни завели в админке.
      payoutFrequency: property.distributesYet === true
        ? PAYOUT_FREQUENCIES[property.payoutFrequency] || null
        : null,
      total,
      available,
      description: pick(property, ['description']),
      // Блок о районе. Отдельно от описания: одно про объект, другое про то, что вокруг него.
      locationDescription: pick(property, ['locationDescription']),
      // Характеристики объекта из PropertyDto.
      type: pick(property, ['propertyType', 'type']),
      city: pick(property, ['city']),
      year: pick(property, ['yearBuilt', 'buildYear', 'year']),
      developer: pick(property, ['developer', 'builder', 'contractor']),
      floors: pick(property, ['floors', 'floor', 'floorCount', 'storeys']),
      address: pick(property, ['address', 'fullAddress', 'location']),
      salesPaused: property.salesPaused === true,
      // Помещение внутри здания: чем оно является и из чего состоит.
      unitType: UNIT_TYPES[property.unitType] || null,
      unitNumber: pick(property, ['unitNumber']),
      floorNumber: property.floorNumber ?? null,
      roomCount: property.roomCount ?? null,
      totalArea: Number(property.totalAreaSqM) > 0 ? Number(property.totalAreaSqM) : null,
      usableArea: Number(property.usableAreaSqM) > 0 ? Number(property.usableAreaSqM) : null,
      // Описательные характеристики карточки. Заполняется тем, что есть: пустые поля просто
      // не выводятся строкой, а не показываются прочерком.
      documentedUse: pick(property, ['documentedUse']),
      buildingClass: pick(property, ['buildingClass']),
      wallMaterial: pick(property, ['wallMaterial']),
      heating: pick(property, ['heating']),
      elevator: pick(property, ['elevator']),
      security: pick(property, ['security']),
      parking: pick(property, ['parking']),
      // Участок и стройка.
      landArea: Number(property.landAreaHectares) > 0 ? Number(property.landAreaHectares) : null,
      landPlotCode: pick(property, ['landPlotCode']),
      cadastralNumber: pick(property, ['cadastralNumber']),
      constructionStage: CONSTRUCTION_STAGES[property.constructionStage] || null,
      plannedCompletion: plannedDate(property.plannedCompletionDate),
      readinessPercent: property.readinessPercent ?? null,
      // Проверка Кадастра. null — не проверяли, и на витрине это молчание, а не «свободен»:
      // утверждать чистоту объекта, которую никто не проверял, нельзя.
      isFreeOfEncumbrances:
        property.isFreeOfEncumbrances === true || property.isFreeOfEncumbrances === false
          ? property.isFreeOfEncumbrances
          : null,
      rooms: (Array.isArray(property.rooms) ? property.rooms : []).filter((r) => r?.name),
      // Только для здания: помещения внутри. Черновики на витрину не пускаем — админу
      // бэкенд отдаёт их наравне с опубликованными.
      units: (Array.isArray(property.units) ? property.units : []).filter(
        (u) => u?.id && !isDraft(u),
      ),
    }
  }, [property])

  if (!property || !data) return null

  const mapQuery = data.address || `${property.name}, Кыргызстан`
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    mapQuery,
  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`

  const rows = (
    isBuilding
      ? [
          // У здания своих «этажа» и «комнатности» нет — только про сам дом.
          ['Тип недвижимости', data.type],
          ['Город', data.city],
          ['Год постройки', data.year],
          ['Застройщик', data.developer],
          ['Этажность', data.floors],
          ['Адрес', data.address],
          ['Помещений в продаже', data.units.length || null],
        ]
      : [
          // Сначала само помещение — ради него человек и открыл карточку.
          ['Тип помещения', data.unitType],
          ['Номер', data.unitNumber],
          // У участка нет ни этажа, ни комнатности, ни этажной площади — вместо них гектары
          // и кадастровые коды. Строки со значением null всё равно отфильтруются ниже,
          // поэтому разделять список на два не нужно.
          ['Этаж', data.floorNumber],
          ['Комнатность', data.roomCount ? `${data.roomCount}-комнатная` : null],
          ['Общая площадь', data.totalArea ? `${area(data.totalArea)} м²` : null],
          ['Полезная площадь', data.usableArea ? `${area(data.usableArea)} м²` : null],
          ['Выпускается', data.offeredArea ? `${area(data.offeredArea)} м²` : null],
          ['Площадь участка', data.landArea ? `${data.landArea} га` : null],
          // Вид недвижимости — самого помещения, а не здания: гараж в жилом доме коммерческий.
          ['Тип недвижимости', data.type],
          ['Назначение по документам', data.documentedUse],
          // Стадия идёт до характеристик здания: «Проектирование» человек должен увидеть
          // раньше, чем класс объекта и отопление, которых у участка ещё нет.
          // Условия входа — то, ради чего человек и открыл карточку. Доля неделима, поэтому
          // минимум задан в долях, а сумма показана как производная от них.
          ['Минимальный вход', data.minPurchaseTokens
            ? `${data.minPurchaseTokens.toLocaleString('ru-RU')} дол.`
              + (data.minPurchaseAmount ? ` (${fmt(data.minPurchaseAmount)} ${data.currency})` : '')
            : null],
          // Эквивалент, а не единица выпуска: покупается доля выпуска, а не квадратный метр.
          ['Эквивалент доли', data.areaPerToken
            ? `≈ ${data.areaPerToken.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} м²`
            : null],
          ['Периодичность выплат', data.payoutFrequency],
          ['Стадия', data.constructionStage],
          ['Плановый ввод', data.plannedCompletion],
          ['Готовность', data.readinessPercent != null ? `${data.readinessPercent}%` : null],
          // Дальше — про здание, в котором оно находится.
          ['Город', data.city],
          ['Год постройки', data.year],
          ['Застройщик', data.developer],
          ['Этажность здания', data.floors],
          ['Класс объекта', data.buildingClass],
          ['Материал', data.wallMaterial],
          ['Отопление', data.heating],
          ['Лифт', data.elevator],
          ['Охрана', data.security],
          ['Парковка', data.parking],
          ['Адрес', data.address],
          ['Идент. код участка', data.landPlotCode],
          ['Кадастровый номер', data.cadastralNumber],
          // Только результат состоявшейся проверки: «не проверяли» строкой не показываем,
          // иначе молчание Кадастра читается как подтверждённая чистота объекта.
          [
            'Обременения',
            data.isFreeOfEncumbrances === true
              ? 'Не зарегистрированы'
              : data.isFreeOfEncumbrances === false
                ? 'Есть обременение'
                : null,
          ],
        ]
  ).filter(([, v]) => v != null)

  // Сумма комнат может не сходиться с общей площадью — так бывает в планах, поэтому
  // показываем обе цифры и ничего не «поправляем».
  const roomsSum = data.rooms.reduce((acc, r) => acc + (Number(r.areaSqM) || 0), 0)

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

            <span className="eyebrow">{isBuilding ? 'О здании' : 'Об объекте'}</span>
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
                    {/* Подпись вида — на самом изображении: она должна быть видна ровно тогда,
                        когда человек смотрит на картинку, а не в отдельном списке. */}
                    {IMAGE_KIND_LABELS[data.images[imgIndex]?.kind] && (
                      <span className="details-kind">
                        {IMAGE_KIND_LABELS[data.images[imgIndex].kind]}
                      </span>
                    )}
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

            {/* Район и окружение — своя секция. Для участка на стадии проектирования это
                большая часть того, что вообще можно рассказать об объекте. */}
            {data.locationDescription && (
              <div className="details-section">
                <h4>Район и окружение</h4>
                <p>{data.locationDescription}</p>
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

            {isBuilding && data.units.length > 0 && (
              <div className="details-section">
                <h4>Помещения в здании</h4>
                <div className="details-units">
                  {data.units.map((u) => {
                    const a = Number(u.totalAreaSqM)
                    const line = [
                      UNIT_TYPES[u.unitType] || null,
                      u.unitNumber ? `№${u.unitNumber}` : null,
                      u.roomCount ? `${u.roomCount}-комн.` : null,
                      Number.isFinite(a) && a > 0 ? `${area(a)} м²` : null,
                      u.floorNumber != null ? `${u.floorNumber} этаж` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <button
                        type="button"
                        className="details-unit"
                        key={u.id}
                        onClick={() => onOpenUnit?.(u)}
                      >
                        <span className="details-unit-name">{u.name}</span>
                        {line && <span className="details-unit-line">{line}</span>}
                        <span className="details-unit-go" aria-hidden="true">→</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {data.rooms.length > 0 && (
              <div className="details-section">
                <h4>Планировка</h4>
                <div className="details-rooms">
                  {data.rooms.map((room, i) => (
                    <div className="details-room" key={room.id || i}>
                      <span className="details-room-name">{room.name}</span>
                      <span className="details-room-area">{area(room.areaSqM)} м²</span>
                    </div>
                  ))}
                  <div className="details-room total">
                    <span className="details-room-name">Итого</span>
                    <span className="details-room-area">
                      {area(roomsSum)} м²
                      {data.totalArea && Math.abs(data.totalArea - roomsSum) > 0.01
                        ? ` из ${area(data.totalArea)} м²`
                        : ''}
                    </span>
                  </div>
                </div>
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
