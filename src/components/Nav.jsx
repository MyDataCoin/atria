import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { nav } from '../content.js'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      className={`nav ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      <a href="#top" className="nav-brand magnetic" aria-label="ATRIA">
        <img src="/atria-logo.png" alt="ATRIA" className="nav-logo" />
      </a>
      <div className="nav-links">
        {nav.links.map((l) => (
          <a key={l.href} href={l.href} className="tlink">
            {l.label}
          </a>
        ))}
        <a href="#cta" className="nav-cta magnetic">
          {nav.cta}
        </a>
      </div>
    </motion.nav>
  )
}
