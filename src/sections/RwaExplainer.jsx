import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { rwa as c } from '../content.js'

const ICONS = [
  // building
  <>
    <path d="M8 40V14l16-8 16 8v26" />
    <path d="M4 40h40" />
    <path d="M18 40V28h12v12" />
  </>,
  // building split into cells
  <>
    <path d="M10 40V16l14-7 14 7v24" />
    <path d="M10 24h28M10 32h28M19 16v24M29 16v24" />
  </>,
  // one cell highlighted → record
  <>
    <path d="M8 38V18l12-6 12 6v20" />
    <rect x="14" y="26" width="6" height="6" />
    <path d="M32 20h10M32 26h8M32 32h10" />
  </>,
]

export default function RwaExplainer() {
  const [open, setOpen] = useState(0)

  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="rwa-strip">
          {c.steps.map((s, i) => (
            <Reveal as="div" className="rwa-step" key={s.n} delay={i * 0.12} y={22}>
              <span className="n">{s.n}</span>
              <svg className="ic" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[i]}
              </svg>
              <h4>{s.label}</h4>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
          <span className="eyebrow" style={{ marginBottom: '1.2rem' }}>
            Четыре слова, которые пугают — и что они значат
          </span>
        </Reveal>

        <div className="acc">
          {c.terms.map((t, i) => {
            const isOpen = open === i
            return (
              <div className={`acc-item ${isOpen ? 'open' : ''}`} key={t.term}>
                <button className="acc-q" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                  <span className="term">{t.term}</span>
                  <span className="gloss">{t.gloss}</span>
                  <span className="pm" aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="acc-a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p className="acc-a-in">{t.text}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <Reveal as="div" className="callout" style={{ marginTop: 'clamp(2.5rem,5vw,4rem)' }}>
          <div>
            <span className="tag">{c.example.tag}</span>
            <div className="cv">{c.example.value}</div>
          </div>
          <p>{c.example.text}</p>
        </Reveal>

        <p className="s-note">{c.microcopy}</p>
      </div>
    </section>
  )
}
