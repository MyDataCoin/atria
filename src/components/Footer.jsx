import { useContent } from '../i18n.jsx'
import { DOC_PAGES } from '../docs.js'
import { PHONE, WHATSAPP, EMAIL, ADDRESS_SHORT } from '../company.js'

export default function Footer() {
  const footer = useContent().footer

  const companyCol = footer.cols.find((c) => /компан/i.test(c.h)) || footer.cols[footer.cols.length - 1]
  const rawLinks = companyCol ? companyCol.links : []
  const companyLinks = rawLinks
    .filter((l) => !/карьера|юридическая информация|юридикалык маалымат/i.test(l))
    // «О ATRIA» (кырг. «ATRIA жөнүндө») — на блок «Что такое ATRIA», а не в начало главной.
    .map((l) => ({
      label: l,
      href: /контакт|байланыш/i.test(l) ? '/contacts' : /о atria|жөнүндө/i.test(l) ? '/#what' : '/#top',
    }))
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
            {ADDRESS_SHORT}&nbsp;•&nbsp;
            {PHONE.tel
              ? <a href={`tel:${PHONE.tel}`} className="footer-email">{PHONE.display}</a>
              : PHONE.display}
            &nbsp;•&nbsp;
            <a href={WHATSAPP.href} target="_blank" rel="noopener noreferrer" className="footer-email">WhatsApp</a>
            &nbsp;•&nbsp;
            <a href={`mailto:${EMAIL}`} className="footer-email">{EMAIL}</a>
          </span>
        </div>

        <div className="footer-credit">
          Made with
          <svg className="footer-heart" viewBox="0 0 24 24" width="13" height="13" aria-label="love" role="img">
            <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
          </svg>
          by
          <a href="https://t.me/azimbek_s" target="_blank" rel="noopener noreferrer" className="footer-credit-link">
            @azimbek_s
          </a>
        </div>

      </div>
    </footer>
  )
}
