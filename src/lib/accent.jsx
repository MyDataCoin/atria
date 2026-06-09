// Render a headline string, wrapping the *marked* word in an amber italic accent.
export function Accent({ text }) {
  const parts = String(text).split(/\*(.+?)\*/g)
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <em key={i} className="ac">
        {p}
      </em>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}
