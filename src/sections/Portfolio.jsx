import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'
import { isDraft, listBuildings, listProperties } from '../lib/properties.js'
import PurchaseModal from '../components/PurchaseModal.jsx'
import { buildingHref, unitHref } from '../components/ObjectPage.jsx'

// Запасные градиенты для карточек без фото (бэкенд пока не отдаёт изображения).
const GRADIENTS = [
  'linear-gradient(165deg, #2f3b44 0%, #6d7d6f 55%, #d8b483 110%)',
  'linear-gradient(165deg, #3a3340 0%, #7d6f75 55%, #d8c4b4 110%)',
  'linear-gradient(165deg, #2f4440 0%, #6f7d78 55%, #b4d8c8 110%)',
  'linear-gradient(165deg, #44402f 0%, #7d786f 55%, #d8d0b4 110%)',
  'linear-gradient(165deg, #2f3644 0%, #6f747d 55%, #b4c0d8 110%)',
]

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0)

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

// Стадия в плитке каталога — короткой подписью. Объект на стадии проектирования не должен
// выглядеть в списке так же, как готовый и сданный.
const STAGE_SHORT = {
  land_only: 'Без строения',
  design: 'Проектирование',
  under_construction: 'Строительство',
  commissioned: 'Сдан',
}

/**
 * Строка характеристик помещения: «Квартира №12 · 3-комн. · 128,82 м² · 4 этаж».
 * У самостоятельного выпуска (не входит в здание) полей нет — вернём пустую строку.
 */
function unitLine(dto) {
  const area = Number(dto.totalAreaSqM)
  // У участка нет ни этажной площади, ни этажа: вместо них — гектары, иначе строка
  // схлопывается в один только тип.
  const land = Number(dto.landAreaHectares)
  return [
    UNIT_TYPES[dto.unitType] || null,
    // «Офис Г3 · №Г3» — номер уже в названии, второй раз его не повторяем.
    dto.unitNumber && !String(dto.name || '').includes(dto.unitNumber) ? `№${dto.unitNumber}` : null,
    dto.roomCount ? `${dto.roomCount}-комн.` : null,
    Number.isFinite(area) && area > 0 ? `${area.toLocaleString('ru-RU')} м²` : null,
    Number.isFinite(land) && land > 0 ? `${land.toLocaleString('ru-RU')} га` : null,
    dto.floorNumber != null ? `${dto.floorNumber} этаж` : null,
    STAGE_SHORT[dto.constructionStage] || null,
  ]
    .filter(Boolean)
    .join(' · ')
}

// Естественный порядок номеров: «Г2» раньше «Г10», «2» раньше «10». Без номера — в конец.
const unitCollator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
function byUnitNumber(a, b) {
  const x = a?.unitNumber ?? ''
  const y = b?.unitNumber ?? ''
  if (!x && !y) return 0
  if (!y) return -1
  if (!x) return 1
  return unitCollator.compare(String(x), String(y))
}

// Подпись на обложке карточки по виду картинки: рендер и план не должны выглядеть как фото.
const COVER_KIND_LABELS = { render: 'Визуализация', floor_plan: 'План', site_plan: 'Генплан' }

/** Метка статуса по ключу — берём из фильтров контента, чтобы не дублировать переводы. */
function statusLabel(filters, key) {
  return filters.find((f) => f.key === key)?.label || ''
}

/**
 * PropertyDto бэкенда → вью-модель карточки.
 * Поля, которых нет в API (площадь, заполняемость, арендаторы), просто опускаем —
 * карточка рендерит метрики и детали по факту наличия.
 */
