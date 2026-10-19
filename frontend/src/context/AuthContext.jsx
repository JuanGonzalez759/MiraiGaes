import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  getCsrfToken,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function restoreSession() {
      try {
        const token = await getCsrfToken({ signal: controller.signal })
        setCsrfToken(token)

        try {
          const result = await getCurrentUser({ signal: controller.signal })
          setUser(result.user)
        } catch (error) {
          if (error.status !== 401) throw error
          setUser(null)
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setAuthError('No se pudo comprobar la sesión. Comprueba que la API está disponible.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    restoreSession()
    return () => controller.abort()
  }, [])

  async function signIn(credentials) {
    const result = await loginUser(credentials, csrfToken)
    setUser(result.user)
    setCsrfToken(result.csrf_token)
    setAuthError('')
    return result.user
  }

  async function signUp(details) {
    return registerUser(details, csrfToken)
  }

  async function signOut() {
    await logoutUser(csrfToken)
    setUser(null)
    setCsrfToken('')
    const newToken = await getCsrfToken()
    setCsrfToken(newToken)
  }

  const value = useMemo(() => ({
    user,
    csrfToken,
    isLoading,
    authError,
    signIn,
    signUp,
    signOut,
  }), [user, csrfToken, isLoading, authError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
