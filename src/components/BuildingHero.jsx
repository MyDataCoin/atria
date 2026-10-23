import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, useScroll, useTransform } from 'framer-motion'
import Tower from './Tower.jsx'
import { useContent } from '../i18n.jsx'

const EASE = [0.16, 1, 0.3, 1]
const lineUp = {
  hidden: { y: '115%' },
  visible: (d) => ({ y: 0, transition: { duration: 1.05, ease: EASE, delay: d } }),
}

export default function BuildingHero() {
  const hero = useContent().hero
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
  const cueOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])

  const c1 = useTransform(scrollYProgress, [0.3, 0.42, 0.92, 1], [0, 1, 1, 0])
  const c2 = useTransform(scrollYProgress, [0.56, 0.68], [0, 1])
  const c3 = useTransform(scrollYProgress, [0.74, 0.86], [0, 1])
  const own = useTransform(scrollYProgress, [0.7, 0.82], [0, 1])
  const ownY = useTransform(scrollYProgress, [0.7, 0.84], [18, 0])

  const callOps = [c1, c2, c3]
  const callPos = [
    { top: '26%', right: '10%' },
    { top: '60%', right: '14%' },
    { top: '74%', right: '11%' },
  ]

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

        {hero.callouts.map((t, i) => (
          <motion.div className="bcallout" key={t} style={{ ...callPos[i], opacity: callOps[i] }}>
            <span>{t}</span>
          </motion.div>
        ))}

        <motion.div className="own-card" style={{ opacity: own, y: ownY }}>
          <span className="own-dot" />
          <div>
            <div className="own-t">{hero.own.tag}</div>
            <div className="own-a">{hero.own.addr}</div>
            <div className="own-m">{hero.own.m}</div>
          </div>
        </motion.div>

        <motion.div className="bhero-scroll" style={{ opacity: cueOpacity }}>
          <span>{hero.cue}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v15M6 13l6 6 6-6" />
          </svg>
        </motion.div>

        <div className="bhero-overlay">
          <div className="bhero-top">
            <span className="eyebrow">{hero.eyebrow}</span>
            <span className="mono" style={{ color: 'var(--ink-3)' }}>
              {hero.coords}
            </span>
          </div>

          <motion.div className="bhero-headline" style={{ y: headY, opacity: headOp }}>
            <h1>
              {hero.lines.map((ln, i) => {
                const text = ln.t.replace(/\*/g, '')
                return (
                  <span className="bhero-line" key={ln.t}>
                    <motion.span
                      style={{ display: 'block' }}
                      variants={lineUp}
                      initial="hidden"
                      animate="visible"
                      custom={0.3 + i * 0.1}
                    >
                      {ln.accent ? <span className="it">{text}</span> : text}
                    </motion.span>
                  </span>
                )
              })}
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
              <a href="#portfolio" className="btn btn-primary magnetic">
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
              <span className="big">{hero.readout.big}</span>
              <span>{hero.readout.label}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
