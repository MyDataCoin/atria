import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { risks as c } from '../content.js'

const MARK = 'Что важно понимать:'

function RiskText({ text }) {
  const idx = text.indexOf(MARK)
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      {text.slice(0, idx)}
      <span className="imp">{MARK}</span>
      {text.slice(idx + MARK.length)}
    </>
  )
}

export default function Risks() {
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="risk-rows">
          {c.items.map((it, i) => (
            <Reveal as="div" className="risk-row" key={it.n} delay={i * 0.07} y={24}>
              <div className="rl">
                <span className="ri">{it.n}</span>
                <h3>{it.label}</h3>
                {it.value && <div className="rv">{it.value}</div>}
              </div>
              <p className="rt">
                <RiskText text={it.text} />
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" className="risk-final">
          <span className="sq" aria-hidden="true" />
          <span className="big">{c.disclaimer}</span>
        </Reveal>
        <p className="s-note">{c.microcopy}</p>
      </div>
    </section>
  )
}
