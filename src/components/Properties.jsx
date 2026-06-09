import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Reveal, { RevealWords } from './Reveal.jsx'
import { properties } from '../content.js'

function Property({ p, i }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])

  return (
    <Reveal as="article" className="prop magnetic" delay={i * 0.1} ref={ref} amount={0.2}>
      <motion.div
        className="prop-bg"
        style={{
          backgroundColor: '#2a3038',
          backgroundImage: p.img ? `url(${p.img})` : p.bg,
          y: bgY,
        }}
      />
      <span className="prop-badge">{p.badge}</span>
      <div className="prop-body">
        <span className="loc">{p.loc}</span>
        <h3>{p.name}</h3>
        <div className="prop-stats">
          {p.stats.map((st) => (
            <div key={st.k}>
              <span className="ps-v">{st.v}</span>
              <span className="ps-k">{st.k}</span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  )
}

export default function Properties() {
  return (
    <section className="section surface-paper" id="properties">
      <div className="container">
        <div className="shead">
          <div>
            <span className="eyebrow">Портфель</span>
            <h2>
              <RevealWords text="Объекты" /> <span className="it">ATRIA</span>
            </h2>
          </div>
          <Reveal>
            <p className="lead">
              Действующие офисные центры Бишкека с проверенными арендаторами и стабильным
              денежным потоком. Примеры объектов для токенизации.
            </p>
          </Reveal>
        </div>

        <div className="props">
          {properties.map((p, i) => (
            <Property key={p.name} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
