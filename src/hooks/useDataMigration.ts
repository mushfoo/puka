import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/components/auth'
import { 
  DataMigrationService, 
  MigrationProgress, 
  MigrationResult, 
  MigrationOptions 
} from '@/services/migration/DataMigrationService'
import { FileSystemStorageService } from '@/services/storage/FileSystemStorageService'
import { SupabaseStorageService } from '@/services/storage/SupabaseStorageService'

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
 * React hook for managing data migration from local to cloud storage
 */
export function useDataMigration(): MigrationState & MigrationActions {
  const { isAuthenticated, canSync } = useAuth()
  const migrationServiceRef = useRef<DataMigrationService | null>(null)
  
  const [state, setState] = useState<MigrationState>({
    isAvailable: false,
    inProgress: false,
    progress: null,
    result: null,
    error: null,
    lastMigration: null
  })

  // Initialize migration service when needed
  const getMigrationService = useCallback(() => {
    if (!migrationServiceRef.current && isAuthenticated) {
      const localService = new FileSystemStorageService()
      const cloudService = new SupabaseStorageService()
      migrationServiceRef.current = new DataMigrationService(localService, cloudService)
    }
    return migrationServiceRef.current
  }, [isAuthenticated])

  // Check if migration is available
  const checkMigrationAvailability = useCallback(async () => {
    if (!isAuthenticated || !canSync) {
      setState(prev => ({ ...prev, isAvailable: false }))
      return
    }

    try {
      const localService = new FileSystemStorageService()
      await localService.initialize()
      
      const localBooks = await localService.getBooks()
      const hasLocalData = localBooks.length > 0
      
      setState(prev => ({ 
        ...prev, 
        isAvailable: hasLocalData 
      }))
    } catch (error) {
      console.error('Failed to check migration availability:', error)
      setState(prev => ({ 
        ...prev, 
        isAvailable: false,
        error: `Failed to check migration availability: ${error}`
      }))
    }
  }, [isAuthenticated, canSync])

  // Check availability when auth state changes
  useEffect(() => {
    checkMigrationAvailability()
  }, [checkMigrationAvailability])

  // Start migration
  const startMigration = useCallback(async (options: MigrationOptions = {}): Promise<MigrationResult> => {
    const migrationService = getMigrationService()
    if (!migrationService) {
      throw new Error('Migration service not available')
    }

    setState(prev => ({
      ...prev,
      inProgress: true,
      progress: null,
      result: null,
      error: null
    }))

    try {
      const result = await migrationService.migrateToCloud(
        options,
        (progress) => {
          setState(prev => ({
            ...prev,
            progress
          }))
        }
      )

      setState(prev => ({
        ...prev,
        inProgress: false,
        result,
        lastMigration: new Date(),
        isAvailable: !result.success // Only available if migration failed
      }))

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        inProgress: false,
        error: errorMessage
      }))
      throw error
    }
  }, [getMigrationService])

  // Cancel migration (not implemented in service yet)
  const cancelMigration = useCallback(() => {
    setState(prev => ({
      ...prev,
      inProgress: false,
      progress: null
    }))
  }, [])

  // Create backup
  const createBackup = useCallback(async (): Promise<string> => {
    const migrationService = getMigrationService()
    if (!migrationService) {
      throw new Error('Migration service not available')
    }

    try {
      return await migrationService.createBackup()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      throw error
    }
  }, [getMigrationService])

  // Estimate migration
  const estimateMigration = useCallback(async () => {
    const migrationService = getMigrationService()
    if (!migrationService) {
      throw new Error('Migration service not available')
    }

    try {
      return await migrationService.estimateMigration()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      throw error
    }
  }, [getMigrationService])

  // Verify migration
  const verifyMigration = useCallback(async () => {
    const migrationService = getMigrationService()
    if (!migrationService) {
      throw new Error('Migration service not available')
    }

    try {
      return await migrationService.verifyMigration()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      throw error
    }
  }, [getMigrationService])

  // Clear result
  const clearResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      progress: null
    }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
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
 */
export function useMigrationStatus() {
  const { isAvailable, inProgress, result, error } = useDataMigration()
  
  return {
    isAvailable,
    inProgress,
    hasResult: !!result,
    hasError: !!error,
    isSuccess: result?.success ?? false,
    error
  }
}