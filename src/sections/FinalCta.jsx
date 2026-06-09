import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import Reveal from '../components/Reveal.jsx'
import { finalCta as c } from '../content.js'

const EASE = [0.16, 1, 0.3, 1]

function Magnetic({ children, href, className }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 150, damping: 15 })
  const sy = useSpring(y, { stiffness: 150, damping: 15 })

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.3)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      className={`btn magnetic ${className}`}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.a>
  )
}

export default function FinalCta() {
  return (
    <section className={`section surface-${c.surface} cta2`} id={c.id}>
      <div className="glow" />
      <div className="container cta2-in">
        <motion.span
          className="eyebrow center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {c.eyebrow}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
        >
          <Accent text={c.headline} />
        </motion.h2>

        <Reveal as="p" className="s-sub" delay={0.15} style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '40ch', textAlign: 'center', marginInline: 'auto' }}>
          {c.subhead}
        </Reveal>

        <div className="cta2-buttons">
          <Magnetic href="#top" className="btn-primary">
            <span className="dot" />
            <span>{c.primary}</span>
          </Magnetic>
          <a href="#portfolio" className="btn btn-ghost magnetic">
            <span>{c.secondary}</span>
          </a>
        </div>

        <div className="cta2-steps">
          {c.steps.map((s, i) => (
            <Reveal as="div" className="cta2-step" key={s.label} delay={i * 0.1} y={20}>
              <span className="val">{s.value}</span>
              <h4>{s.label}</h4>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>

        <p className="s-note" style={{ textAlign: 'center', marginInline: 'auto', borderTop: 'none' }}>
          {c.microcopy}
        </p>
      </div>
    </section>
  )
}
