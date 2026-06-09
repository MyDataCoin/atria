import { Fragment } from 'react'
import SHead from '../components/SHead.jsx'
import { compare as c } from '../content.js'

const MARK = { '+': '+', '-': '−', o: '•' }
const MARKCLASS = { '+': 'plus', '-': 'minus', o: 'o' }

export default function Compare() {
  return (
    <section className={`section surface-${c.surface}`} id={c.id}>
      <div className="container">
        <SHead eyebrow={c.eyebrow} headline={c.headline} sub={c.subhead} />

        <div className="cmp-scroll">
          <div className="cmp-grid">
            <div className="ch">Что сравниваем</div>
            {c.columns.map((col, i) => (
              <div className={`ch ${i === 3 ? 'atria cmp-col-atria' : ''}`} key={col}>
                {i === 3 ? <span className="cmp-badge">ATRIA</span> : col}
              </div>
            ))}

            {c.rows.map((row) => (
              <Fragment key={row.axis}>
                <div className="cell axis">
                  <span className="ax">{row.axis}</span>
                  <span className="hint">{row.hint}</span>
                </div>
                {row.cells.map((cell, ci) => (
                  <div className={`cell ${ci === 3 ? 'cmp-col-atria' : ''}`} key={`${row.axis}-${ci}`}>
                    <span className={`mk ${MARKCLASS[cell.m]}`} aria-hidden="true">
                      {MARK[cell.m]}
                    </span>
                    {cell.t}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        <p className="s-note">{c.microcopy}</p>
      </div>
    </section>
  )
}