function fromApi(dto, i, ui, filters) {
  const total = Number(dto.totalTokens) || 0
  const available = Number(dto.availableTokens ?? total) || 0
  const bought = total > 0 ? Math.round(((total - available) / total) * 100) : 0

  // Статус объекта по полю status бэкенда: coming_soon → скоро, completed → распродан,
  // open → открыт к покупке (но если токенов не осталось — тоже распродан).
  // draft на сайт не попадает (фильтруется до маппинга — виден только админам).
  let statusKey = 'open'
  if (dto.status === 'coming_soon') statusKey = 'soon'
  else if (dto.status === 'completed' || available <= 0) statusKey = 'sold'

  const currency = dto.currency || ''
  return {
    id: dto.id,
    name: dto.name || '—',
    loc: currency,
    type: dto.description || '',
    bg: GRADIENTS[i % GRADIENTS.length],
    metrics: [
      { k: ui.mTokenPrice, v: `${fmt(dto.tokenPrice)} ${currency}`.trim() },
      { k: ui.mTotalTokens, v: fmt(total) },
      { k: ui.mAvailable, v: fmt(available) },
      { k: ui.mBought, v: `${bought}%` },
    ],
    bought,
    statusKey,
    status: statusLabel(filters, statusKey),
    salesPaused: dto.salesPaused === true, // продажи временно приостановлены (кнопка «Купить» блокируется)
    img: dto.images?.[0]?.url || undefined, // первая фотка — обложка карточки (иначе градиент)
    imgKindLabel: COVER_KIND_LABELS[dto.images?.[0]?.kind] || '', // «Визуализация» / «План» на обложке
    unitLine: unitLine(dto), // «Квартира №12 · 3-комн. · 128,82 м²» — пусто у самостоятельных выпусков
    details: [],
    raw: dto, // полный объект для модалки покупки
  }
}

