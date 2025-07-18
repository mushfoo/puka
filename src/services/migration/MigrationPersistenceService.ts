import { MigrationState } from '@/contexts/AuthContext'

export interface MigrationSession {
  id: string
  userId: string
  startedAt: Date
  completedAt?: Date
  status: MigrationState['status']
  phase?: string
  progress?: number
  booksProcessed?: number
  streaksProcessed?: number
  settingsProcessed?: boolean
  errors: string[]
  metadata: {
    totalBooks: number
    totalStreaks: number
    hasSettings: boolean
    estimatedSize: number
    userAgent: string
    startedFromPrompt: boolean
  }
}

export interface MigrationPersistenceData {
  sessions: MigrationSession[]
  currentSession?: MigrationSession
  lastCompletedMigration?: Date
  userPreferences: {
    skipPrompts: boolean
    skipUntil?: Date
    dismissalCount: number
    autoExportBeforeMigration: boolean
  }
  statistics: {
    totalAttempts: number
    successfulMigrations: number
    failedMigrations: number
    averageDuration?: number
    lastSuccessDate?: Date
    lastFailureDate?: Date
  }
}

class MigrationPersistenceService {
  private readonly STORAGE_KEY = 'puka_migration_persistence'
  private readonly SESSION_STORAGE_KEY = 'puka_migration_session'
  private readonly MAX_SESSIONS = 10 // Keep last 10 sessions for analysis

