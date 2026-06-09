import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Reveal, { RevealWords } from './Reveal.jsx'
import { faq } from '../content.js'

export default function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <section className="section surface-paper" id="faq">
      <div className="container">
        <div className="shead">
          <div>
            <span className="eyebrow">Вопросы</span>
            <h2>
              <RevealWords text="Коротко" /> <span className="it">о главном</span>
            </h2>
          </div>
        </div>

        <div className="faq">
          {faq.map((item, i) => {
            const isOpen = open === i
            return (
              <Reveal className={`faq-item ${isOpen ? 'open' : ''}`} key={item.q} delay={i * 0.04} y={16}>
                <button
                  className="faq-q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <h4>{item.q}</h4>
                  <span className="pm" aria-hidden="true" />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="faq-a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p className="faq-a-inner">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
