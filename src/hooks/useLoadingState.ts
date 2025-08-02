import { useState, useEffect } from 'react'
import { loadingStateManager } from '../services/loading'
import { LoadingState } from '../types/error'

/**
 * Hook to manage and subscribe to loading states
 */
export function useLoadingState() {
  const [loadingStates, setLoadingStates] = useState<
    Record<string, LoadingState>
  >({})

  useEffect(() => {
    // Subscribe to loading state changes
    const unsubscribe = loadingStateManager.subscribe(setLoadingStates)

    // Get initial state
    setLoadingStates(loadingStateManager.getAllLoadingStates())

    return unsubscribe
  }, [])

  return {
    loadingStates,
    isLoading: (key: string) => loadingStateManager.isLoading(key),
    isAnyLoading: () => loadingStateManager.isAnyLoading(),
    setLoading: (key: string, message?: string) =>
      loadingStateManager.setLoading(key, message),
    clearLoading: (key: string) => loadingStateManager.clearLoading(key),
    setProgress: (key: string, progress: number) =>
      loadingStateManager.setProgress(key, progress),
    setLoadingWithTimeout: (
      key: string,
      message: string,
      timeout?: number,
      fallback?: string
    ) =>
      loadingStateManager.setLoadingWithTimeout(
        key,
        message,
        timeout,
        fallback
      ),
    setAuthLoading: (operation?: 'signin' | 'signup' | 'signout') =>
      loadingStateManager.setAuthLoading(operation),
    setStorageLoading: (operation: string) =>
      loadingStateManager.setStorageLoading(operation),
    setNetworkLoading: (operation: string) =>
      loadingStateManager.setNetworkLoading(operation),
  }
}

/**
 * Hook to get a specific loading state
 */
export function useSpecificLoadingState(key: string) {
  const { loadingStates, isLoading, setLoading, clearLoading, setProgress } =
    useLoadingState()

  return {
    loadingState: loadingStates[key],
    isLoading: isLoading(key),
    setLoading: (message?: string) => setLoading(key, message),
    clearLoading: () => clearLoading(key),
    setProgress: (progress: number) => setProgress(key, progress),
  }
}
