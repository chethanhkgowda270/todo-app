import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function VerifyEmailScreen() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') || ''

  const [status, setStatus] = useState('pending') // pending | success | error
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('This link is missing its token — check the URL and try again.')
      return
    }
    api
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setError(err.message)
      })
  }, [token])

  return (
    <div className="page">
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Account</p>
          <h1 className="auth-title">Email verification</h1>

          {status === 'pending' && <p className="auth-note">Verifying…</p>}
          {status === 'success' && <p className="auth-note">Your email is verified. You're all set.</p>}
          {status === 'error' && <p className="auth-error">{error}</p>}

          <a className="auth-switch" href="/">Continue to sign in</a>
        </div>
      </div>
    </div>
  )
}
