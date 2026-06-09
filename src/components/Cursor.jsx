import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// A two-part cursor: a precise dot + a lagging ring that swells over interactive
// elements. Hidden on touch devices via CSS.
export default function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 })
  const ringY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 })
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const interactive = e.target.closest('a, button, input, .magnetic, [data-cursor]')
      setHover(Boolean(interactive))
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])

  return (
    <>
      <motion.div
        className="cursor-dot"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: hover ? 0 : 1 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        className="cursor-ring"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: hover ? 1.6 : 1, opacity: hover ? 1 : 0.6 }}
        transition={{ duration: 0.3 }}
      />
    </>
  )
}
