import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LoadingStateManager } from '../LoadingStateManager'

describe('LoadingStateManager', () => {
  let loadingManager: LoadingStateManager

  beforeEach(() => {
    loadingManager = new LoadingStateManager()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    loadingManager.clearAll()
  })

  describe('basic loading state management', () => {
    it('should set and clear loading states', () => {
      expect(loadingManager.isLoading('test')).toBe(false)

      loadingManager.setLoading('test', 'Loading test...')
      expect(loadingManager.isLoading('test')).toBe(true)

      const state = loadingManager.getLoadingState('test')
      expect(state).toBeDefined()
      expect(state?.isLoading).toBe(true)
      expect(state?.message).toBe('Loading test...')

      loadingManager.clearLoading('test')
      expect(loadingManager.isLoading('test')).toBe(false)
    })

    it('should track multiple loading states', () => {
      loadingManager.setLoading('auth', 'Signing in...')
      loadingManager.setLoading('data', 'Loading data...')

      expect(loadingManager.isLoading('auth')).toBe(true)
      expect(loadingManager.isLoading('data')).toBe(true)
      expect(loadingManager.isAnyLoading()).toBe(true)

      const allStates = loadingManager.getAllLoadingStates()
      expect(Object.keys(allStates)).toHaveLength(2)
      expect(allStates.auth.message).toBe('Signing in...')
      expect(allStates.data.message).toBe('Loading data...')
    })

    it('should clear all loading states', () => {
      loadingManager.setLoading('test1', 'Loading 1...')
      loadingManager.setLoading('test2', 'Loading 2...')

      expect(loadingManager.isAnyLoading()).toBe(true)

      loadingManager.clearAll()

      expect(loadingManager.isAnyLoading()).toBe(false)
      expect(Object.keys(loadingManager.getAllLoadingStates())).toHaveLength(0)
    })
  })

  describe('progress tracking', () => {
    it('should set and update progress', () => {
      loadingManager.setLoading('upload', 'Uploading...')

      loadingManager.setProgress('upload', 25)
      let state = loadingManager.getLoadingState('upload')
      expect(state?.progress).toBe(25)

      loadingManager.setProgress('upload', 75)
      state = loadingManager.getLoadingState('upload')
      expect(state?.progress).toBe(75)
    })

    it('should clamp progress values', () => {
      loadingManager.setLoading('test', 'Testing...')

      loadingManager.setProgress('test', -10)
      let state = loadingManager.getLoadingState('test')
      expect(state?.progress).toBe(0)

      loadingManager.setProgress('test', 150)
      state = loadingManager.getLoadingState('test')
      expect(state?.progress).toBe(100)
    })

    it('should ignore progress for non-existent loading states', () => {
      loadingManager.setProgress('non-existent', 50)
      expect(loadingManager.getLoadingState('non-existent')).toBeUndefined()
    })
  })

  describe('timeout handling', () => {
    it('should execute fallback after timeout', () => {
      const fallbackFn = vi.fn()

      loadingManager.setLoading('test', 'Loading...')
      loadingManager.setTimeout('test', 1000, fallbackFn)

      expect(fallbackFn).not.toHaveBeenCalled()
      expect(loadingManager.isLoading('test')).toBe(true)

      vi.advanceTimersByTime(1000)

      expect(fallbackFn).toHaveBeenCalled()
      expect(loadingManager.isLoading('test')).toBe(false)
    })

    it('should clear timeout when loading is cleared manually', () => {
      const fallbackFn = vi.fn()

      loadingManager.setLoading('test', 'Loading...')
      loadingManager.setTimeout('test', 1000, fallbackFn)

      loadingManager.clearLoading('test')

      vi.advanceTimersByTime(1000)

      expect(fallbackFn).not.toHaveBeenCalled()
    })

    it('should handle multiple timeouts', () => {
      const fallback1 = vi.fn()
      const fallback2 = vi.fn()

      loadingManager.setLoading('test1', 'Loading 1...')
      loadingManager.setTimeout('test1', 500, fallback1)

      loadingManager.setLoading('test2', 'Loading 2...')
      loadingManager.setTimeout('test2', 1000, fallback2)

      vi.advanceTimersByTime(500)
      expect(fallback1).toHaveBeenCalled()
      expect(fallback2).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(fallback2).toHaveBeenCalled()
    })
  })

  describe('specialized loading methods', () => {
    it('should set auth loading with timeout', () => {
      loadingManager.setAuthLoading('signin')

      expect(loadingManager.isLoading('auth')).toBe(true)
      const state = loadingManager.getLoadingState('auth')
      expect(state?.message).toBe('Signing you in...')
    })

    it('should set storage loading', () => {
      loadingManager.setStorageLoading('Saving book')

      expect(loadingManager.isLoading('storage')).toBe(true)
      const state = loadingManager.getLoadingState('storage')
      expect(state?.message).toBe('Saving book...')
    })

    it('should set network loading', () => {
      loadingManager.setNetworkLoading('Fetching data')

      expect(loadingManager.isLoading('network')).toBe(true)
      const state = loadingManager.getLoadingState('network')
      expect(state?.message).toBe('Fetching data...')
    })
  })

  describe('loading with timeout', () => {
    it('should set loading with automatic timeout and fallback', () => {
      const fallbackMessage = 'Taking longer than expected...'

      loadingManager.setLoadingWithTimeout(
        'test',
        'Loading...',
        1000,
        fallbackMessage
      )

      expect(loadingManager.isLoading('test')).toBe(true)
      let state = loadingManager.getLoadingState('test')
      expect(state?.message).toBe('Loading...')

      vi.advanceTimersByTime(1000)

      expect(loadingManager.isLoading('test')).toBe(true)
      state = loadingManager.getLoadingState('test')
      expect(state?.message).toBe(fallbackMessage)

      // Should auto-clear after additional timeout
      vi.advanceTimersByTime(5000)
      expect(loadingManager.isLoading('test')).toBe(false)
    })
  })

  describe('loading duration', () => {
    it('should track loading duration', () => {
      const startTime = Date.now()
      vi.setSystemTime(startTime)

      loadingManager.setLoading('test', 'Loading...')

      vi.advanceTimersByTime(2000)

      const duration = loadingManager.getLoadingDuration('test')
      expect(duration).toBe(2000)
    })

    it('should return 0 for non-existent loading states', () => {
      const duration = loadingManager.getLoadingDuration('non-existent')
      expect(duration).toBe(0)
    })
  })

  describe('subscription', () => {
    it('should notify listeners when loading states change', () => {
      const listener = vi.fn()
      const unsubscribe = loadingManager.subscribe(listener)

      loadingManager.setLoading('test', 'Loading...')
      expect(listener).toHaveBeenCalledWith({ test: expect.any(Object) })

      loadingManager.clearLoading('test')
      expect(listener).toHaveBeenCalledWith({})

      unsubscribe()
      loadingManager.setLoading('test', 'Loading...')
      expect(listener).toHaveBeenCalledTimes(2) // Should not be called again
    })
  })

  describe('memory management', () => {
    it('should clean up timeouts when clearing all', () => {
      const fallback1 = vi.fn()
      const fallback2 = vi.fn()

      loadingManager.setLoading('test1', 'Loading 1...')
      loadingManager.setTimeout('test1', 1000, fallback1)

      loadingManager.setLoading('test2', 'Loading 2...')
      loadingManager.setTimeout('test2', 1000, fallback2)

      loadingManager.clearAll()

      vi.advanceTimersByTime(1000)

      expect(fallback1).not.toHaveBeenCalled()
      expect(fallback2).not.toHaveBeenCalled()
    })

    it('should replace existing timeout when setting new one', () => {
      const fallback1 = vi.fn()
      const fallback2 = vi.fn()

      loadingManager.setLoading('test', 'Loading...')
      loadingManager.setTimeout('test', 500, fallback1)
      loadingManager.setTimeout('test', 1000, fallback2)

      vi.advanceTimersByTime(500)
      expect(fallback1).not.toHaveBeenCalled()
      expect(fallback2).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(fallback1).not.toHaveBeenCalled()
      expect(fallback2).toHaveBeenCalled()
    })
  })
})
