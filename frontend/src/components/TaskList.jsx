import { useState } from 'react'
import TaskItem from './TaskItem.jsx'

export default function TaskList({ tasks, filter, hasAnyTasks, justCompletedId, onToggle, onDelete, onReorder }) {
  const [draggedId, setDraggedId] = useState(null)
  const [overId, setOverId] = useState(null)
  const dragEnabled = filter === 'all'

  function handleDrop(targetId) {
    if (draggedId == null || draggedId === targetId) {
      setDraggedId(null)
      setOverId(null)
      return
    }
    const ids = tasks.map((t) => t.id)
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null)
      setOverId(null)
      return
    }
    const reordered = [...ids]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, draggedId)

    setDraggedId(null)
    setOverId(null)
    onReorder(reordered)
  }

  if (tasks.length === 0) {
    const msg = !hasAnyTasks
      ? { mark: 'The page is blank.', sub: 'Write your first line above.' }
      : filter === 'done'
      ? { mark: 'Nothing settled yet.', sub: 'Check an item to mark it done.' }
      : { mark: 'All accounts settled.', sub: 'Nothing open right now.' }

    return (
      <div className="lines">
        <div className="empty">
          <span className="mark">{msg.mark}</span>
          <span className="sub">{msg.sub}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="lines">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          justCompleted={task.id === justCompletedId}
          onToggle={onToggle}
          onDelete={onDelete}
          isDragging={dragEnabled && draggedId === task.id}
          isDropTarget={dragEnabled && overId === task.id && draggedId !== task.id}
          onDragStart={dragEnabled ? setDraggedId : () => {}}
          onDragOver={dragEnabled ? setOverId : () => {}}
          onDrop={dragEnabled ? handleDrop : () => {}}
          onDragEnd={() => {
            setDraggedId(null)
            setOverId(null)
          }}
        />
      ))}
    </div>
  )
}
