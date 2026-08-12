import { useState } from 'react'
import { api } from '../api.js'

export default function ForgotPasswordForm({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const data = await api.requestPasswordReset(email)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Reset access</p>
        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-sub">Enter your email and we'll send a reset link.</p>

        {result ? (
          <>
            <p className="auth-note">{result.message}</p>
            {result.dev_reset_link && (
              <p className="auth-note dev-link">
                Dev mode (no email provider configured) — reset link:
                <br />
                <a href={result.dev_reset_link}>{result.dev_reset_link}</a>
              </p>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Email
              <input
                type="email"
                value={email}
                required
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="add-btn auth-submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <button type="button" className="auth-switch" onClick={onBackToLogin}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}
