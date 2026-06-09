import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { RevealWords } from './Reveal.jsx'
import { cta } from '../content.js'

export default function Cta() {
  const ref = useRef(null)
  const [sent, setSent] = useState(false)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const glowY = useTransform(scrollYProgress, [0, 1], [120, -120])
  const glowScale = useTransform(scrollYProgress, [0, 1], [0.8, 1.25])

  return (
    <section className="section surface-ink cta" id="cta" ref={ref}>
      <motion.div className="cta-glow" style={{ y: glowY, scale: glowScale }} />
      <div className="container cta-inner">
        <span className="eyebrow center">{cta.eyebrow}</span>
        <h2>
          <RevealWords text="Станьте совладельцем" />{' '}
          <span className="it">недвижимости</span>{' '}
          <RevealWords text="Кыргызстана" delay={0.3} />
        </h2>

        {sent ? (
          <motion.p
            className="lead"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: 'var(--amber-bright)' }}
          >
            Спасибо! Мы напишем вам при открытии раннего доступа.
          </motion.p>
        ) : (
          <form
            className="cta-form"
            onSubmit={(e) => {
              e.preventDefault()
              setSent(true)
            }}
          >
            <input type="email" required placeholder={cta.placeholder} aria-label={cta.placeholder} />
            <button type="submit" className="btn btn-primary magnetic">
              <span className="dot" />
              <span>{cta.button}</span>
            </button>
          </form>
        )}
        <p className="cta-note">{cta.note}</p>
      </div>
    </section>
  )
}
