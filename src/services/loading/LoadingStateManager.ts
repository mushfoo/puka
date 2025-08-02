import { LoadingState } from '../../types/error'

export class LoadingStateManager {
  private loadingStates: Map<string, LoadingState> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private listeners: Set<(states: Record<string, LoadingState>) => void> =
    new Set()

  /**
   * Set a loading state for a specific key
   */
  setLoading(key: string, message?: string): void {
    const loadingState: LoadingState = {
      isLoading: true,
      message,
      startTime: Date.now(),
    }

    this.loadingStates.set(key, loadingState)
    this.notifyListeners()
  }

  /**
   * Clear a loading state
   */
  clearLoading(key: string): void {
    this.loadingStates.delete(key)

    // Clear any associated timeout
    const timeout = this.timeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(key)
    }

    this.notifyListeners()
  }

  /**
   * Set progress for a loading state
   */
  setProgress(key: string, progress: number): void {
    const existingState = this.loadingStates.get(key)
    if (existingState) {
      this.loadingStates.set(key, {
        ...existingState,
        progress: Math.max(0, Math.min(100, progress)),
      })
      this.notifyListeners()
    }
  }

  /**
   * Set a timeout for a loading state with fallback action
   */
  setTimeout(key: string, timeoutMs: number, fallback: () => void): void {
    // Clear existing timeout if any
    const existingTimeout = this.timeouts.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      const loadingState = this.loadingStates.get(key)
      if (loadingState) {
        // Execute fallback action
        fallback()

        // Clear the loading state
        this.clearLoading(key)
      }
    }, timeoutMs)

    this.timeouts.set(key, timeout)

    // Update the loading state with timeout info
    const existingState = this.loadingStates.get(key)
    if (existingState) {
      this.loadingStates.set(key, {
        ...existingState,
        timeout: timeoutMs,
      })
      this.notifyListeners()
    }
  }

  /**
   * Get a specific loading state
   */
  getLoadingState(key: string): LoadingState | undefined {
    return this.loadingStates.get(key)
  }

  /**
   * Get all loading states
   */
  getAllLoadingStates(): Record<string, LoadingState> {
    const states: Record<string, LoadingState> = {}
    this.loadingStates.forEach((state, key) => {
      states[key] = state
    })
    return states
  }

  /**
   * Check if any loading state is active
   */
  isAnyLoading(): boolean {
    return this.loadingStates.size > 0
  }

  /**
   * Check if a specific key is loading
   */
  isLoading(key: string): boolean {
    return this.loadingStates.has(key)
  }

  /**
   * Get loading duration for a specific key
   */
  getLoadingDuration(key: string): number {
    const state = this.loadingStates.get(key)
    return state ? Date.now() - state.startTime : 0
  }

  /**
   * Clear all loading states
   */
  clearAll(): void {
    // Clear all timeouts
    this.timeouts.forEach((timeout) => clearTimeout(timeout))
    this.timeouts.clear()

    // Clear all loading states
    this.loadingStates.clear()
    this.notifyListeners()
  }

  /**
   * Subscribe to loading state changes
   */
  subscribe(
    listener: (states: Record<string, LoadingState>) => void
  ): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Set loading with automatic timeout
   */
  setLoadingWithTimeout(
    key: string,
    message: string,
    timeoutMs: number = 10000,
    fallbackMessage: string = 'Operation is taking longer than expected'
  ): void {
    this.setLoading(key, message)

    this.setTimeout(key, timeoutMs, () => {
      // Show fallback message and provide recovery options
      this.setLoading(key, fallbackMessage)

      // Auto-clear after additional timeout
      setTimeout(() => {
        this.clearLoading(key)
      }, 5000)
    })
  }

  /**
   * Set loading for authentication operations
   */
  setAuthLoading(operation: 'signin' | 'signup' | 'signout' = 'signin'): void {
    const messages = {
      signin: 'Signing you in...',
      signup: 'Creating your account...',
      signout: 'Signing you out...',
    }

    this.setLoadingWithTimeout(
      'auth',
      messages[operation],
      8000,
      'Authentication is taking longer than expected. You can try refreshing the page or use offline mode.'
    )
  }

  /**
   * Set loading for storage operations
   */
  setStorageLoading(operation: string): void {
    this.setLoadingWithTimeout(
      'storage',
      `${operation}...`,
      5000,
      'Storage operation is taking longer than expected.'
    )
  }

  /**
   * Set loading for network operations
   */
  setNetworkLoading(operation: string): void {
    this.setLoadingWithTimeout(
      'network',
      `${operation}...`,
      10000,
      'Network request is taking longer than expected. Check your connection.'
    )
  }

  private notifyListeners(): void {
    const states = this.getAllLoadingStates()
    this.listeners.forEach((listener) => listener(states))
  }
}

// Singleton instance
export const loadingStateManager = new LoadingStateManager()
