import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ForgotPasswordForm from './ForgotPasswordForm.jsx'

export default function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [devVerifyLink, setDevVerifyLink] = useState(null)

  if (mode === 'forgot') {
    return <ForgotPasswordForm onBackToLogin={() => setMode('login')} />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        const data = await register({ email, password })
        if (data.dev_verify_link) setDevVerifyLink(data.dev_verify_link)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="eyebrow" style={{ color: 'var(--ink-soft)' }}>
          {mode === 'login' ? 'Welcome back' : 'Open an account'}
        </p>
        <h1 className="auth-title">The Ledger</h1>
        <p className="auth-sub">
          {mode === 'login' ? 'Sign in to see your open items.' : 'Create an account to start your ledger.'}
        </p>

        {devVerifyLink ? (
          <p className="auth-note dev-link">
            Account created. Dev mode (no email provider configured) — verify your email:
            <br />
            <a href={devVerifyLink}>{devVerifyLink}</a>
          </p>
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
            <label className="auth-label">
              Password
              <input
                type="password"
                value={password}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="add-btn auth-submit" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            {mode === 'login' && (
              <button type="button" className="auth-forgot" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            )}
          </form>
        )}

        {!devVerifyLink && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        )}
      </div>
    </div>
  )
}
