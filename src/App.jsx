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

import WhatIsAtria from './sections/WhatIsAtria.jsx'
import RwaExplainer from './sections/RwaExplainer.jsx'
import HowItWorks from './sections/HowItWorks.jsx'
import IncomeEconomics from './sections/IncomeEconomics.jsx'
import Calculator from './sections/Calculator.jsx'
import Portfolio from './sections/Portfolio.jsx'
import Compare from './sections/Compare.jsx'
import TrustLegal from './sections/TrustLegal.jsx'
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
        <WhatIsAtria />
        <RwaExplainer />
        <HowItWorks />
        <IncomeEconomics />
        <Calculator />
        <Portfolio />
        <Compare />
        <TrustLegal />
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

function Page() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase()
  if (path === '/contacts') return <Contacts />
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
