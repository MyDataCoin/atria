import { useState } from 'react'
import { motion } from 'framer-motion'
import { Accent } from '../lib/accent.jsx'
import Reveal from '../components/Reveal.jsx'
import { useContent } from '../i18n.jsx'

const money = (n) => Math.round(n).toLocaleString('ru-RU') + ' сом'

export default function Calculator() {
  const c = useContent().calc
  const ui = c.ui
  const [amount, setAmount] = useState(100000)
  const [rate, setRate] = useState(8)
  const [period, setPeriod] = useState('quarter')

  const m2 = Math.max(1, Math.floor(amount / c.pricePerM2))
  const annual = (amount * rate) / 100
  const payout = period === 'quarter' ? annual / 4 : annual
  const squares = Math.min(m2, 48)

  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container calc-grid">
        <div className="calc-notes-wrap">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2 className="s-h2" style={{ marginTop: '1rem' }}>
            <Accent text={c.headline} />
          </h2>
          <p className="s-sub" style={{ marginBottom: '2rem' }}>
            {c.subhead}
          </p>
          <div className="calc-notes">
            {c.notes.map((n, i) => (
              <Reveal as="div" className="calc-note" key={n.label} delay={i * 0.08} y={16}>
                <h4>{n.label}</h4>
                <p>{n.text}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal as="div" className="calc-card" y={24}>
          <div className="calc-field">
            <span className="lab">{ui.contribution}</span>
            <div className="big">{money(amount)}</div>
            <input
              type="range"
              min={c.pricePerM2}
              max={c.pricePerM2 * 435}
              step={c.pricePerM2}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label={ui.contribution}
            />
            <div className="calc-sub">{ui.priceNote}</div>
          </div>

          <div className="calc-field">
            <span className="lab">
              ≈ <strong style={{ color: 'var(--amber-deep, var(--amber))' }}>{m2}</strong> {ui.m2suffix}
            </span>
            <div className="calc-m2" aria-hidden="true">
              {Array.from({ length: 48 }, (_, i) => (
                <i key={i} className={i < squares ? 'on' : ''} />
              ))}
            </div>
          </div>

          <div className="calc-field">
            <span className="calc-warn">{ui.warn}</span>
            <span className="lab">{ui.rateLabel}</span>
            <div className="big">
              {rate.toFixed(1)}
              <span className="u">%</span>
            </div>
            <input
              type="range"
              min={2}
              max={14}
              step={0.5}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-label={ui.rateLabel}
            />
          </div>

          <div className="calc-toggle" role="tablist">
            {[
              ['quarter', ui.toggleQuarter],
              ['year', ui.toggleYear],
            ].map(([key, label]) => (
              <button
                key={key}
                className={period === key ? 'on' : ''}
                onClick={() => setPeriod(key)}
                role="tab"
                aria-selected={period === key}
              >
                {period === key && <motion.span layoutId="calcpill" className="pill" />}
                {label}
              </button>
            ))}
          </div>

          <div className="calc-result">
            <span className="lab">{period === 'quarter' ? ui.resultQuarter : ui.resultYear}</span>
            <div className="big">≈ {money(payout)}</div>
            <div className="formula">
              {money(amount)} × {rate.toFixed(1)}%{period === 'quarter' ? ' ÷ 4' : ''} {ui.formulaTail}
            </div>
          </div>

          <p className="calc-disc">{c.microcopy}</p>
        </Reveal>
      </div>
    </section>
  )
}
