import { useState } from 'react'

export default function TaskForm({ onAdd, submitting }) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [expanded, setExpanded] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    onAdd({
      text: trimmed,
      priority,
      due_date: dueDate || null,
      tags,
    })

    setText('')
    setDueDate('')
    setTagsInput('')
  }

  return (
    <form className="entry" onSubmit={handleSubmit}>
      <div className="entry-row">
        <input
          type="text"
          placeholder="Enter a new line item…"
          value={text}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
        />
        <select className="priority-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" className="add-btn" disabled={submitting}>
          {submitting ? 'Adding…' : '+ Add'}
        </button>
      </div>

      <button type="button" className="entry-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? '– fewer details' : '+ due date / tags'}
      </button>

      {expanded && (
        <div className="entry-row entry-row-secondary">
          <label className="entry-sub-label">
            Due
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="entry-sub-label entry-sub-label-wide">
            Tags
            <input
              type="text"
              placeholder="comma, separated, tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </label>
        </div>
      )}
    </form>
  )
}
