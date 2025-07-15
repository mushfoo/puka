import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useSession, signIn, signOut, getSession } from 'next-auth/react'

// Define a simplified AuthUser type for compatibility
export interface AuthUser {
  id: string
  email: string
  name?: string
  image?: string
}

// Auth context interface (maintains compatibility with existing Supabase implementation)
interface AuthContextType {
  user: AuthUser | null
  session: any | null
  loading: boolean
  
  // Authentication methods (simplified for NextAuth.js)
  signUp: (email: string, password: string) => Promise<{ user: AuthUser | null; error: any | null }>
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: any | null }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: any | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: any | null }>
  signOut: () => Promise<{ error: any | null }>
  
  // Account management
  resetPassword: (email: string) => Promise<{ error: any | null }>
  updatePassword: (password: string) => Promise<{ error: any | null }>
  deleteAccount: () => Promise<{ error: any | null }>
  
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
  const { data: session, status } = useSession()
  const [hasLocalData, setHasLocalData] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authPromptDismissed, setAuthPromptDismissed] = useState(false)

  const loading = status === 'loading'
  const user: AuthUser | null = session?.user ? {
    id: session.user.id as string,
    email: session.user.email!,
    name: session.user.name || undefined,
    image: session.user.image || undefined
  } : null

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
  const signUpMethod = useCallback(async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      
      if (result?.error) {
        return { user: null, error: { message: result.error } }
      }
      
      // Get updated session
      const newSession = await getSession()
      const newUser = newSession?.user ? {
        id: newSession.user.id as string,
        email: newSession.user.email!,
        name: newSession.user.name || undefined,
        image: newSession.user.image || undefined
      } : null
      
      return { user: newUser, error: null }
    } catch (error) {
      return { user: null, error: { message: 'Sign up failed' } }
    }
  }, [])

  const signInMethod = useCallback(async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      
      if (result?.error) {
        return { user: null, error: { message: result.error } }
      }
      
      // Get updated session
      const newSession = await getSession()
      const newUser = newSession?.user ? {
        id: newSession.user.id as string,
        email: newSession.user.email!,
        name: newSession.user.name || undefined,
        image: newSession.user.image || undefined
      } : null
      
      return { user: newUser, error: null }
    } catch (error) {
      return { user: null, error: { message: 'Sign in failed' } }
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    try {
      const result = await signIn(provider, { redirect: false })
      return { error: result?.error ? { message: result.error } : null }
    } catch (error) {
      return { error: { message: `OAuth sign in with ${provider} failed` } }
    }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    // NextAuth.js doesn't have built-in magic link support like Supabase
    // This would need to be implemented with an email provider
    console.warn('Magic link sign in not yet implemented with NextAuth.js')
    return { error: { message: 'Magic link sign in not available' } }
  }, [])

  const signOutMethod = useCallback(async () => {
    try {
      await signOut({ redirect: false })
      return { error: null }
    } catch (error) {
      return { error: { message: 'Sign out failed' } }
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    // Password reset would need to be implemented separately
    console.warn('Password reset not yet implemented')
    return { error: { message: 'Password reset not available' } }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    // Password update would need to be implemented separately
    console.warn('Password update not yet implemented')
    return { error: { message: 'Password update not available' } }
  }, [])

  const deleteAccount = useCallback(async () => {
    // Account deletion would need to be implemented separately
    console.warn('Account deletion not yet implemented')
    return { error: { message: 'Account deletion not available' } }
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
    signUp: signUpMethod,
    signIn: signInMethod,
    signInWithOAuth,
    signInWithMagicLink,
    signOut: signOutMethod,
    resetPassword,
    updatePassword,
    deleteAccount,
    
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