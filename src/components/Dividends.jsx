import Reveal, { RevealWords } from './Reveal.jsx'
import { dividends } from '../content.js'

export default function Dividends() {
  return (
    <section className="section surface-ink" id="dividends">
      <div className="container">
        <div className="shead">
          <div>
            <span className="eyebrow">{dividends.eyebrow}</span>
            <h2>
              <RevealWords text="Аренда работает," /> <span className="it">вы получаете</span>
            </h2>
          </div>
          <Reveal>
            <p className="lead">
              Вы не управляете зданием — это делает профессиональная управляющая компания. Ваша
              задача проста: держать токены и получать выплаты.
            </p>
          </Reveal>
        </div>

        <div className="flow">
          {dividends.flow.map((n, i) => (
            <Reveal as="article" className="flow-node" key={n.fn} delay={i * 0.1} y={22}>
              <span className="fn">{n.fn}</span>
              <h4>{n.h}</h4>
              <p>{n.p}</p>
              {i < dividends.flow.length - 1 && (
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
