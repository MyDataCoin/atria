import { useEffect } from 'react'
import { LangProvider } from './i18n.jsx'
import { useSmoothScroll } from './lib/smooth.js'
import Nav from './components/Nav.jsx'
import ToTop from './components/ToTop.jsx'
import BuildingHero from './components/BuildingHero.jsx'
import Footer from './components/Footer.jsx'
import DocPage from './components/DocPage.jsx'
import { docPageFor } from './docs.js'
import ObjectPage, { objectRouteFor } from './components/ObjectPage.jsx'

import Backing from './sections/Backing.jsx'
import HowItWorks from './sections/HowItWorks.jsx'
import Portfolio from './sections/Portfolio.jsx'
import Risks from './sections/Risks.jsx'
import Faq from './sections/Faq.jsx'
import Contact from './sections/Contact.jsx'

function Site() {
  useSmoothScroll()
  return (
    <>
      <Nav />
      <BuildingHero />
      <main>
        {/* Что купить → чем обеспечен токен → как купить → ответы → что важно знать. */}
        <Portfolio />
        <Backing />
        <HowItWorks />
        <Faq />
        <Risks />
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
