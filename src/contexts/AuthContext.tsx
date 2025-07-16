import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AuthUser, AuthSession, AuthError, onAuthStateChange, signUp as authSignUp, signIn as authSignIn, signOut as authSignOut } from '@/lib/auth-client'

// Auth context interface
interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  
  // Authentication methods
  signUp: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  
  // Progressive enhancement
  isAuthenticated: boolean
  canSync: boolean
  showAuthPrompt: boolean
  dismissAuthPrompt: () => void
  
  // Local data migration
  hasLocalData: boolean
  setHasLocalData: (hasData: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth provider component
interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasLocalData, setHasLocalData] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authPromptDismissed, setAuthPromptDismissed] = useState(false)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      if (mounted) {
        setUser(user)
        // Create a simple session object if user exists
        if (user) {
          const expires = new Date()
          expires.setDate(expires.getDate() + 30) // 30 days
          setSession({
            user,
            session: {
              id: `session_${user.id}`,
              userId: user.id,
              expiresAt: expires,
              token: 'session_token', // This would be managed by Better-auth
            }
          })
        } else {
          setSession(null)
        }
        setLoading(false)
        
        // Handle auth events
        if (user) {
          console.log('User signed in:', user.email)
          setAuthPromptDismissed(false) // Reset prompt state on sign in
        } else {
          console.log('User signed out')
        }
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Progressive enhancement logic
  useEffect(() => {
    // Show auth prompt if user has local data but isn't authenticated
    if (hasLocalData && !user && !authPromptDismissed && !loading) {
      const timer = setTimeout(() => {
        setShowAuthPrompt(true)
      }, 2000) // Show after 2 seconds of usage
      
      return () => clearTimeout(timer)
    }
  }, [hasLocalData, user, authPromptDismissed, loading])

  // Auth methods
  const signUp = useCallback(async (email: string, password: string) => {
    const result = await authSignUp(email, password)
    console.log('SignUp result:', result)
    
    if (result.data?.user) {
      const user: AuthUser = {
        ...result.data.user,
        image: result.data.user.image || null
      }
      console.log('SignUp success, user:', user)
      return { user, error: null }
    } else {
      console.log('SignUp failed, error:', result.error)
      return { user: null, error: { error: result.error?.message || 'Registration failed' } }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authSignIn(email, password)
    
    if (result.data?.user) {
      const user: AuthUser = {
        ...result.data.user,
        image: result.data.user.image || null
      }
      return { user, error: null }
    } else {
      return { user: null, error: { error: result.error?.message || 'Sign in failed' } }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authSignOut()
      return { error: null }
    } catch (error: any) {
      return { 
        error: { 
          error: error.message || 'Failed to sign out'
        } 
      }
    }
  }, [])

  const dismissAuthPrompt = useCallback(() => {
    setShowAuthPrompt(false)
    setAuthPromptDismissed(true)
    
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('puka_auth_prompt_dismissed', 'true')
  }, [])

  // Check localStorage for dismissed state on load
  useEffect(() => {
    const dismissed = localStorage.getItem('puka_auth_prompt_dismissed')
    if (dismissed === 'true') {
      setAuthPromptDismissed(true)
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    loading,
    
    // Auth methods
    signUp,
    signIn,
    signOut,
    
    // Progressive enhancement
    isAuthenticated: !!user,
    canSync: !!user && !!session,
    showAuthPrompt,
    dismissAuthPrompt,
    
    // Local data migration
    hasLocalData,
    setHasLocalData,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// HOC for components that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth()
    
    if (loading) {
      return <div>Loading...</div>
    }
    
    if (!isAuthenticated) {
      return <div>Please sign in to access this feature.</div>
    }
    
    return <Component {...props} />
  }
}

// Hook for optional authentication (progressive enhancement)
export function useOptionalAuth() {
  const auth = useAuth()
  
  return {
    ...auth,
    // Helper to check if user should be prompted for auth
    shouldPromptAuth: auth.hasLocalData && !auth.isAuthenticated && !auth.loading,
    
    // Helper to check if sync is available
    syncAvailable: auth.canSync,
  }
}