import { useEffect, useState } from 'react'
import DetailsModal from './DetailsModal.jsx'
import PurchaseModal from './PurchaseModal.jsx'
import { getBuilding, getProperty, isDraft } from '../lib/properties.js'

// Адреса страниц объектов. Роутера на сайте нет — страница выбирается по адресу в App.jsx,
// а nginx на любой путь отдаёт index.html.
export const buildingHref = (id) => `/building/${id}`
export const unitHref = (id) => `/unit/${id}`

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ROUTE = new RegExp(`^/(building|unit)/(${UUID})$`, 'i')

/** { kind: 'building' | 'unit', id } для адреса страницы объекта, иначе null. */
export function objectRouteFor(pathname) {
  const m = pathname.replace(/\/+$/, '').match(ROUTE)
  return m ? { kind: m[1].toLowerCase(), id: m[2].toLowerCase() } : null
}

/**
 * Отдельная страница здания или помещения — со своим адресом, чтобы ссылку можно было
 * переслать. Содержимое то же, что в «Подробнее»: DetailsModal в режиме страницы.
 */
export default function ObjectPage({ route }) {
  const isBuilding = route.kind === 'building'
  const [state, setState] = useState({ status: 'loading', item: null, building: null })
  const [buying, setBuying] = useState(null)

  useEffect(() => {
    let alive = true
    setState({ status: 'loading', item: null, building: null })
    const load = isBuilding ? getBuilding(route.id) : getProperty(route.id)
    load
      .then(async (item) => {
        // Черновик — не для витрины, даже если страницу открыл сотрудник со своим токеном.
        if (!item || isDraft(item)) throw new Error('not found')
        let building = null
        if (!isBuilding && item.buildingId) {
          building = await getBuilding(item.buildingId).catch(() => null)
          if (building && isDraft(building)) building = null
        }
        if (alive) setState({ status: 'ready', item, building })
      })
      .catch(() => alive && setState({ status: 'missing', item: null, building: null }))
    return () => {
      alive = false
    }
  }, [route.id, isBuilding])

  const item = state.item
  useEffect(() => {
    if (item?.name) document.title = `${item.name} — ATRIA`
  }, [item?.name])

  const total = Number(item?.totalTokens) || 0
  const available = Number(item?.availableTokens ?? total) || 0
  const canBuy =
    !isBuilding && item && item.status === 'open' && available > 0 && item.salesPaused !== true

  const actions = canBuy ? (
    <div className="objpage-actions">
      <button className="btn btn-primary" onClick={() => setBuying(item)}>
        <span>Купить</span>
      </button>
    </div>
  ) : null

  return (
    <main className="objpage">
      <div className="container objpage-inner">
        <nav className="objpage-crumbs">
          <a href="/#portfolio" className="tlink">← Все объекты</a>
          {state.building && (
            <a href={buildingHref(state.building.id)} className="tlink">
              {state.building.name}
            </a>
          )}
        </nav>

        {state.status === 'loading' && <p className="s-note">Загружаем объект…</p>}
        {state.status === 'missing' && (
          <div className="objpage-missing">
            <h1 className="display">Объект не найден</h1>
            <p className="s-note">
              Возможно, он ещё не опубликован или снят с витрины. Посмотрите другие объекты
              на главной.
            </p>
          </div>
        )}
        {state.status === 'ready' && (
          <DetailsModal
            asPage
            property={item}
            isBuilding={isBuilding}
            actions={actions}
            onOpenUnit={(u) => window.location.assign(unitHref(u.id))}
          />
        )}
      </div>
      <PurchaseModal property={buying} onClose={() => setBuying(null)} />
    </main>
  )
}
