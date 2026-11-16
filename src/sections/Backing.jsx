import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'

/** Чем обеспечен токен: помещение, обременение в Кадастре, ограниченный выпуск, реестр владельцев. */
export default function Backing() {
  const c = useContent().backing
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="backing-grid">
          {c.cards.map((card, i) => (
            <Reveal as="div" className="backing-item" key={card.label} delay={i * 0.06} y={16}>
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
