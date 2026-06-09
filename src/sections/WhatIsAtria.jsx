import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { whatIs as c, creds } from '../content.js'

export default function WhatIsAtria() {
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <Reveal as="div" className="creds">
          <span className="creds-lab">{creds.eyebrow}</span>
          <div className="creds-list">
            {creds.items.map((it) => (
              <span className="creds-pill" key={it}>
                {it}
              </span>
            ))}
          </div>
        </Reveal>

        <div className="def-grid">
          {c.cards.map((card, i) => (
            <Reveal as="div" className="def" key={card.n} delay={i * 0.12} y={24}>
              <span className="n" aria-hidden="true">
                {card.n}
              </span>
              <span className="chip">{card.value}</span>
              <h3>{card.label}</h3>
              <p>{card.text}</p>
            </Reveal>
          ))}
        </div>

        <p className="s-note">{c.microcopy}</p>
      </div>
    </section>
  )
}
