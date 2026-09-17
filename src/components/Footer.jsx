import { useState } from 'react'
import { useContent } from '../i18n.jsx'
import { PRIVACY_POLICY } from '../content.policy.js'
import { CONSENT_FORM } from '../content.consent.js'
import { TERMS_OF_SERVICE } from '../content.tos.js'
import { WHITE_PAPER } from '../content.whitepaper.js'
import DocModal from './DocModal.jsx'

export default function Footer() {
  const footer = useContent().footer
  const [openDoc, setOpenDoc] = useState(null)

  const companyCol = footer.cols.find((c) => /компан/i.test(c.h)) || footer.cols[footer.cols.length - 1]
  const rawLinks = companyCol ? companyCol.links : []
  const companyLinks = rawLinks.filter((l) => !/карьера/i.test(l)).map((l) => ({ label: l }))
  const allLinks = [
    ...companyLinks,
    { label: 'White Paper', doc: WHITE_PAPER },
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

        {/* ── СВЕДЕНИЯ О ЮРЛИЦЕ ── */}
        {footer.legal && (
          <div className="footer-legal">
            <h5>{footer.legal.h}</h5>
            <dl className="footer-legal-grid">
              {footer.legal.rows.map(([label, value]) => (
                <div className="footer-legal-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* ── BOTTOM BAR ── */}
        <div className="footer-bottom">
          <span>{footer.bottomLeft}</span>
          <span className="footer-contact">
            Бишкек&nbsp;•&nbsp;
            <a href="mailto:hello@atria.kg" className="footer-email">hello@atria.kg</a>
          </span>
        </div>

      </div>

      <DocModal doc={openDoc} onClose={() => setOpenDoc(null)} />
    </footer>
  )
}