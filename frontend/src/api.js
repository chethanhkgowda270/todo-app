const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const ACCESS_TOKEN_KEY = 'ledger_access_token'
const REFRESH_TOKEN_KEY = 'ledger_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}
export function setTokens({ access_token, refresh_token } = {}) {
  if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token)
  else localStorage.removeItem(ACCESS_TOKEN_KEY)

  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
  else localStorage.removeItem(REFRESH_TOKEN_KEY)
}
export function setAccessToken(token) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
  else localStorage.removeItem(ACCESS_TOKEN_KEY)
}

async function parseError(response) {
  let message = `Request failed (${response.status})`
  try {
    const body = await response.json()
    if (body.error) message = body.error
  } catch (_) {
    // no JSON body
  }
  const err = new Error(message)
  err.status = response.status
  return err
}

async function handle(response) {
  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return null
  return response.json()
}

function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

let refreshInFlight = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('no refresh token')

  // Coalesce concurrent refreshes into a single request.
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    })
      .then(handle)
      .then((data) => {
        setAccessToken(data.access_token)
        return data.access_token
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

// Wraps a fetch call: on a 401 (expired access token), tries a refresh once
// and retries the original request before giving up.
async function authFetch(url, options = {}) {
  let response = await fetch(url, options)
  if (response.status === 401 && getRefreshToken()) {
    try {
      const newAccessToken = await refreshAccessToken()
      const retryOptions = {
        ...options,
        headers: { ...(options.headers || {}), Authorization: `Bearer ${newAccessToken}` },
      }
      response = await fetch(url, retryOptions)
    } catch (_) {
      setTokens({}) // refresh failed — clear everything, force re-login
    }
  }
  return response
}

export const api = {
  // ---- auth ----
  register({ email, password }) {
    return fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handle)
  },
  login({ email, password }) {
    return fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handle)
  },
  me() {
    return authFetch(`${API_URL}/auth/me`, { headers: { ...authHeaders() } }).then(handle)
  },
  resendVerification() {
    return authFetch(`${API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { ...authHeaders() },
    }).then(handle)
  },
  verifyEmail(token) {
    return fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(handle)
  },
  requestPasswordReset(email) {
    return fetch(`${API_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handle)
  },
  resetPassword({ token, password }) {
    return fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).then(handle)
  },

  // ---- tasks ----
  listTasks() {
    return authFetch(`${API_URL}/tasks`, { headers: { ...authHeaders() } }).then(handle)
  },
  createTask({ text, priority, due_date, tags }) {
    return authFetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ text, priority, due_date, tags }),
    }).then(handle)
  },
  updateTask(id, patch) {
    return authFetch(`${API_URL}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(patch),
    }).then(handle)
  },
  deleteTask(id) {
    return authFetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    }).then(handle)
  },
  reorderTasks(orderedIds) {
    return authFetch(`${API_URL}/tasks/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ order: orderedIds }),
    }).then(handle)
  },
}
