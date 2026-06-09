import { motion } from 'framer-motion'
import { marqueeItems } from '../content.js'

export default function Marquee() {
  const row = (
    <div className="marquee-row" aria-hidden="true">
      {marqueeItems.map((t) => (
        <span className="marquee-item" key={t}>
          {t}
        </span>
      ))}
    </div>
  )

  return (
    <div className="marquee">
      <motion.div
        style={{ display: 'flex' }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
      >
        {row}
        {row}
      </motion.div>
    </div>
  )
}
