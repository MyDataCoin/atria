import { useSmoothScroll } from './lib/smooth.js'
import Cursor from './components/Cursor.jsx'
import Nav from './components/Nav.jsx'
import BuildingHero from './components/BuildingHero.jsx'
import Footer from './components/Footer.jsx'

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
import FinalCta from './sections/FinalCta.jsx'

export default function App() {
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
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
