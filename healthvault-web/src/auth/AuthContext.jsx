import React, { createContext, useContext, useEffect, useState } from 'react'
import client from '../api/client'
import { message } from 'antd'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check existing session on first load
  useEffect(() => {
    let mounted = true
    client.get('/auth/me/')
      .then((u) => { if (mounted) setUser(u) })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const login = async (username, password) => {
    await client.post('/auth/login/', { username, password })
    const me = await client.get('/auth/me/')
    setUser(me)
    message.success(`Welcome, ${me.username}`)
  }

  const logout = async () => {
    await client.post('/auth/logout/')
    setUser(null)
    message.success('Logged out')
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
