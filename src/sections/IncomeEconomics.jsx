import { motion } from 'framer-motion'
import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { income as c } from '../content.js'

const HEIGHTS = [220, 158, 120, 80]

export default function IncomeEconomics() {
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="wf">
          {c.flow.map((f, i) => (
            <div className="wf-col" key={f.k}>
              <span className="k">{f.k}</span>
              <motion.div
                className={`wf-bar ${f.tone}`}
                style={{ height: HEIGHTS[i] }}
                initial={{ scaleY: 0, opacity: 0 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.12 * i }}
              />
              <span className="v">{f.v}</span>
              <span className="wf-note">{f.note}</span>
            </div>
          ))}
        </div>

        <Reveal as="div" className="disclaimer-strip">
          <span className="d-tag">Пример · не гарантия</span>
          <span className="d-txt">{c.microcopy}</span>
        </Reveal>

        <div className="inc-cards">
          {c.cards.map((card, i) => (
            <Reveal as="div" className="inc-card" key={card.label} delay={i * 0.08} y={22}>
              {card.tagLeft && <span className="tl">{card.tagLeft}</span>}
              {card.value && !card.tagLeft && <span className="chip">{card.value}</span>}
              <h4>{card.label}</h4>
              <p>{card.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
