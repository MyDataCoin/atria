import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]

// Generic on-scroll reveal: fades + rises into place once.
// forwardRef so callers can use the element as a scroll/parallax target.
const Reveal = forwardRef(function Reveal(
  { children, as = 'div', delay = 0, y = 28, duration = 0.9, className = '', amount = 0.3, ...rest },
  ref
) {
  const MotionTag = motion[as] || motion.div
  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
})

export default Reveal

// Word-by-word reveal for display headings. Pass a string.
export function RevealWords({ text, className = '', stagger = 0.06, delay = 0 }) {
  const words = text.split(' ')
  return (
    <span className={className} style={{ display: 'inline' }}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="reveal-line" style={{ display: 'inline-block' }}>
          <motion.span
            style={{ display: 'inline-block', willChange: 'transform' }}
            initial={{ y: '110%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  )
}
