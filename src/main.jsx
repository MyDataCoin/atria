import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

// StrictMode intentionally omitted: avoids double-invoking GSAP/Lenis setup in dev.
createRoot(document.getElementById('root')).render(<App />)
