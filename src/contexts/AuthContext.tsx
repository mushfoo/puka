import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, AuthError } from '@supabase/supabase-js'
import { supabase, AuthUser } from '@/lib/supabase'

// Auth context interface
interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  
  // Authentication methods
  signUp: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: AuthError | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  
  // Account management
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  deleteAccount: () => Promise<{ error: AuthError | null }>
  
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
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasLocalData, setHasLocalData] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authPromptDismissed, setAuthPromptDismissed] = useState(false)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (error) {
            console.error('Error getting session:', error)
          } else {
            setSession(initialSession)
            setUser(initialSession?.user as AuthUser | null)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user as AuthUser | null)
          setLoading(false)
          
          // Handle auth events
          if (event === 'SIGNED_IN') {
            console.log('User signed in:', session?.user?.email)
            setAuthPromptDismissed(false) // Reset prompt state on sign in
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out')
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    return { 
      user: data.user as AuthUser | null, 
      error 
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    return { 
      user: data.user as AuthUser | null, 
      error 
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    return { error }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    
    return { error }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }, [])

  const deleteAccount = useCallback(async () => {
    // Note: Account deletion requires additional setup in Supabase
    // This would need to be implemented as a database function
    console.warn('Account deletion not yet implemented')
    return { error: null }
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
    signInWithOAuth,
    signInWithMagicLink,
    signOut,
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