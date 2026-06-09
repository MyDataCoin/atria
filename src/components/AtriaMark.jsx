import { motion } from 'framer-motion'

// The ATRIA brandmark — a temple portico / atrium arch, redrawn as fine line art
// to match the real logo: pedimented roof + finial, architrave, two columns,
// a tall rounded inner arch, and a stepped base. `animate` = draw-on effect.
const PATHS = [
  'M50 23 V17', // finial
  'M27 37 L50 23 L73 37', // roof gable (overhanging eaves)
  'M34 43 H66', // architrave beam
  'M34 43 V80', // left column
  'M66 43 V80', // right column
  'M42 80 V58 A8 8 0 0 1 58 58 V80', // central rounded arch
  'M25 80 H75', // base (widest)
]

export default function AtriaMark({ animate = false, className = '', stroke = 2.2, style }) {
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay: 0.15 + i * 0.13, duration: 1, ease: [0.16, 1, 0.3, 1] },
        opacity: { delay: 0.15 + i * 0.13, duration: 0.2 },
      },
    }),
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS.map((d, i) =>
        animate ? (
          <motion.path key={i} d={d} custom={i} variants={draw} initial="hidden" animate="visible" />
        ) : (
          <path key={i} d={d} />
        )
      )}
    </svg>
  )
}
