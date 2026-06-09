import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, useScroll, useTransform } from 'framer-motion'
import Tower from './Tower.jsx'
import { hero } from '../content.js'

const EASE = [0.16, 1, 0.3, 1]
const lineUp = {
  hidden: { y: '115%' },
  visible: (d) => ({ y: 0, transition: { duration: 1.05, ease: EASE, delay: d } }),
}

export default function BuildingHero() {
  const wrapRef = useRef(null)
  const progress = useRef(0)

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => {
      progress.current = v
    })
    return unsub
  }, [scrollYProgress])

  const headY = useTransform(scrollYProgress, [0, 0.55], [0, -70])
  const headOp = useTransform(scrollYProgress, [0, 0.42], [1, 0])
  const barScale = useTransform(scrollYProgress, [0, 1], [0.02, 1])

  const c1 = useTransform(scrollYProgress, [0.16, 0.26, 0.46, 0.54], [0, 1, 1, 0])
  const c2 = useTransform(scrollYProgress, [0.48, 0.58], [0, 1])
  const c3 = useTransform(scrollYProgress, [0.6, 0.7], [0, 1])
  const own = useTransform(scrollYProgress, [0.7, 0.82], [0, 1])
  const ownY = useTransform(scrollYProgress, [0.7, 0.84], [18, 0])
  const cueOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])

  return (
    <header className="bhero" ref={wrapRef} id="top" style={{ height: '300vh' }}>
      <div className="bhero-sticky">
        <div className="bhero-canvas">
          <Canvas
            shadows
            dpr={[1, 1.8]}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [5.5, 1.2, 18.5], fov: 24 }}
          >
            <Suspense fallback={null}>
              <Tower progress={progress} />
            </Suspense>
          </Canvas>
        </div>

        <motion.div className="bcallout" style={{ top: '26%', right: '10%', opacity: c1 }}>
          <span>
            <span className="v">14</span> этажей · класс A
          </span>
        </motion.div>
        <motion.div className="bcallout" style={{ top: '60%', right: '14%', opacity: c2 }}>
          <span>
            1 м² · <span className="v">от $115</span>
          </span>
        </motion.div>
        <motion.div className="bcallout" style={{ top: '74%', right: '11%', opacity: c3 }}>
          <span>
            ваши метры <span className="v">·</span> поэтажный план
          </span>
        </motion.div>

        <motion.div className="own-card" style={{ opacity: own, y: ownY }}>
          <span className="own-dot" />
          <div>
            <div className="own-t">Токенизировано</div>
            <div className="own-a">0x7F3…A91 · владелец</div>
            <div className="own-m">1 м² · ATRIA Tower</div>
          </div>
        </motion.div>

        <motion.div className="bhero-scroll" style={{ opacity: cueOpacity }}>
          <span>Листайте вниз</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v15M6 13l6 6 6-6" />
          </svg>
        </motion.div>

        <div className="bhero-overlay">
          <div className="bhero-top">
            <span className="eyebrow">{hero.eyebrow}</span>
            <span className="mono" style={{ color: 'var(--ink-3)' }}>
              БИШКЕК · 42.87°N
            </span>
          </div>

          <motion.div className="bhero-headline" style={{ y: headY, opacity: headOp }}>
            <h1>
              <span className="bhero-line">
                <motion.span style={{ display: 'block' }} variants={lineUp} initial="hidden" animate="visible" custom={0.3}>
                  Реальная
                </motion.span>
              </span>
              <span className="bhero-line">
                <motion.span style={{ display: 'block' }} variants={lineUp} initial="hidden" animate="visible" custom={0.4}>
                  недвижимость
                </motion.span>
              </span>
              <span className="bhero-line">
                <motion.span style={{ display: 'block' }} variants={lineUp} initial="hidden" animate="visible" custom={0.5}>
                  <span className="it">по метру</span>
                </motion.span>
              </span>
            </h1>
            <motion.p
              className="bhero-sub"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.75 }}
            >
              {hero.sub}
            </motion.p>
            <motion.div
              className="bhero-cta"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
            >
              <a href="#cta" className="btn btn-primary magnetic">
                <span className="dot" />
                <span>{hero.primary}</span>
              </a>
              <a href="#how" className="btn btn-ghost magnetic">
                <span>{hero.secondary}</span>
              </a>
            </motion.div>
          </motion.div>

          <div className="bhero-bottom">
            <div className="bhero-progress" aria-hidden="true">
              <motion.i style={{ scaleX: barScale }} />
            </div>
            <div className="bhero-readout">
              <span className="big">от $115</span>
              <span>ЗА 1 м² · ЛИСТАЙТЕ ВНУТРЬ ↓</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
