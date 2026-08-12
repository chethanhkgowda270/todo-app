import { useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { useAuth } from './context/AuthContext.jsx'
import Cover from './components/Cover.jsx'
import TaskForm from './components/TaskForm.jsx'
import FilterTabs from './components/FilterTabs.jsx'
import TaskList from './components/TaskList.jsx'
import AuthForm from './components/AuthForm.jsx'
import VerifyEmailScreen from './components/VerifyEmailScreen.jsx'
import ResetPasswordScreen from './components/ResetPasswordScreen.jsx'
import './App.css'

export default function App() {
  const path = window.location.pathname

  // Public routes — reachable whether or not you're logged in.
  if (path === '/verify-email') return <VerifyEmailScreen />
  if (path === '/reset-password') return <ResetPasswordScreen />

  return <AuthGate />
}

function AuthGate() {
  const { user, checkingSession } = useAuth()

  if (checkingSession) {
    return (
      <div className="page">
        <div className="book">
          <div className="lines" style={{ marginTop: 40 }}>
            <div className="empty">
              <span className="mark">Opening the ledger…</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <AuthForm />
      </div>
    )
  }

  return <Ledger />
}

function Ledger() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [justCompletedId, setJustCompletedId] = useState(null)
  const [resendState, setResendState] = useState('idle') // idle | sending | sent

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .listTasks()
      .then((data) => {
        if (!cancelled) setTasks(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAdd({ text, priority, due_date, tags }) {
    setSubmitting(true)
    setError(null)
    try {
      const created = await api.createTask({ text, priority, due_date, tags })
      setTasks((prev) => [created, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(task) {
    const nextDone = !task.done
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t)))
    if (nextDone) {
      setJustCompletedId(task.id)
      setTimeout(() => setJustCompletedId((cur) => (cur === task.id ? null : cur)), 1200)
    }
    try {
      await api.updateTask(task.id, { done: nextDone })
    } catch (err) {
      setError(err.message)
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)))
    }
  }

  async function handleDelete(task) {
    const prevTasks = tasks
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    try {
      await api.deleteTask(task.id)
    } catch (err) {
      setError(err.message)
      setTasks(prevTasks)
    }
  }

  async function handleReorder(orderedIds) {
    const prevTasks = tasks
    // Reorder locally first for a snappy UI.
    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]))
    setTasks(orderedIds.map((id) => byId[id]).filter(Boolean))
    try {
      const updated = await api.reorderTasks(orderedIds)
      setTasks(updated)
    } catch (err) {
      setError(err.message)
      setTasks(prevTasks)
    }
  }

  async function handleResendVerification() {
    setResendState('sending')
    try {
      await api.resendVerification()
      setResendState('sent')
    } catch (err) {
      setError(err.message)
      setResendState('idle')
    }
  }

  const filteredTasks = useMemo(() => {
    if (filter === 'active') return tasks.filter((t) => !t.done)
    if (filter === 'done') return tasks.filter((t) => t.done)
    return tasks
  }, [tasks, filter])

  const remaining = tasks.filter((t) => !t.done).length
  const doneCount = tasks.length - remaining

  return (
    <div className="page">
      <div className="book">
        <Cover remaining={remaining} userEmail={user.email} onLogout={logout} />

        {!user.is_verified && (
          <div className="verify-banner">
            <span>Verify your email to secure your account.</span>
            {resendState === 'sent' ? (
              <span className="verify-sent">Sent — check the console/log for the dev link.</span>
            ) : (
              <button
                type="button"
                className="verify-resend"
                onClick={handleResendVerification}
                disabled={resendState === 'sending'}
              >
                {resendState === 'sending' ? 'Sending…' : 'Resend link'}
              </button>
            )}
          </div>
        )}

        <TaskForm onAdd={handleAdd} submitting={submitting} />
        <FilterTabs filter={filter} onChange={setFilter} />

        {loading ? (
          <div className="lines">
            <div className="empty">
              <span className="mark">Opening the ledger…</span>
            </div>
          </div>
        ) : (
          <TaskList
            tasks={filteredTasks}
            filter={filter}
            hasAnyTasks={tasks.length > 0}
            justCompletedId={justCompletedId}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        )}

        <p className="footer-note">
          {error
            ? `Error: ${error}`
            : tasks.length > 0
            ? `${tasks.length} total · ${doneCount} settled · ${remaining} open${
                filter === 'all' ? ' · drag ⠿ to reorder' : ''
              }`
            : ''}
        </p>
      </div>
    </div>
  )
}
