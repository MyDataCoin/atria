import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'
import { listProperties } from '../lib/properties.js'
import PurchaseModal from '../components/PurchaseModal.jsx'
import DetailsModal from '../components/DetailsModal.jsx'

// Запасные градиенты для карточек без фото (бэкенд пока не отдаёт изображения).
const GRADIENTS = [
  'linear-gradient(165deg, #2f3b44 0%, #6d7d6f 55%, #d8b483 110%)',
  'linear-gradient(165deg, #3a3340 0%, #7d6f75 55%, #d8c4b4 110%)',
  'linear-gradient(165deg, #2f4440 0%, #6f7d78 55%, #b4d8c8 110%)',
  'linear-gradient(165deg, #44402f 0%, #7d786f 55%, #d8d0b4 110%)',
  'linear-gradient(165deg, #2f3644 0%, #6f747d 55%, #b4c0d8 110%)',
]

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Number(n) || 0)

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
    details: [],
    raw: dto, // полный объект для модалки покупки
  }
}

/** Статический элемент контента → та же вью-модель (используется как fallback при ошибке). */
function fromStatic(p, ui) {
  return {
    id: p.name,
    name: p.name,
    loc: p.district,
    type: p.type,
    img: p.img,
    bg: p.bg,
    metrics: [
      { k: ui.mPrice, v: p.price, unit: true },
      { k: ui.mArea, v: p.area },
      { k: ui.mOcc, v: `${p.occupancy}%` },
      { k: ui.mBought, v: `${p.bought}%` },
    ],
    bought: p.bought,
    statusKey: p.statusKey,
    status: p.status,
    details: [
      { k: ui.tenants, v: p.tenants },
      { k: ui.spv, v: p.spv },
    ],
  }
}

function PCard({ p, i, ui, onBuy, onDetails }) {
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
      </div>
      <div className="pcard-body">
        {!isSoon && p.loc && <span className="loc">{p.loc}</span>}
        <h3>{p.name}</h3>
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
            <button className="btn btn-ghost" onClick={() => onDetails(p.raw)}>
              <span>{ui.more || 'Подробнее'}</span>
            </button>
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

export default function Portfolio() {
  const c = useContent().portfolio
  const { ui, filters } = c

  const [filter, setFilter] = useState('all')
  const [state, setState] = useState({ status: 'loading', cards: [] })
  const [buying, setBuying] = useState(null) // выбранный объект для покупки
  const [details, setDetails] = useState(null) // выбранный объект для «Подробнее»

  useEffect(() => {
    let alive = true
    setState({ status: 'loading', cards: [] })
    listProperties()
      .then((data) => {
        if (!alive) return
        // draft — черновики, видны только в админке; на сайт не показываем.
        const list = (Array.isArray(data) ? data : []).filter((dto) => dto.status !== 'draft')
        setState({
          status: 'ready',
          cards: list.map((dto, i) => fromApi(dto, i, ui, filters)),
        })
      })
      .catch(() => {
        if (!alive) return
        // Бэкенд недоступен — показываем статические объекты как запасной вариант.
        setState({
          status: 'error',
          cards: (c.items || []).map((p) => fromStatic(p, ui)),
        })
      })
    return () => {
      alive = false
    }
    // ui/filters/items берутся из одного объекта контента — пересобираем при смене языка
  }, [c, ui, filters])

  const items = useMemo(
    () => (filter === 'all' ? state.cards : state.cards.filter((p) => p.statusKey === filter)),
    [filter, state.cards],
  )

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
            {items.length} {ui.count}
          </span>
        </div>

        {state.status === 'loading' && <p className="s-note">{ui.loading}</p>}
        {state.status === 'error' && <p className="reg-error">{ui.errorText}</p>}
        {state.status === 'ready' && items.length === 0 && (
          <p className="s-note">{ui.empty}</p>
        )}

        <motion.div className="pgrid" layout>
          <AnimatePresence>
            {items.map((p, i) => (
              <PCard key={p.id} p={p} i={i} ui={ui} onBuy={setBuying} onDetails={setDetails} />
            ))}
          </AnimatePresence>
        </motion.div>

        <PurchaseModal property={buying} onClose={() => setBuying(null)} />
        <DetailsModal property={details} onClose={() => setDetails(null)} />

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
