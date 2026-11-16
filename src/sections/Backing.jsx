import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'

/**
 * «Чем обеспечен токен»: почему токен ATRIA — это доля реального помещения, а не монета.
 * Четыре опоры: помещение, обременение в Кадастре, ограниченный выпуск, реестр владельцев.
 */
export default function Backing() {
  const c = useContent().backing
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="def-grid cols-2">
          {c.cards.map((card, i) => (
            <Reveal as="div" className="def" key={card.n} delay={(i % 2) * 0.1} y={24}>
              <span className="n" aria-hidden="true">
                {card.n}
              </span>
              <span className="chip">{card.value}</span>
              <h3>{card.label}</h3>
              <p>{card.text}</p>
            </Reveal>
          ))}
        </div>

        {c.note && <p className="s-note">{c.note}</p>}
      </div>
    </section>
  )
}
