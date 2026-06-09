import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import { faq as c } from '../content.js'

export default function Faq() {
  const [tab, setTab] = useState('Все')
  const [open, setOpen] = useState(0)

  const items = tab === 'Все' ? c.items : c.items.filter((it) => it.group === tab)

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
            href="#cta"
            className="tlink"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              color: 'var(--amber-deep, var(--amber))',
              display: 'inline-block',
              marginTop: '1.6rem',
            }}
          >
            Не нашли ответ? → Написать нам
          </a>
        </div>

        <div>
          <div className="faq-tabs">
            {c.tabs.map((t) => (
              <button
                key={t}
                className={`faq-tab ${tab === t ? 'on' : ''}`}
                onClick={() => {
                  setTab(t)
                  setOpen(0)
                }}
              >
                {t}
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
