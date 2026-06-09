import { footer, nav } from '../content.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/atria-logo-light.png" alt="ATRIA" className="footer-logo" />
          </div>
          {footer.cols.map((col) => (
            <div className="footer-col" key={col.h}>
              <h5>{col.h}</h5>
              {col.links.map((l) => (
                <a href="#top" className="tlink" key={l}>
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>

        <p className="footer-disclaimer">{footer.disclaimer}</p>

        <div className="footer-bottom">
          <span>© 2026 ATRIA — Токенизация недвижимости Кыргызстана</span>
          <span>Бишкек · {nav.cta} · hello@atria.kg</span>
        </div>
      </div>
    </footer>
  )
}
