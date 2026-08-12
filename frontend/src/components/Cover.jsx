export default function Cover({ remaining, userEmail, onLogout }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="cover">
      <p className="eyebrow">Daily record</p>
      <h1>The Ledger</h1>
      <p className="date-line">{today}</p>
      {userEmail && (
        <p className="date-line user-line">
          {userEmail} · <button className="logout-link" onClick={onLogout}>Sign out</button>
        </p>
      )}
      <div className="balance">
        <div className="num">{remaining}</div>
        <div className="label">Open</div>
      </div>
    </div>
  )
}
