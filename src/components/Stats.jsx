import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import Reveal from './Reveal.jsx'
import { stats } from '../content.js'

function CountUp({ to, prefix = '', suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration: 1.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to])

  return (
    <span ref={ref}>
      {prefix}
      {val}
      <span className="u">{suffix}</span>
    </span>
  )
}

export default function Stats() {
  return (
    <section className="section surface-paper">
      <div className="container">
        <div className="stats">
          {stats.map((s, i) => (
            <Reveal key={s.k} className="stat" delay={i * 0.08} y={20}>
              <div className="v">
                {s.text ? (
                  s.text
                ) : (
                  <CountUp to={s.value} prefix={s.prefix || ''} suffix={s.suffix || ''} />
                )}
              </div>
              <div className="k">{s.k}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
