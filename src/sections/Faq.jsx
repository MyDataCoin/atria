import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import { useContent } from '../i18n.jsx'

export default function Faq() {
  const c = useContent().faq
  const [tab, setTab] = useState('all')
  const [open, setOpen] = useState(0)

  const items = tab === 'all' ? c.items : c.items.filter((it) => it.groupKey === tab)

  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container faq-grid">
        <div className="faq-rail">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2 className="s-h2" style={{ marginTop: '1rem' }}>
            <Accent text={c.headline} />
          </h2>
          <p className="s-sub">{c.subhead}</p>
          <a
            href="#contact"
            className="tlink"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              color: 'var(--amber-deep, var(--amber))',
              display: 'inline-block',
              marginTop: '1.6rem',
            }}
          >
            {c.contact}
          </a>
        </div>

        <div>
          <div className="faq-tabs">
            {c.tabs.map((t) => (
              <button
                key={t.key}
                className={`faq-tab ${tab === t.key ? 'on' : ''}`}
                onClick={() => {
                  setTab(t.key)
                  setOpen(0)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="acc">
            {items.map((it, i) => {
              const isOpen = open === i
              return (
                <div className={`acc-item ${isOpen ? 'open' : ''}`} key={it.q}>
                  <button className="acc-q" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                    <span className="gloss" style={{ marginLeft: 0, color: 'var(--amber-deep, var(--amber))', minWidth: '2.5rem' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="term" style={{ fontSize: 'clamp(1.1rem,1.8vw,1.35rem)', flex: 1 }}>
                      {it.q}
                    </span>
                    <span className="pm" aria-hidden="true" />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        className="acc-a"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <p className="acc-a-in">{it.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <p className="s-note">{c.microcopy}</p>
        </div>
      </div>
    </section>
  )
}
