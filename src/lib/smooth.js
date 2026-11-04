import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Lenis momentum scrolling, wired into the GSAP ScrollTrigger ticker so
// pinned/scrubbed animations stay in perfect sync with the smooth scroll.
// Пришли по ссылке с якорем (/#what со страницы документа): браузер ищет якорь при загрузке,
// когда React ещё не отрисовал секции, и остаётся наверху. Докручиваем сами, когда разметка готова.
function scrollToHashOnLoad(scrollTo) {
  const id = window.location.hash
  if (id.length < 2) return () => {}
  const t = setTimeout(() => {
    const el = document.querySelector(id)
    if (el) scrollTo(el)
  }, 700) // после ScrollTrigger.refresh ниже — иначе пины героя ещё не измерены и отступ неверный
  return () => clearTimeout(t)
}

export function useSmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return scrollToHashOnLoad((el) => el.scrollIntoView())
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    // anchor links → smooth scroll. «/#what» (так ссылается футер — он есть и на страницах
    // документов) на главной — тот же якорь, а не переход на новую страницу.
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"], a[href^="/#"]')
      if (!a) return
      const id = a.getAttribute('href').replace(/^\//, '')
      if (id.length < 2) return
      const el = document.querySelector(id)
      if (!el) return
      e.preventDefault()
      lenis.scrollTo(el, { offset: -40, duration: 1.4 })
    }
    document.addEventListener('click', onClick)

    // make sure triggers measure correctly after fonts/images settle
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const t = setTimeout(refresh, 600)
    const cancelHashScroll = scrollToHashOnLoad((el) => lenis.scrollTo(el, { offset: -40, immediate: true }))

    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('load', refresh)
      clearTimeout(t)
      cancelHashScroll()
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])
}
