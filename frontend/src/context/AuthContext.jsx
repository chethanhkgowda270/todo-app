import { createContext, useContext, useEffect, useState } from 'react'
import { api, getAccessToken, setTokens } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setCheckingSession(false)
      return
    }
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        setTokens({})
        setUser(null)
      })
      .finally(() => setCheckingSession(false))
  }, [])

  async function login({ email, password }) {
    const data = await api.login({ email, password })
    setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
    setUser(data.user)
  }

  async function register({ email, password }) {
    const data = await api.register({ email, password })
    setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
    setUser(data.user)
    return data // caller may want dev_verify_link
  }

  function logout() {
    setTokens({})
    setUser(null)
  }

  function refreshUser() {
    return api.me().then((u) => setUser(u))
  }

  const value = { user, checkingSession, login, register, logout, refreshUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
