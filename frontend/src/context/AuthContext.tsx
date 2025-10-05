import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../services/api'
import { useNavigate } from 'react-router-dom'

type AuthResult = { token?: string; user?: api.User }

type AuthState = {
  user: api.User | null
  token: string | null
  login: (email: string, password: string) => Promise<AuthResult>
  register: (email: string, password: string, name?: string) => Promise<AuthResult>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(() => {
    try { return JSON.parse(localStorage.getItem('sd_user') || 'null') } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sd_token'))

  const navigate = useNavigate()

  useEffect(() => {
    // validate token on load
    async function validate() {
      if (!token) return
      try {
        const me = await api.me(token)
        setUser(me)
      } catch {
        setToken(null)
        setUser(null)
        localStorage.removeItem('sd_token')
        localStorage.removeItem('sd_user')
      }
    }
    validate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (token) localStorage.setItem('sd_token', token)
    else localStorage.removeItem('sd_token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('sd_user', JSON.stringify(user))
    else localStorage.removeItem('sd_user')
  }, [user])

  async function login(email: string, password: string) {
    const res = await api.login(email, password)
    setToken(res.token ?? null)
    setUser(res.user ?? null)
    return res
  }

  async function register(email: string, password: string, name?: string) {
    const res = await api.register(email, password, name)
    setToken(res.token ?? null)
    setUser(res.user ?? null)
    return res
  }

  function logout() {
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}