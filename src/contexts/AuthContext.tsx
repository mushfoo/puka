import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AuthUser, AuthSession, AuthError, onAuthStateChange, signUp as authSignUp, signIn as authSignIn, signOut as authSignOut } from '@/lib/auth-client'
import { migrationPersistenceService } from '@/services/migration/MigrationPersistenceService'

// Migration status for tracking user's migration state
export interface MigrationState {
  status: 'none' | 'available' | 'in_progress' | 'completed' | 'failed'
  lastAttempt?: Date
  completedAt?: Date
  errorMessage?: string
  migrationId?: string
  skipCount: number
  exportedBackup?: boolean
}

// Migration prompt data for showing to users
export interface MigrationPromptData {
  booksCount: number
  streaksCount: number
  hasSettings: boolean
  estimatedSize: number
  lastModified?: Date
}

// Auth context interface
interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  
  // Authentication methods
  signUp: (email: string, password: string, name?: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  
  // Progressive enhancement
  isAuthenticated: boolean
  canSync: boolean
  
  // Migration state and prompts
  migrationState: MigrationState
  migrationPromptData: MigrationPromptData | null
  showMigrationPrompt: boolean
  dismissMigrationPrompt: () => void
  skipMigration: () => void
  resetMigrationState: () => void
  checkForLocalData: () => Promise<MigrationPromptData | null>
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
  
  // Migration state
  const [migrationState, setMigrationState] = useState<MigrationState>({
    status: 'none',
    skipCount: 0
  })
  const [migrationPromptData, setMigrationPromptData] = useState<MigrationPromptData | null>(null)
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const [migrationPromptDismissed, setMigrationPromptDismissed] = useState(false)

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
        
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])


  // Auth methods
  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    // Use email as name if no name is provided
    const displayName = name || email.split('@')[0]
    
    const result = await authSignUp(email, password, displayName)
    
    if (result.data?.user) {
      const user: AuthUser = {
        ...result.data.user,
        image: result.data.user.image || null
      }
      
      return { user, error: null }
    } else {
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


  // Check for local data that can be migrated
  const checkForLocalData = useCallback(async (): Promise<MigrationPromptData | null> => {
    try {
      let booksCount = 0
      let streaksCount = 0
      let hasSettings = false
      let estimatedSize = 0
      let lastModified: Date | undefined

      // Check for books in localStorage
      const booksData = localStorage.getItem('puka-books')
      if (booksData) {
        try {
          const books = JSON.parse(booksData)
          if (Array.isArray(books)) {
            booksCount = books.length
            estimatedSize += booksData.length
            
            // Find most recent modification
            books.forEach((book: any) => {
              const modified = book.dateModified ? new Date(book.dateModified) : new Date(book.dateAdded)
              if (!lastModified || modified > lastModified) {
                lastModified = modified
              }
            })
          }
        } catch (e) {
          console.warn('Failed to parse books data:', e)
        }
      }

      // Check for streak history
      const streakData = localStorage.getItem('puka-streak-history')
      if (streakData) {
        try {
          const streak = JSON.parse(streakData)
          if (streak && streak.readingDays) {
            streaksCount = streak.readingDays.size || (Array.isArray(streak.readingDays) ? streak.readingDays.length : 0)
            estimatedSize += streakData.length
          }
        } catch (e) {
          console.warn('Failed to parse streak data:', e)
        }
      }

      // Check for enhanced streak history
      const enhancedStreakData = localStorage.getItem('puka-enhanced-streak-history')
      if (enhancedStreakData) {
        try {
          const enhancedStreak = JSON.parse(enhancedStreakData)
          if (enhancedStreak && enhancedStreak.readingDayEntries) {
            streaksCount = Math.max(streaksCount, enhancedStreak.readingDayEntries.length || 0)
            estimatedSize += enhancedStreakData.length
          }
        } catch (e) {
          console.warn('Failed to parse enhanced streak data:', e)
        }
      }

      // Check for settings
      const settingsData = localStorage.getItem('puka-settings')
      if (settingsData) {
        try {
          const settings = JSON.parse(settingsData)
          if (settings && typeof settings === 'object') {
            hasSettings = true
            estimatedSize += settingsData.length
          }
        } catch (e) {
          console.warn('Failed to parse settings data:', e)
        }
      }

      // Return data if any local data exists
      if (booksCount > 0 || streaksCount > 0 || hasSettings) {
        const promptData: MigrationPromptData = {
          booksCount,
          streaksCount,
          hasSettings,
          estimatedSize,
          lastModified
        }
        setMigrationPromptData(promptData)
        return promptData
      }

      return null
    } catch (error) {
      console.error('Failed to check for local data:', error)
      return null
    }
  }, [])

  // Migration prompt management
  const dismissMigrationPrompt = useCallback(() => {
    setShowMigrationPrompt(false)
    setMigrationPromptDismissed(true)
    
    // Record dismissal in persistence service
    migrationPersistenceService.recordDismissal('dismiss')
    
    // Update local state
    const updatedState: MigrationState = {
      ...migrationState,
      skipCount: migrationState.skipCount + 1,
      lastAttempt: new Date()
    }
    setMigrationState(updatedState)
  }, [migrationState])

  const skipMigration = useCallback(() => {
    setShowMigrationPrompt(false)
    setMigrationPromptDismissed(true)
    
    // Record skip with 24 hour delay
    migrationPersistenceService.recordDismissal('skip', 24 * 60 * 60 * 1000)
    
    const newSkipCount = migrationState.skipCount + 1
    const updatedState: MigrationState = {
      ...migrationState,
      skipCount: newSkipCount,
      lastAttempt: new Date()
    }
    setMigrationState(updatedState)
  }, [migrationState])

  const resetMigrationState = useCallback(() => {
    // Reset persistence data
    migrationPersistenceService.enablePrompts()
    migrationPersistenceService.resetDismissalCount()
    
    // Reset local state
    const resetState: MigrationState = {
      status: 'none',
      skipCount: 0
    }
    setMigrationState(resetState)
    setShowMigrationPrompt(false)
    setMigrationPromptDismissed(false)
    setMigrationPromptData(null)
  }, [])

  // Check localStorage for migration state on load
  useEffect(() => {

    // Load migration state from persistence service
    try {
      const persistenceData = migrationPersistenceService.load()
      
      // Recover any active session
      const recoveredSession = migrationPersistenceService.recoverSession()
      if (recoveredSession) {
        setMigrationState({
          status: recoveredSession.status,
          lastAttempt: recoveredSession.startedAt,
          completedAt: recoveredSession.completedAt,
          errorMessage: recoveredSession.errors.join('; '),
          migrationId: recoveredSession.id,
          skipCount: persistenceData.userPreferences.dismissalCount
        })
      } else if (persistenceData.lastCompletedMigration) {
        // Migration was already completed
        setMigrationState({
          status: 'completed',
          completedAt: persistenceData.lastCompletedMigration,
          skipCount: persistenceData.userPreferences.dismissalCount
        })
      } else {
        // Load state from persistence data
        setMigrationState({
          status: 'none',
          skipCount: persistenceData.userPreferences.dismissalCount,
          lastAttempt: persistenceData.statistics.lastFailureDate
        })
      }

      // Check if migration prompts should be shown
      if (user) {
        const shouldPrompt = migrationPersistenceService.shouldPromptMigration(user.id)
        if (!shouldPrompt.shouldPrompt) {
          setMigrationPromptDismissed(true)
        }
      }
    } catch (e) {
      console.warn('Failed to load migration persistence data:', e)
    }
  }, [user])

  // Check for local data and show migration prompt logic
  useEffect(() => {
    if (!loading && user && !migrationPromptDismissed && migrationState.status === 'none') {
      // Check if we should prompt based on persistence service
      const shouldPrompt = migrationPersistenceService.shouldPromptMigration(user.id)
      
      if (shouldPrompt.shouldPrompt) {
        // Only check when user is authenticated and we haven't completed migration
        checkForLocalData().then(data => {
          if (data && (data.booksCount > 0 || data.streaksCount > 0 || data.hasSettings)) {
            // Update migration state to available
            const updatedState: MigrationState = {
              ...migrationState,
              status: 'available',
              migrationId: `migration_${Date.now()}`
            }
            setMigrationState(updatedState)
            
            // Show migration prompt after a brief delay
            setTimeout(() => {
              setShowMigrationPrompt(true)
            }, 1500)
          }
        }).catch(error => {
          console.error('Failed to check for local data:', error)
        })
      } else {
        // User shouldn't be prompted, dismiss immediately
        setMigrationPromptDismissed(true)
      }
    }
  }, [user, loading, migrationPromptDismissed, migrationState.status, checkForLocalData, migrationState])

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
    
    // Migration state and prompts
    migrationState,
    migrationPromptData,
    showMigrationPrompt,
    dismissMigrationPrompt,
    skipMigration,
    resetMigrationState,
    checkForLocalData,
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
    shouldPromptAuth: false, // Auth prompting removed as authentication is now required
    
    // Helper to check if sync is available
    syncAvailable: auth.canSync,
  }
}