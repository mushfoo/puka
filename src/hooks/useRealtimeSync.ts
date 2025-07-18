import { useState, useCallback } from 'react'

export interface RealtimeSyncState {
  isActive: boolean
  inProgress: boolean
  conflicts: never[]
  lastSyncTime: Date | null
  error: Error | null
}

export interface RealtimeSyncActions {
  start: () => Promise<void>
  stop: () => Promise<void>
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => Promise<void>
  setStrategy: (strategy: 'local' | 'remote' | 'manual') => void
  clearError: () => void
}

/**
 * Simplified hook that no longer provides real-time sync functionality.
 * Real-time sync has been removed with Supabase integration.
 */
export function useRealtimeSync(): RealtimeSyncState & RealtimeSyncActions {
  const [state] = useState<RealtimeSyncState>({
    isActive: false,
    inProgress: false,
    conflicts: [],
    lastSyncTime: null,
    error: null
  })

  // No-op actions since sync is no longer available
  const start = useCallback(async () => {
    console.warn('Real-time sync is no longer available')
  }, [])

  const stop = useCallback(async () => {
    console.warn('Real-time sync is no longer available')
  }, [])

  const resolveConflict = useCallback(async (_conflictId: string, _resolution: 'local' | 'remote') => {
    console.warn('Conflict resolution is no longer available')
  }, [])

  const setStrategy = useCallback((_strategy: 'local' | 'remote' | 'manual') => {
    console.warn('Sync strategy setting is no longer available')
  }, [])

  const clearError = useCallback(() => {
    console.warn('Error clearing is no longer needed')
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
 * Now always returns inactive status since sync is disabled
 */
export function useSyncStatus() {
  return {
    isActive: false,
    inProgress: false,
    conflictsCount: 0,
    lastSyncTime: null,
    hasError: false,
    error: null
  }
}