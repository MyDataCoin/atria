import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'

function RiskText({ text, mark }) {
  const idx = mark ? text.indexOf(mark) : -1
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      {text.slice(0, idx)}
      <span className="imp">{mark}</span>
      {text.slice(idx + mark.length)}
    </>
  )
}

export default function Risks() {
  const c = useContent().risks
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
                <RiskText text={it.text} mark={c.impLabel} />
              </p>
            </Reveal>
          ))}
        </div>

        {c.disclaimer && (
          <Reveal as="div" className="risk-final">
            <span className="sq" aria-hidden="true" />
            <span className="big">{c.disclaimer}</span>
          </Reveal>
        )}
        {c.microcopy && <p className="s-note">{c.microcopy}</p>}
      </div>
    </section>
  )
}