  /**
   * Load migration persistence data from localStorage
   */
  load(): MigrationPersistenceData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return this.getDefaultData()
      }

      const data = JSON.parse(stored)
      
      // Convert date strings back to Date objects
      if (data.sessions) {
        data.sessions = data.sessions.map((session: any) => ({
          ...session,
          startedAt: new Date(session.startedAt),
          completedAt: session.completedAt ? new Date(session.completedAt) : undefined
        }))
      }

      if (data.currentSession) {
        data.currentSession.startedAt = new Date(data.currentSession.startedAt)
        if (data.currentSession.completedAt) {
          data.currentSession.completedAt = new Date(data.currentSession.completedAt)
        }
      }

      if (data.lastCompletedMigration) {
        data.lastCompletedMigration = new Date(data.lastCompletedMigration)
      }

      if (data.userPreferences?.skipUntil) {
        data.userPreferences.skipUntil = new Date(data.userPreferences.skipUntil)
      }

      if (data.statistics?.lastSuccessDate) {
        data.statistics.lastSuccessDate = new Date(data.statistics.lastSuccessDate)
      }

      if (data.statistics?.lastFailureDate) {
        data.statistics.lastFailureDate = new Date(data.statistics.lastFailureDate)
      }

      // Merge with defaults to ensure all fields exist
      return { ...this.getDefaultData(), ...data }
    } catch (error) {
      console.error('Failed to load migration persistence data:', error)
      return this.getDefaultData()
    }
  }

  /**
   * Save migration persistence data to localStorage
   */
  save(data: MigrationPersistenceData): void {
    try {
      // Limit the number of stored sessions
      if (data.sessions.length > this.MAX_SESSIONS) {
        data.sessions = data.sessions
          .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
          .slice(0, this.MAX_SESSIONS)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save migration persistence data:', error)
    }
  }

  /**
   * Start a new migration session
   */
  startSession(userId: string, metadata: MigrationSession['metadata']): MigrationSession {
    const data = this.load()
    
    const session: MigrationSession = {
      id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startedAt: new Date(),
      status: 'in_progress',
      errors: [],
      metadata
    }

    data.currentSession = session
    data.statistics.totalAttempts++
    
    this.save(data)
    
    // Also save to sessionStorage for recovery on page reload
    sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session))
    
    return session
  }

  /**
   * Update the current migration session
   */
  updateSession(updates: Partial<MigrationSession>): MigrationSession | null {
    const data = this.load()
    
    if (!data.currentSession) {
      console.warn('No current migration session to update')
      return null
    }

    data.currentSession = { ...data.currentSession, ...updates }
    
    this.save(data)
    sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(data.currentSession))
    
    return data.currentSession
  }

  /**
   * Complete the current migration session
   */
  completeSession(status: 'completed' | 'failed', finalData?: Partial<MigrationSession>): void {
    const data = this.load()
    
    if (!data.currentSession) {
      console.warn('No current migration session to complete')
      return
    }

    const completedSession: MigrationSession = {
      ...data.currentSession,
      ...finalData,
      status,
      completedAt: new Date()
    }

    // Add to sessions history
    data.sessions.unshift(completedSession)
    
    // Update statistics
    if (status === 'completed') {
      data.statistics.successfulMigrations++
      data.statistics.lastSuccessDate = new Date()
      data.lastCompletedMigration = new Date()
    } else {
      data.statistics.failedMigrations++
      data.statistics.lastFailureDate = new Date()
    }

    // Calculate average duration
    const completedSessions = data.sessions.filter(s => s.completedAt)
    if (completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((sum, session) => {
        const duration = session.completedAt!.getTime() - session.startedAt.getTime()
        return sum + duration
      }, 0)
      data.statistics.averageDuration = totalDuration / completedSessions.length
    }

    // Clear current session
    data.currentSession = undefined
    
    this.save(data)
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY)
  }

  /**
   * Recover an active session from sessionStorage (useful after page reload)
   */
  recoverSession(): MigrationSession | null {
    try {
      const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY)
      if (!stored) return null

      const session = JSON.parse(stored)
      session.startedAt = new Date(session.startedAt)
      if (session.completedAt) {
        session.completedAt = new Date(session.completedAt)
      }

      return session
    } catch (error) {
      console.error('Failed to recover migration session:', error)
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY)
      return null
    }
  }

  /**
   * Check if migration should be prompted based on user preferences and history
   */
  shouldPromptMigration(userId: string): {
    shouldPrompt: boolean
    reason?: string
    canPromptAgainAt?: Date
  } {
    const data = this.load()
    
    // Check if user has permanently disabled prompts
    if (data.userPreferences.skipPrompts) {
      return {
        shouldPrompt: false,
        reason: 'User has disabled migration prompts'
      }
    }

    // Check if user has temporarily disabled prompts
    if (data.userPreferences.skipUntil && data.userPreferences.skipUntil > new Date()) {
      return {
        shouldPrompt: false,
        reason: 'User has temporarily disabled prompts',
        canPromptAgainAt: data.userPreferences.skipUntil
      }
    }

    // Check if migration was already completed
    if (data.lastCompletedMigration) {
      return {
        shouldPrompt: false,
        reason: 'Migration already completed'
      }
    }

    // Check if there's an active session
    if (data.currentSession && data.currentSession.status === 'in_progress') {
      return {
        shouldPrompt: false,
        reason: 'Migration is currently in progress'
      }
    }

    // Check dismissal frequency - if dismissed too many times recently, wait longer
    if (data.userPreferences.dismissalCount >= 5) {
      const lastFailure = data.statistics.lastFailureDate
      if (lastFailure) {
        const daysSinceLastFailure = (Date.now() - lastFailure.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLastFailure < 7) {
          const canPromptAgainAt = new Date(lastFailure.getTime() + 7 * 24 * 60 * 60 * 1000)
          return {
            shouldPrompt: false,
            reason: 'Too many recent dismissals',
            canPromptAgainAt
          }
        }
      }
    }

    return { shouldPrompt: true }
  }

  /**
   * Record a prompt dismissal
   */
  recordDismissal(reason: 'skip' | 'dismiss' | 'later', duration?: number): void {
    const data = this.load()
    
    data.userPreferences.dismissalCount++
    
    if (reason === 'skip' && duration) {
      data.userPreferences.skipUntil = new Date(Date.now() + duration)
    }
    
    this.save(data)
  }

  /**
   * Reset dismissal count (call after successful migration or explicit user action)
   */
  resetDismissalCount(): void {
    const data = this.load()
    data.userPreferences.dismissalCount = 0
    data.userPreferences.skipUntil = undefined
    this.save(data)
  }

  /**
   * Set user preference for automatic export before migration
   */
  setAutoExportPreference(enabled: boolean): void {
    const data = this.load()
    data.userPreferences.autoExportBeforeMigration = enabled
    this.save(data)
  }

  /**
   * Permanently disable migration prompts
   */
  disablePrompts(): void {
    const data = this.load()
    data.userPreferences.skipPrompts = true
    this.save(data)
  }

  /**
   * Re-enable migration prompts
   */
  enablePrompts(): void {
    const data = this.load()
    data.userPreferences.skipPrompts = false
    data.userPreferences.skipUntil = undefined
    data.userPreferences.dismissalCount = 0
    this.save(data)
  }

  /**
   * Get migration statistics
   */
  getStatistics(): MigrationPersistenceData['statistics'] {
    const data = this.load()
    return data.statistics
  }

  /**
   * Get migration history
   */
  getHistory(): MigrationSession[] {
    const data = this.load()
    return data.sessions
  }

  /**
   * Clear all migration data (for testing or user request)
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY)
  }

  /**
   * Export migration data for debugging
   */
  exportData(): string {
    const data = this.load()
    return JSON.stringify(data, null, 2)
  }

  /**
   * Get default persistence data structure
   */
  private getDefaultData(): MigrationPersistenceData {
    return {
      sessions: [],
      userPreferences: {
        skipPrompts: false,
        dismissalCount: 0,
        autoExportBeforeMigration: false
      },
      statistics: {
        totalAttempts: 0,
        successfulMigrations: 0,
        failedMigrations: 0
      }
    }
  }
}

// Export singleton instance
export const migrationPersistenceService = new MigrationPersistenceService()
export default migrationPersistenceService