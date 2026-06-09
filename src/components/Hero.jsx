import { motion, useScroll, useTransform } from 'framer-motion'
import AtriaMark from './AtriaMark.jsx'
import { hero } from '../content.js'

const EASE = [0.16, 1, 0.3, 1]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.085, delayChildren: 0.35 } },
}
const lineUp = {
  hidden: { y: '115%' },
  visible: { y: 0, transition: { duration: 1.05, ease: EASE } },
}
const fadeUp = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.9, ease: EASE } },
}

export default function Hero() {
  const { scrollY } = useScroll()
  const glowY = useTransform(scrollY, [0, 900], [0, 240])
  const glowScale = useTransform(scrollY, [0, 900], [1, 1.35])
  const markY = useTransform(scrollY, [0, 900], [0, -140])
  const contentY = useTransform(scrollY, [0, 900], [0, 80])
  const fade = useTransform(scrollY, [0, 600], [1, 0])

  return (
    <header className="hero" id="top">
      <motion.div className="hero-glow" style={{ y: glowY, scale: glowScale }} />
      <div className="hero-grid" />

      <motion.div className="hero-mark" style={{ y: markY }}>
        <AtriaMark animate stroke={2.2} style={{ width: '100%' }} />
      </motion.div>

      <motion.div
        className="container hero-inner"
        style={{ y: contentY, opacity: fade }}
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <div>
          <motion.div variants={fadeUp} style={{ marginBottom: '1.6rem' }}>
            <span className="eyebrow">{hero.eyebrow}</span>
          </motion.div>

          <h1>
            <span className="hero-line">
              <motion.span variants={lineUp} style={{ display: 'block' }}>
                Владейте
              </motion.span>
            </span>
            <span className="hero-line">
              <motion.span variants={lineUp} style={{ display: 'block' }}>
                <span className="it">реальной</span> недвижимостью
              </motion.span>
            </span>
            <span className="hero-line">
              <motion.span variants={lineUp} style={{ display: 'block' }}>
                Кыргызстана <span className="amberword">от $115</span>
              </motion.span>
            </span>
          </h1>
        </div>

        <div className="hero-side">
          <motion.p className="lead" variants={fadeUp}>
            {hero.sub}
          </motion.p>
          <motion.div className="hero-cta" variants={fadeUp}>
            <a href="#cta" className="btn btn-primary magnetic">
              <span className="dot" />
              <span>{hero.primary}</span>
            </a>
            <a href="#how" className="btn btn-ghost magnetic">
              <span>{hero.secondary}</span>
            </a>
          </motion.div>
          <motion.div className="hero-meta" variants={fadeUp}>
            {hero.meta.map((m) => (
              <div key={m.lbl}>
                <div className="num">{m.num}</div>
                <div className="lbl">{m.lbl}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="scroll-cue"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        style={{ opacity: fade }}
      >
        <span className="bar" />
        Листайте
      </motion.div>
    </header>
  )
}
