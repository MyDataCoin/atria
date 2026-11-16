import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'

export default function HowItWorks() {
  const c = useContent().how
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="steps2">
          {c.steps.map((s, i) => (
            <Reveal as="div" className={`step2 ${i === 3 ? 'on' : ''}`} key={s.n} delay={i * 0.08} y={22}>
              <span className="num">{s.n}</span>
              <div>
                <span className="val">{s.value}</span>
                <h3>{s.label}</h3>
                <p>{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {(c.example || c.risk) && (
        <div className="hw-cards">
          {c.example && (
          <Reveal as="div" className="callout" style={{ boxShadow: 'none', background: 'var(--bone)' }}>
            <div>
              <span className="tag">{c.example.tag}</span>
              <div className="cv">{c.example.value}</div>
            </div>
            <p>{c.example.text}</p>
          </Reveal>
          )}
          {c.risk && (
          <Reveal as="div" className="risk-card" delay={0.1}>
            <span className="tag">{c.risk.tag}</span>
            <p>{c.risk.text}</p>
          </Reveal>
          )}
        </div>
        )}
      </div>
    </section>
  )
}
