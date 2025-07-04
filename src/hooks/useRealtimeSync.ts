import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth'
import { RealtimeSyncManager, SyncEvent, SyncConflict, ConflictResolutionStrategy } from '@/services/sync/RealtimeSyncManager'
import { createStorageService } from '@/services/storage'

export interface RealtimeSyncState {
  isActive: boolean
  inProgress: boolean
  conflicts: SyncConflict[]
  lastSyncTime: Date | null
  error: Error | null
}

export interface RealtimeSyncActions {
  start: () => Promise<void>
  stop: () => Promise<void>
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>
  setStrategy: (strategy: ConflictResolutionStrategy) => void
  clearError: () => void
}

/**
 * React hook for managing real-time sync with Supabase
 * Automatically starts/stops sync based on authentication status
 */
export function useRealtimeSync(): RealtimeSyncState & RealtimeSyncActions {
  const { isAuthenticated, canSync } = useAuth()
  const syncManagerRef = useRef<RealtimeSyncManager | null>(null)
  
  const [state, setState] = useState<RealtimeSyncState>({
    isActive: false,
    inProgress: false,
    conflicts: [],
    lastSyncTime: null,
    error: null
  })

  // Initialize sync manager
  useEffect(() => {
    if (!syncManagerRef.current) {
      const storageService = createStorageService()
      syncManagerRef.current = new RealtimeSyncManager(storageService)
    }
  }, [])

  // Set up event listeners
  useEffect(() => {
    const syncManager = syncManagerRef.current
    if (!syncManager) return

    const handleSyncEvent = (event: SyncEvent) => {
      setState(prevState => {
        switch (event.type) {
          case 'sync-start':
            return {
              ...prevState,
              isActive: true,
              error: null
            }

          case 'sync-complete':
            return {
              ...prevState,
              inProgress: false,
              lastSyncTime: new Date(),
              error: null
            }

          case 'sync-error':
            return {
              ...prevState,
              inProgress: false,
              error: event.error || null
            }

          case 'conflict-detected':
            return {
              ...prevState,
              conflicts: event.conflicts ? [...prevState.conflicts, ...event.conflicts] : prevState.conflicts
            }

          case 'data-updated':
            return {
              ...prevState,
              lastSyncTime: new Date()
            }

          default:
            return prevState
        }
      })
    }

    syncManager.addEventListener(handleSyncEvent)

    return () => {
      syncManager.removeEventListener(handleSyncEvent)
    }
  }, [])

  // Auto start/stop sync based on authentication
  useEffect(() => {
    const syncManager = syncManagerRef.current
    if (!syncManager) return

    if (isAuthenticated && canSync) {
      // Start sync when user is authenticated
      syncManager.startRealtimeSync().catch(error => {
        console.error('Failed to start real-time sync:', error)
        setState(prevState => ({
          ...prevState,
          error: error as Error
        }))
      })
    } else {
      // Stop sync when user is not authenticated
      syncManager.stopRealtimeSync().catch(error => {
        console.error('Failed to stop real-time sync:', error)
      })
      
      setState(prevState => ({
        ...prevState,
        isActive: false,
        inProgress: false
      }))
    }
  }, [isAuthenticated, canSync])

  // Actions
  const start = useCallback(async () => {
    const syncManager = syncManagerRef.current
    if (!syncManager) {
      throw new Error('Sync manager not initialized')
    }

    try {
      await syncManager.startRealtimeSync()
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        error: error as Error
      }))
      throw error
    }
  }, [])

  const stop = useCallback(async () => {
    const syncManager = syncManagerRef.current
    if (!syncManager) {
      throw new Error('Sync manager not initialized')
    }

    try {
      await syncManager.stopRealtimeSync()
      setState(prevState => ({
        ...prevState,
        isActive: false,
        inProgress: false
      }))
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        error: error as Error
      }))
      throw error
    }
  }, [])

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote') => {
    const syncManager = syncManagerRef.current
    if (!syncManager) {
      throw new Error('Sync manager not initialized')
    }

    try {
      await syncManager.resolveConflictManually(conflictId, resolution)
      
      // Remove resolved conflict from state
      setState(prevState => ({
        ...prevState,
        conflicts: prevState.conflicts.filter(c => c.id !== conflictId)
      }))
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        error: error as Error
      }))
      throw error
    }
  }, [])

  const setStrategy = useCallback((strategy: ConflictResolutionStrategy) => {
    const syncManager = syncManagerRef.current
    if (!syncManager) {
      throw new Error('Sync manager not initialized')
    }

    syncManager.setConflictResolutionStrategy(strategy)
  }, [])

  const clearError = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      error: null
    }))
  }, [])

  return {
    ...state,
    start,
    stop,
    resolveConflict,
    setStrategy,
    clearError
  }
}

/**
 * Hook for getting sync status without actions
 * Useful for components that only need to display sync status
 */
export function useSyncStatus() {
  const { isActive, inProgress, conflicts, lastSyncTime, error } = useRealtimeSync()
  
  return {
    isActive,
    inProgress,
    conflictsCount: conflicts.length,
    lastSyncTime,
    hasError: !!error,
    error
  }
}