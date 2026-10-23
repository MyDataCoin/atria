import { useEffect } from 'react'
import { DocBody } from './DocModal.jsx'

// Отдельная страница юр-документа: тот же текст, что в модалке, но со своим адресом,
// чтобы на него можно было сослаться (Meta, магазины приложений, письма).
export default function DocPage({ page }) {
  const { doc } = page

  useEffect(() => {
    const prev = document.title
    document.title = `${doc.title} — ATRIA`
    return () => { document.title = prev }
  }, [doc])

  return (
    <main className="docpage">
      <div className="container docpage-inner">
        <a href="/" className="docpage-back tlink">← На главную</a>
        <span className="lic-badge mono">{doc.badge}</span>
        <h1 className="lic-title display docpage-title">{doc.title}</h1>
        <p className="lic-body lic-doc-intro">{doc.intro}</p>
        <DocBody doc={doc} />
      </div>
    </main>
  )
}
