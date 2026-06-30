import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContent } from '../i18n.jsx'
import { PRIVACY_POLICY } from '../content.policy.js'
import { CONSENT_FORM } from '../content.consent.js'
import { TERMS_OF_SERVICE } from '../content.tos.js'

const EASE = [0.16, 1, 0.3, 1]

const LICENSES = {
  1: {
    title: 'Лицензия №1',
    badge: 'СРНФП · в процессе',
    body: 'Оператор платформы ATRIA проходит лицензирование в Службе по регулированию небанковских финансовых организаций при Министерстве финансов Кыргызской Республики (СРНФП) на осуществление деятельности оператора виртуальных активов в соответствии с Законом КР №12 «О виртуальных активах».',
    note: 'Статус: заявка на лицензирование подана, рассмотрение в процессе.',
  },
  2: {
    title: 'Лицензия №2',
    badge: 'СРНФП · в процессе',
    body: 'Оператор платформы ATRIA проходит лицензирование на осуществление деятельности по выпуску и обращению токенов, обеспеченных недвижимым имуществом, под надзором СРНФП в рамках пилотного режима, предусмотренного Законом КР №12 «О виртуальных активах».',
    note: 'Статус: заявка на лицензирование подана, рассмотрение в процессе.',
  },
}

function LicenseModal({ licenseId, onClose }) {
  const license = licenseId ? LICENSES[licenseId] : null

  useEffect(() => {
    if (!license) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [license, onClose])

  return (
    <AnimatePresence>
      {license && (
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
            className="lic-card"
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
            <span className="lic-badge mono">{license.badge}</span>
            <h2 className="lic-title display">{license.title}</h2>
            <p className="lic-body">{license.body}</p>
            <p className="lic-note mono">{license.note}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

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

function DocModal({ doc, onClose }) {
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

export default function Footer() {
  const footer = useContent().footer
  const [licenseId, setLicenseId] = useState(null)
  const [openDoc, setOpenDoc] = useState(null)

  const companyCol = footer.cols.find((c) => /компан/i.test(c.h)) || footer.cols[footer.cols.length - 1]
  const rawLinks = companyCol ? companyCol.links : []
  const companyLinks = rawLinks.filter((l) => !/карьера/i.test(l)).map((l) => ({ label: l }))
  const allLinks = [
    ...companyLinks,
    { label: 'Лицензия №1', licenseId: 1 },
    { label: 'Лицензия №2', licenseId: 2 },
    { label: 'Пользовательское соглашение', doc: TERMS_OF_SERVICE },
    { label: 'Политика конфиденциальности', doc: PRIVACY_POLICY },
    { label: 'Согласие на обработку данных', doc: CONSENT_FORM },
  ]

  return (
    <footer className="footer">
      <div className="container">

        <div className="footer-top">

          {/* лого — отдельная строка над всем */}
          <div className="footer-brand">
            <img src="/atria-logo-light.png" alt="ATRIA" className="footer-logo" />
          </div>

          {/* строка: дисклеймер слева, компания справа */}
          <div className="footer-left">
            <p className="footer-disclaimer">{footer.disclaimer}</p>

            {companyCol && (
              <div className="footer-col footer-col--company">
                <h5>{companyCol.h}</h5>
                {allLinks.map((item) => {
                  if (item.licenseId) {
                    return (
                      <button
                        type="button"
                        className="tlink footer-link-btn"
                        key={item.label}
                        onClick={() => setLicenseId(item.licenseId)}
                      >
                        {item.label}
                      </button>
                    )
                  }
                  if (item.doc) {
                    return (
                      <button
                        type="button"
                        className="tlink footer-link-btn"
                        key={item.label}
                        onClick={() => setOpenDoc(item.doc)}
                      >
                        {item.label}
                      </button>
                    )
                  }
                  return (
                    <a href="#top" className="tlink" key={item.label}>
                      {item.label}
                    </a>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="footer-bottom">
          <span>{footer.bottomLeft}</span>
          <span className="footer-contact">
            Бишкек&nbsp;•&nbsp;
            <a href="mailto:hello@atria.kg" className="footer-email">hello@atria.kg</a>
          </span>
        </div>

      </div>

      <LicenseModal licenseId={licenseId} onClose={() => setLicenseId(null)} />
      <DocModal doc={openDoc} onClose={() => setOpenDoc(null)} />
    </footer>
  )
}