const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Open' },
  { key: 'done', label: 'Settled' },
]

export default function FilterTabs({ filter, onChange }) {
  return (
    <div className="tabs">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          className={`tab ${filter === f.key ? 'active' : ''}`}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
