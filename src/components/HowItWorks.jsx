import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Reveal, { RevealWords } from './Reveal.jsx'
import { how } from '../content.js'

export default function HowItWorks() {
  const wrapRef = useRef(null)
  const trackRef = useRef(null)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track) return
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth))
    }
    measure()
    const t = setTimeout(measure, 700) // after webfonts settle
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  })
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance])
  const barScale = useTransform(scrollYProgress, [0, 1], [0.04, 1])

  return (
    <section className="section surface-ink" id="how" style={{ paddingBottom: 0 }}>
      <div className="container">
        <div className="shead">
          <div>
            <span className="eyebrow">{how.eyebrow}</span>
            <h2>
              <RevealWords text="Четыре шага" /> <span className="it">к владению</span>
            </h2>
          </div>
          <Reveal>
            <p className="lead">
              От верификации до первых дивидендов — прозрачный путь без посредников и бумажной
              волокиты.
            </p>
          </Reveal>
        </div>
      </div>

      {/* pinned horizontal scroll */}
      <div
        className="steps-wrap"
        ref={wrapRef}
        style={{ height: `calc(100svh + ${distance}px)` }}
      >
        <div className="steps-sticky">
          <motion.div className="steps-track" ref={trackRef} style={{ x }}>
            {how.steps.map((s) => (
              <article className="step-card" key={s.idx}>
                <div className="glow" />
                <div className="idx">{s.idx}</div>
                <div>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              </article>
            ))}
          </motion.div>

          <div className="steps-progress">
            <span>ПРОЦЕСС</span>
            <span className="track">
              <motion.i style={{ scaleX: barScale }} />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
