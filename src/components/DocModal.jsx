import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]

// Рендер одного блока юр-документа: p / sub / ul / ol / table / form / sign.
function DocBlock({ block }) {
  if (block.ul) {
    return (
      <ul className="lic-doc-list">
        {block.ul.map((li, j) => <li key={j}>{li}</li>)}
      </ul>
    )
  }
  if (block.ol) {
    return (
      <ol className="lic-doc-list lic-doc-list--ol">
        {block.ol.map((li, j) => <li key={j}>{li}</li>)}
      </ol>
    )
  }
  if (block.table) {
    return (
      <div className="lic-doc-tablewrap">
        <table className="lic-doc-table">
          <thead>
            <tr>{block.table.cols.map((c, j) => <th key={j}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, r) => (
              <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (block.form) {
    return (
      <div className="lic-doc-form">
        {block.form.map((field, j) => (
          <div className="lic-doc-field" key={j}>
            <span className="lic-doc-field-line">
              {field.label && <span className="lic-doc-field-label">{field.label}:</span>}
            </span>
            {field.hint && <span className="lic-doc-field-hint">{field.hint}</span>}
          </div>
        ))}
      </div>
    )
  }
  if (block.sign) {
    return (
      <div className="lic-doc-sign">
        {block.sign.map((label, j) => (
          <div className="lic-doc-sign-cell" key={j}>
            <span className="lic-doc-sign-line" />
            <span className="lic-doc-sign-label">{label}</span>
          </div>
        ))}
      </div>
    )
  }
  if (block.sub) {
    return <p className="lic-doc-sub">{block.sub}</p>
  }
  return <p className="lic-doc-p">{block.p}</p>
}

// Модалка юр-документа (политика / согласие / соглашение). doc — из content.*.js.
export default function DocModal({ doc, onClose }) {
  useEffect(() => {
    if (!doc) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [doc, onClose])

  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          className="lic-overlay"
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
        >
          <motion.div
            className="lic-card lic-card--doc"
            data-lenis-prevent
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.4, ease: EASE }}
            role="dialog"
            aria-modal="true"
          >
            <button className="lic-close" onClick={onClose} aria-label="Закрыть">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <span className="lic-badge mono">{doc.badge}</span>
            <h2 className="lic-title display">{doc.title}</h2>
            <p className="lic-body lic-doc-intro">{doc.intro}</p>

            <div className="lic-doc">
              {doc.sections.map((section) => (
                <section className="lic-doc-section" key={section.h}>
                  <h3 className="lic-doc-h">{section.h}</h3>
                  {section.blocks.map((block, i) => <DocBlock block={block} key={i} />)}
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
