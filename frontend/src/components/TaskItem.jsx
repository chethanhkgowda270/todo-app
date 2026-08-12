function formatDueDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function isOverdue(isoDate, done) {
  if (!isoDate || done) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(isoDate + 'T00:00:00') < today
}

export default function TaskItem({
  task,
  justCompleted,
  onToggle,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
}) {
  const overdue = isOverdue(task.due_date, task.done)

  return (
    <div
      className={`line ${task.done ? 'done' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(task.id)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(task.id)
      }}
    >
      <span
        className="drag-handle"
        draggable
        onDragStart={() => onDragStart(task.id)}
        onDragEnd={onDragEnd}
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        ⠿
      </span>

      <button
        className="check"
        aria-label={task.done ? 'Mark as open' : 'Mark as done'}
        onClick={() => onToggle(task)}
      >
        <svg viewBox="0 0 22 22">
          <polyline points="4,11 9,16 18,6" />
        </svg>
      </button>

      <div className="line-body">
        <div className="line-text">{task.text}</div>
        <div className="meta">
          <span className={`tag ${task.priority}`}>{task.priority}</span>
          {task.due_date && (
            <span className={`due ${overdue ? 'overdue' : ''}`}>
              {overdue ? 'Overdue · ' : 'Due '}
              {formatDueDate(task.due_date)}
            </span>
          )}
          {task.tags && task.tags.length > 0 && (
            <span className="tag-list">
              {task.tags.map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {justCompleted && <span className="stamp">Settled</span>}

      <button className="del" aria-label="Delete task" onClick={() => onDelete(task)}>
        ✕
      </button>
    </div>
  )
}
