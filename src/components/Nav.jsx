import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContent, useLang } from '../i18n.jsx'
import Registration from './Registration.jsx'
import { tokens, onSessionLost, onAuthChange } from '../lib/api.js'
import { logout } from '../lib/auth.js'
import { DASHBOARD_URL } from '../lib/dashboard.js'

const EASE = [0.16, 1, 0.3, 1]

export default function Nav() {
  const data = useContent()
  const nav = data.nav
  const ui = data.ui
  const { lang, setLang } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [authMode, setAuthMode] = useState(null) // null | 'register' | 'login'
  // Шапка обязана показывать, вошёл человек или нет. Раньше «Войти» висело всегда, поэтому
  // понять своё состояние было невозможно: вошёл ты, вышел, протухла ли сессия — вид один.
  const [authed, setAuthed] = useState(() => tokens.isAuthed)

  // Сессия могла умереть в любом фоновом запросе — сразу отражаем это в шапке.
  useEffect(() => onSessionLost(() => setAuthed(false)), [])

  // Войти можно и не из шапки — например, из модалки покупки. Слушаем сам факт входа/выхода,
  // а не закрытие своей модалки: иначе после регистрации через покупку шапка до перезагрузки
  // продолжала звать регистрироваться.
  useEffect(() => onAuthChange(() => setAuthed(tokens.isAuthed)), [])

  const handleLogout = () => {
    logout()
    setAuthed(false)
    setOpen(false)
  }

  // Модалка закрылась — состояние могло поменяться (вошли/вышли/протухло).
  const closeAuth = () => {
    setAuthMode(null)
    setAuthed(tokens.isAuthed)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // lock body scroll while the mobile menu is open, and auto-close on resize
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 760) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const closeMenu = () => setOpen(false)

  const openRegister = () => {
    closeMenu()
    setAuthMode('register')
  }

  const openLogin = () => {
    closeMenu()
    setAuthMode('login')
  }

  return (
    <>
      <motion.nav
        className={`nav ${scrolled ? 'scrolled' : ''} ${open ? 'menu-open' : ''}`}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
      >
        <a href="#top" className="nav-brand magnetic" aria-label="ATRIA" onClick={closeMenu}>
          <img src="/atria-logo.png" alt="ATRIA" className="nav-logo" />
        </a>

        <div className="nav-links">
          {nav.links.map((l) => (
            <a key={l.href} href={l.href} className="tlink">
              {l.label}
            </a>
          ))}
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === 'ru' ? 'kg' : 'ru')}
            aria-label="Тил / Язык"
          >
            <span className={lang === 'ru' ? 'on' : ''}>{ui.langRu}</span>
            <span className="sep">/</span>
            <span className={lang === 'kg' ? 'on' : ''}>{ui.langKg}</span>
          </button>
          {/* Вошедшему регистрация не предлагается: его действия — кабинет и выход.
              Гостю — зарегистрироваться или войти. */}
          {authed ? (
            <>
              <a href={DASHBOARD_URL} className="nav-cta magnetic">
                Дашборд
              </a>
              <button type="button" className="nav-cta magnetic login-btn" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <button type="button" className="nav-cta magnetic" onClick={openRegister}>
                {nav.cta}
              </button>
              <button type="button" className="nav-cta magnetic login-btn" onClick={openLogin}>
                Войти
              </button>
            </>
          )}
        </div>

        {/* burger icon — only visible on mobile via CSS */}
        <button
          className={`burger ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        {/* mobile dropdown panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="mobile-menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="mobile-menu-links">
                {nav.links.map((l) => (
                  <a key={l.href} href={l.href} className="mobile-link" onClick={closeMenu}>
                    {l.label}
                  </a>
                ))}
              </div>

              <div className="mobile-menu-actions">
                <button
                  className="lang-toggle"
                  onClick={() => setLang(lang === 'ru' ? 'kg' : 'ru')}
                  aria-label="Тил / Язык"
                >
                  <span className={lang === 'ru' ? 'on' : ''}>{ui.langRu}</span>
                  <span className="sep">/</span>
                  <span className={lang === 'kg' ? 'on' : ''}>{ui.langKg}</span>
                </button>

                {authed ? (
                  <>
                    <a href={DASHBOARD_URL} className="nav-cta" onClick={closeMenu}>
                      Дашборд
                    </a>
                    <button type="button" className="nav-cta login-btn" onClick={handleLogout}>
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="nav-cta" onClick={openRegister}>
                      {nav.cta}
                    </button>
                    <button type="button" className="nav-cta login-btn" onClick={openLogin}>
                      Войти
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <Registration
        mode={authMode}
        onClose={closeAuth}
      />
    </>
  )
}