function PCard({ p, i, ui, onBuy }) {
  const [open, setOpen] = useState(false)
  const hasDetails = p.details && p.details.length > 0
  // «Скоро» ещё нельзя купить — показываем только описание и «Подробнее»,
  // без токенов/цен/прогресса и без кнопки «Купить».
  const isSoon = p.statusKey === 'soon'
  const canBuy = p.raw && p.statusKey !== 'sold' && !isSoon
  return (
    <Reveal as="article" className="pcard" delay={i * 0.08} y={28} amount={0.15}>
      <div
        className="pcard-img"
        style={p.img ? { backgroundImage: `url(${p.img})` } : { background: p.bg }}
      >
        <span className={`pcard-badge ${p.statusKey}`}>{p.status}</span>
        {p.img && p.imgKindLabel && <span className="img-render-tag">{p.imgKindLabel}</span>}
      </div>
      <div className="pcard-body">
        {!isSoon && p.loc && <span className="loc">{p.loc}</span>}
        <h3>
          {p.raw ? <a href={unitHref(p.id)} className="pcard-link">{p.name}</a> : p.name}
        </h3>
        {p.unitLine && <span className="punit">{p.unitLine}</span>}
        {p.type && <span className="ptype">{p.type}</span>}

        {!isSoon && (
          <>
            <div className="pcard-metrics">
              {p.metrics.map((m) => (
                <div key={m.k}>
                  <span className="mk">{m.k}</span>
                  <span className="mv">
                    {m.unit && typeof m.v === 'string' ? (
                      <>
                        <span className="u">{m.v[0]}</span>
                        {m.v.slice(1)}
                      </>
                    ) : (
                      m.v
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="pbar-head">
              <span>
                {ui.bought} {p.bought}%
              </span>
              <span>{p.statusKey === 'sold' ? ui.soldOut : ui.selling}</span>
            </div>
            <div className="pbar">
              <motion.i
                className={p.bought >= 100 ? 'full' : ''}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: p.bought / 100 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </>
        )}

        {hasDetails && (
          <>
            <button
              className="more"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.66rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--amber-deep, var(--amber))',
                marginTop: '0.3rem',
                textAlign: 'left',
              }}
            >
              {open ? ui.detailsHide : ui.detailsShow}
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  className="pcard-detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  {p.details.map((d) => (
                    <div key={d.k}>
                      <span className="dl">{d.k}</span>
                      {d.v}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {p.raw && (
          <div className="pcard-actions">
            {/* Своя страница у каждого помещения — ссылку можно переслать. */}
            <a className="btn btn-ghost" href={unitHref(p.id)}>
              <span>{ui.more || 'Подробнее'}</span>
            </a>
            {canBuy && (
              <button
                className="btn btn-primary"
                onClick={() => onBuy(p.raw)}
                disabled={p.salesPaused}
              >
                <span>{p.salesPaused ? 'Выпуск на паузе' : ui.buy || 'Купить'}</span>
                <span className="dot" />
              </button>
            )}
          </div>
        )}

        {canBuy && p.salesPaused && (
          <p className="pcard-paused">Выпуск временно приостановлен</p>
        )}
      </div>
    </Reveal>
  )
}

/** 1 помещение / 2 помещения / 5 помещений — счётчик в шапке здания. */
function unitsPlural(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} помещение`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} помещения`
  return `${n} помещений`
}

/**
 * Здание со списком помещений внутри: шапка с адресом и характеристиками, под ней —
 * сетка карточек квартир и гаражей. Каждое помещение продаётся отдельно, здание само
 * ничего не выпускает, поэтому у шапки нет ни цены, ни прогресса.
 */
function BuildingGroup({ group, ui, onBuy }) {
  const { building, cards } = group
  const meta = [
    building.city,
    building.address,
    building.yearBuilt ? `${building.yearBuilt} г.` : null,
    building.floors ? `${building.floors} эт.` : null,
    building.developer,
  ]
    .filter(Boolean)
    .join(' · ')

  const cover = building.images?.[0]?.url
  // Строящееся здание сфотографировать нельзя — на обложке рендер, и он обязан быть подписан,
  // иначе картинка читается как фото готового здания.
  const coverIsRender = building.images?.[0]?.kind === 'render'

  return (
    <Reveal as="div" className="pgroup" y={24} amount={0.1}>
      <div className="pgroup-head">
        {cover && (
          <div
            className="pgroup-cover"
            style={{ backgroundImage: `url(${cover})` }}
            role="img"
            aria-label={coverIsRender ? `${building.name} — визуализация` : building.name}
            title={coverIsRender ? 'Визуализация, не фотография' : undefined}
          />
        )}
        <div className="pgroup-info">
          <span className="pgroup-eyebrow">
            Здание
            {cover && coverIsRender && <span className="pgroup-render">Фото — визуализация</span>}
          </span>
          <h3 className="pgroup-name">
            <a href={buildingHref(building.id)} className="pgroup-link">{building.name}</a>
          </h3>
          {meta && <span className="pgroup-meta">{meta}</span>}
        </div>
        <div className="pgroup-side">
          <span className="pgroup-count">{unitsPlural(cards.length)}</span>
          <a className="pgroup-more" href={buildingHref(building.id)}>
            О здании
          </a>
        </div>
      </div>

      {building.description && <p className="pgroup-desc">{building.description}</p>}

      {/* Колонок ровно столько, сколько помещений (но не больше трёх): у здания с двумя
          квартирами карточки заполняют ряд целиком, а не жмутся в две трети с дыркой справа. */}
      <div className="pgrid pgroup-grid" data-cols={Math.min(cards.length, 3)}>
        {cards.map((p, i) => (
          <PCard key={p.id} p={p} i={i} ui={ui} onBuy={onBuy} />
        ))}
      </div>
    </Reveal>
  )
}

export default function Portfolio() {
  const c = useContent().portfolio
  const { ui, filters } = c

  const [filter, setFilter] = useState('all')
  // groups — здания с их помещениями, loose — самостоятельные выпуски вне здания.
  const [state, setState] = useState({ status: 'loading', groups: [], loose: [] })
  const [buying, setBuying] = useState(null) // выбранный объект для покупки

  useEffect(() => {
    let alive = true
    setState({ status: 'loading', groups: [], loose: [] })

    // Черновики видны только в админке; авторизованному админу бэкенд отдаёт их
    // вместе с опубликованными, поэтому фильтруем на своей стороне.
    const visible = (list) => (Array.isArray(list) ? list : []).filter((dto) => !isDraft(dto))

    Promise.all([
      // Здание уже приносит свои помещения, так что второй запрос нужен только ради
      // выпусков вне зданий — иначе юниты пришли бы дважды.
      listBuildings().catch(() => null),
      listProperties(),
    ])
      .then(([buildingList, propertyList]) => {
        if (!alive) return

        let seq = 0
        const groups = (Array.isArray(buildingList) ? buildingList : [])
          // Черновое здание не показываем целиком, даже если внутри есть опубликованные
          // помещения: пока здание в черновике, его на витрине быть не должно.
          .filter((building) => !isDraft(building))
          .map((building) => ({
            building,
            cards: visible(building.units)
              // API отдаёт помещения в порядке заведения; на витрине — по номеру (Г1, Г2, … Г10).
              .sort(byUnitNumber)
              .map((dto) => fromApi(dto, seq++, ui, filters)),
          }))
          // Бэкенд уже не отдаёт публике здание, внутри которого нечего показывать; этот фильтр
          // оставлен как страховка — и на случай, когда страницу открывает сотрудник, которому
          // черновики видны.
          .filter((g) => g.cards.length > 0)

        // Если /buildings недоступен (старый бэкенд), показываем всё плоским списком.
        const loose = visible(propertyList)
          .filter((dto) => (buildingList ? !dto.buildingId : true))
          .map((dto) => fromApi(dto, seq++, ui, filters))

        setState({ status: 'ready', groups, loose })
      })
      .catch(() => {
        if (!alive) return
        // Бэкенд недоступен — только сообщение об ошибке. Раньше здесь подставлялись три
        // выдуманных объекта со стоковыми фото, ценами и «Открыт к покупке»: на витрине это
        // выглядит как реальное предложение, которого нет.
        setState({ status: 'error', groups: [], loose: [] })
      })
    return () => {
      alive = false
    }
    // ui/filters/items берутся из одного объекта контента — пересобираем при смене языка
  }, [c, ui, filters])

  // Фильтр статуса применяется к помещениям; здание пропадает, когда под него ничего не подошло.
  const { groups, loose, total } = useMemo(() => {
    const keep = (p) => filter === 'all' || p.statusKey === filter
    const g = state.groups
      .map((group) => ({ ...group, cards: group.cards.filter(keep) }))
      .filter((group) => group.cards.length > 0)
    const l = state.loose.filter(keep)
    return {
      groups: g,
      loose: l,
      total: g.reduce((acc, group) => acc + group.cards.length, 0) + l.length,
    }
  }, [filter, state.groups, state.loose])

  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="chips">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`chip-btn ${filter === f.key ? 'on' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <span className="count">
            {total} {ui.count}
          </span>
        </div>

        {state.status === 'loading' && <p className="s-note">{ui.loading}</p>}
        {state.status === 'error' && <p className="reg-error">{ui.errorText}</p>}
        {state.status === 'ready' && total === 0 && <p className="s-note">{ui.empty}</p>}

        {/* Здание → его квартиры и гаражи. Каждое помещение продаётся отдельно. */}
        <div className="pgroups">
          {groups.map((group) => (
            <BuildingGroup
              key={group.building.id}
              group={group}
              ui={ui}
              onBuy={setBuying}
            />
          ))}
        </div>

        {/* Выпуски вне зданий — отдельной сеткой, как раньше. */}
        {loose.length > 0 && (
          <motion.div className="pgrid" layout>
            <AnimatePresence>
              {loose.map((p, i) => (
                <PCard key={p.id} p={p} i={i} ui={ui} onBuy={setBuying} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <PurchaseModal property={buying} onClose={() => setBuying(null)} />

        <Reveal as="div" className="port-strip">
          <p>
            <Accent text={c.strip} />
          </p>
          <span className="ps-note">{c.stripNote}</span>
        </Reveal>

        <p className="s-note">{c.microcopy}</p>
      </div>
    </section>
  )
}
