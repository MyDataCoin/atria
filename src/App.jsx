import { useEffect } from 'react'
import { LangProvider } from './i18n.jsx'
import { useSmoothScroll } from './lib/smooth.js'
import Cursor from './components/Cursor.jsx'
import Nav from './components/Nav.jsx'
import ToTop from './components/ToTop.jsx'
import BuildingHero from './components/BuildingHero.jsx'
import Footer from './components/Footer.jsx'
import DocPage from './components/DocPage.jsx'
import { docPageFor } from './docs.js'
import ObjectPage, { objectRouteFor } from './components/ObjectPage.jsx'

import HowItWorks from './sections/HowItWorks.jsx'
import Portfolio from './sections/Portfolio.jsx'
import Risks from './sections/Risks.jsx'
import Faq from './sections/Faq.jsx'
import Contact from './sections/Contact.jsx'

function Site() {
  useSmoothScroll()
  return (
    <>
      <Cursor />
      <Nav />
      <BuildingHero />
      <main>
        {/* Только нужное: что купить, как, чем рискуете, ответы. Объекты — сразу после экрана. */}
        <Portfolio />
        <HowItWorks />
        <Risks />
        <Faq />
      </main>
      <Footer />
      <ToTop />
    </>
  )
}

// Страница «Контакты» (/contacts) — форма обратной связи, вынесенная с лендинга.
function Contacts() {
  useSmoothScroll()
  useEffect(() => {
    document.title = 'Контакты — ATRIA'
  }, [])
  return (
    <>
      <Cursor />
      <Nav />
      <main>
        <Contact />
      </main>
      <Footer />
      <ToTop />
    </>
  )
}

// Страница юр-документа (/privacy-policy и т.п.). Роутер не нужен: ссылки футера — обычные
// переходы, а nginx на любой адрес отдаёт index.html.
function Doc({ page }) {
  useSmoothScroll()
  return (
    <>
      <Cursor />
      <DocPage page={page} />
      <Footer />
      <ToTop />
    </>
  )
}

// Страница здания или помещения (/building/<id>, /unit/<id>) — своя ссылка на каждый объект.
function ObjectRoute({ route }) {
  useSmoothScroll()
  return (
    <>
      <Cursor />
      <Nav />
      <ObjectPage route={route} />
      <Footer />
      <ToTop />
    </>
  )
}

function Page() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase()
  if (path === '/contacts') return <Contacts />
  const objectRoute = objectRouteFor(window.location.pathname)
  if (objectRoute) return <ObjectRoute route={objectRoute} />
  const page = docPageFor(path)
  return page ? <Doc page={page} /> : <Site />
}

export default function App() {
  return (
    <LangProvider>
      <Page />
    </LangProvider>
  )
}
