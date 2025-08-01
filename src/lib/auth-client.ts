import { createAuthClient } from 'better-auth/client'
import { getClientConfig } from './config/environment.js'

const config = getClientConfig()

export const authClient = createAuthClient({
  baseURL: config.authUrl,
  fetchOptions: {
    credentials: 'include', // Important for cookies
  },
})

export type AuthUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export type AuthSession = {
  user: AuthUser
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
    ipAddress?: string
    userAgent?: string
  }
}

export type AuthError = {
  error: string
}

// Convenience functions for common auth operations
export const signUp = async (email: string, password: string, name: string) => {
  return await authClient.signUp.email({
    email,
    password,
    name,
  })
}

export const signIn = async (email: string, password: string) => {
  return await authClient.signIn.email({
    email,
    password,
  })
}

export const signOut = async () => {
  return await authClient.signOut()
}

export const getSession = async () => {
  return await authClient.getSession()
}

// Auth state change listener
export const onAuthStateChange = (
  callback: (user: AuthUser | null) => void
) => {
  let currentUser: AuthUser | null = null
  let isInitialized = false

  const checkSession = async () => {
    try {
      const session = await getSession()
      const newUser = session.data?.user
        ? {
            ...session.data.user,
            image: session.data.user.image || null,
          }
        : null

      // Always call callback on first check to clear loading state
      if (!isInitialized) {
        isInitialized = true
        callback(newUser)
        currentUser = newUser
        return
      }

      // Only call callback if user state actually changed
      if (JSON.stringify(newUser) !== JSON.stringify(currentUser)) {
        callback(newUser)
        currentUser = newUser
      }
    } catch (error) {
      console.error('Session check error:', error)
      // On error, clear user state if we haven't initialized yet
      if (!isInitialized) {
        isInitialized = true
        callback(null)
        currentUser = null
      }
    }
  }

  // Initial check
  checkSession()

  // Check every 30 seconds for session updates (less frequent to reduce load)
  const interval = setInterval(checkSession, 30000)

  // Also check on window focus (user might have signed in/out in another tab)
  const handleFocus = () => {
    checkSession()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus)
  }

  // Return unsubscribe function
  return () => {
    clearInterval(interval)
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus)
    }
  }
}
