import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  // Sincronización automática de perfil con el endpoint /users/me
  useEffect(() => {
    async function syncUserProfile() {
      const token = localStorage.getItem('token')
      if (!token || !user) return
      try {
        const freshUser = await api.get('/users/me')
        if (freshUser && freshUser.id) {
          setUser((prev) => {
            const updated = { ...prev, ...freshUser }
            localStorage.setItem('user', JSON.stringify(updated))
            return updated
          })
        }
      } catch (e) {
        // Token expirado o fallo de red
      }
    }

    syncUserProfile()
  }, [])

  async function login(username, password) {
    const data = await api.post('/login', { username, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  function updateUser(updatedUser) {
    const nextUser = { ...user, ...updatedUser }
    localStorage.setItem('user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}