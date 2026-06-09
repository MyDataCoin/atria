import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SHead from '../components/SHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { trust as c } from '../content.js'

const ICONS = [
  // law / scales
  <>
    <path d="M16 6h16M24 6v34M12 40h24" />
    <path d="M16 6l-6 12h12zM32 6l6 12h-12z" />
  </>,
  // shield check
  <>
    <path d="M24 5l15 5v10c0 10-7 17-15 21-8-4-15-11-15-21V10z" />
    <path d="M17 23l5 5 9-10" />
  </>,
  // separate boxes
  <>
    <rect x="6" y="22" width="14" height="14" />
    <rect x="28" y="22" width="14" height="14" />
    <path d="M13 22v-8h22v8" />
  </>,
  // linked blocks + lock
  <>
    <rect x="7" y="20" width="12" height="12" />
    <rect x="29" y="20" width="12" height="12" />
    <path d="M19 26h10" />
    <path d="M22 12h4v6h-4zM21 12a3 3 0 016 0" />
  </>,
]

function Pillar({ p, i, icon }) {
  const [open, setOpen] = useState(false)
  return (
    <Reveal as="article" className="pillar" delay={(i % 2) * 0.1 + Math.floor(i / 2) * 0.06} y={26}>
      <div className="top">
        <svg className="ic" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
        <span className="stamp">{p.stamp}</span>
      </div>
      <h3>{p.label}</h3>
      <p className="teaser">{p.teaser}</p>
      <button className="more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Свернуть −' : 'Подробнее +'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="pillar-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p>{p.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

export default function TrustLegal() {
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="pillars">
          {c.pillars.map((p, i) => (
            <Pillar key={p.label} p={p} i={i} icon={ICONS[i]} />
          ))}
        </div>

        <Reveal as="div" className="callout" style={{ marginTop: 'clamp(1.5rem,3vw,2.5rem)' }}>
          <div>
            <span className="tag">{c.primer.tag}</span>
            <div className="cv">{c.primer.value}</div>
          </div>
          <p>{c.primer.text}</p>
        </Reveal>

        <p className="s-note">{c.microcopy}</p>
      </div>
    </section>
  )
}
