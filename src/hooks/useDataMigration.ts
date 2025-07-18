import { useState, useCallback } from 'react'

export interface MigrationProgress {
  phase: 'preparing' | 'books' | 'settings' | 'streaks' | 'cleanup' | 'complete' | 'error'
  totalItems: number
  completedItems: number
  currentItem?: string
  message: string
  percentage: number
}

export interface MigrationResult {
  success: boolean
  booksImported: number
  settingsImported: boolean
  streaksImported: boolean
  errors: string[]
  skipped: number
  duplicates: number
  duration: number
}

export interface MigrationOptions {
  skipDuplicates?: boolean
  overwriteExisting?: boolean
  preserveLocalData?: boolean
  batchSize?: number
}

export interface MigrationState {
  isAvailable: boolean
  inProgress: boolean
  progress: MigrationProgress | null
  result: MigrationResult | null
  error: string | null
  lastMigration: Date | null
}

export interface MigrationActions {
  startMigration: (options?: MigrationOptions) => Promise<MigrationResult>
  cancelMigration: () => void
  createBackup: () => Promise<string>
  estimateMigration: () => Promise<{ totalBooks: number; estimatedDuration: number; estimatedSize: number }>
  verifyMigration: () => Promise<{ success: boolean; localBooks: number; cloudBooks: number; missingBooks: string[]; extraBooks: string[] }>
  clearResult: () => void
  clearError: () => void
}

/**
 * Simplified hook that no longer provides migration functionality.
 * Data migration has been removed as part of migrating to Better-auth.
 */
export function useDataMigration(): MigrationState & MigrationActions {
  const [state] = useState<MigrationState>({
    isAvailable: false,
    inProgress: false,
    progress: null,
    result: null,
    error: null,
    lastMigration: null
  })

  // No-op actions since migration is no longer available
  const startMigration = useCallback(async (_options?: MigrationOptions): Promise<MigrationResult> => {
    console.warn('Data migration is no longer available')
    return {
      success: false,
      booksImported: 0,
      settingsImported: false,
      streaksImported: false,
      errors: ['Migration is no longer available'],
      skipped: 0,
      duplicates: 0,
      duration: 0
    }
  }, [])

  const cancelMigration = useCallback(() => {
    console.warn('Migration cancellation is no longer available')
  }, [])

  const createBackup = useCallback(async (): Promise<string> => {
    console.warn('Migration backup is no longer available')
    return ''
  }, [])

  const estimateMigration = useCallback(async () => {
    console.warn('Migration estimation is no longer available')
    return {
      totalBooks: 0,
      estimatedDuration: 0,
      estimatedSize: 0
    }
  }, [])

  const verifyMigration = useCallback(async () => {
    console.warn('Migration verification is no longer available')
    return {
      success: false,
      localBooks: 0,
      cloudBooks: 0,
      missingBooks: [],
      extraBooks: []
    }
  }, [])

  const clearResult = useCallback(() => {
    console.warn('Migration result clearing is no longer needed')
  }, [])

  const clearError = useCallback(() => {
    console.warn('Migration error clearing is no longer needed')
  }, [])

  return {
    ...state,
    startMigration,
    cancelMigration,
    createBackup,
    estimateMigration,
    verifyMigration,
    clearResult,
    clearError
  }
}

/**
 * Hook for simple migration status checking
 * Now always returns unavailable status since migration is disabled
 */
export function useMigrationStatus() {
  return {
    isAvailable: false,
    inProgress: false,
    hasResult: false,
    hasError: false,
    isSuccess: false,
    error: null
  }
}