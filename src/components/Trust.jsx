import Reveal, { RevealWords } from './Reveal.jsx'
import { trust } from '../content.js'

export default function Trust() {
  return (
    <section className="section surface-bone">
      <div className="container">
        <div className="shead">
          <div>
            <span className="eyebrow">{trust.eyebrow}</span>
            <h2>
              <RevealWords text="Закон, структура" />
              <br />
              <span className="it">и прозрачность</span>
            </h2>
          </div>
          <Reveal>
            <p className="lead">
              ATRIA — это не обещание доходности, а юридически выстроенная инфраструктура владения
              реальными активами в Кыргызстане.
            </p>
          </Reveal>
        </div>

        <div className="trust-grid">
          {trust.cards.map((c, i) => (
            <Reveal as="article" className="trust-card" key={c.h} delay={i * 0.08} y={24}>
              <span className="tn">{c.tn}</span>
              <h4>{c.h}</h4>
              <p>{c.p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
