import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Reveal, { RevealWords } from './Reveal.jsx'
import AtriaMark from './AtriaMark.jsx'
import { token } from '../content.js'

export default function Tokenization() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const coinRotate = useTransform(scrollYProgress, [0, 1], [-25, 25])
  const coinY = useTransform(scrollYProgress, [0, 1], [60, -60])
  const ringRotate = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <section className="section surface-bone" ref={ref}>
      <div className="container split">
        <div className="token-visual">
          <motion.div className="token-ring" style={{ rotate: ringRotate }} />
          <motion.div className="token-coin" style={{ rotate: coinRotate, y: coinY }}>
            <AtriaMark className="mk" stroke={3} />
          </motion.div>
        </div>

        <div>
          <span className="eyebrow">{token.eyebrow}</span>
          <h2 className="display" style={{ fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', marginTop: '1rem' }}>
            <RevealWords text="Доля недвижимости," />{' '}
            <span className="it" style={{ fontStyle: 'italic', color: 'var(--amber-deep)' }}>
              <RevealWords text="а не обещание" delay={0.2} />
            </span>
          </h2>

          <ul className="feature-list">
            {token.features.map((f, i) => (
              <Reveal as="li" key={f.fi} delay={i * 0.07} y={18}>
                <span className="fi">{f.fi}</span>
                <div>
                  <h4>{f.h}</h4>
                  <p>{f.p}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
