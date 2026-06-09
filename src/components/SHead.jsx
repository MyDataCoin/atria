import { motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'

const EASE = [0.16, 1, 0.3, 1]

// Shared section header: mono eyebrow + serif headline (with amber accent) + lead.
export default function SHead({ eyebrow, headline, sub, center = false }) {
  return (
    <motion.div
      className={`s-head ${center ? 'center' : ''}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.span
        className="eyebrow"
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
        style={center ? { justifyContent: 'center' } : undefined}
      >
        {eyebrow}
      </motion.span>
      <motion.h2
        className="s-h2"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
      >
        <Accent text={headline} />
      </motion.h2>
      {sub && (
        <motion.p
          className="s-sub"
          style={center ? { marginInline: 'auto' } : undefined}
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
        >
          {sub}
        </motion.p>
      )}
    </motion.div>
  )
}
