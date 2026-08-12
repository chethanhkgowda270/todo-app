import { useState } from 'react'
import { api } from '../api.js'

export default function ResetPasswordScreen() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Reset access</p>
          <h1 className="auth-title">Set a new password</h1>

          {!token ? (
            <p className="auth-error">This link is missing its token — check the URL and try again.</p>
          ) : done ? (
            <>
              <p className="auth-note">Your password has been updated.</p>
              <a className="auth-switch" href="/">Continue to sign in</a>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                New password
                <input
                  type="password"
                  value={password}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="add-btn auth-submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
