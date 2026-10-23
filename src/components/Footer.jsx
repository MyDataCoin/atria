import { useContent } from '../i18n.jsx'
import { DOC_PAGES } from '../docs.js'

export default function Footer() {
  const footer = useContent().footer

  const companyCol = footer.cols.find((c) => /компан/i.test(c.h)) || footer.cols[footer.cols.length - 1]
  const rawLinks = companyCol ? companyCol.links : []
  const companyLinks = rawLinks.filter((l) => !/карьера|юридическая информация/i.test(l)).map((l) => ({ label: l, href: '/#top' }))
  // У каждого документа своя страница (atria.kg/privacy-policy и т.п.).
  const allLinks = [
    ...companyLinks,
    ...DOC_PAGES.map((p) => ({ label: p.label, href: p.path })),
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
                {allLinks.map((item) => (
                  <a href={item.href} className="tlink" key={item.label}>
                    {item.label}
                  </a>
                ))}
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
    </footer>
  )
}
