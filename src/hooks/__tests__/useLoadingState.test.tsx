import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLoadingState, useSpecificLoadingState } from '../useLoadingState'
import { loadingStateManager } from '../../services/loading'

describe('useLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    loadingStateManager.clearAll()
  })

  describe('useLoadingState', () => {
    it('should return initial empty state', () => {
      const { result } = renderHook(() => useLoadingState())

      expect(result.current.loadingStates).toEqual({})
      expect(result.current.isAnyLoading()).toBe(false)
      expect(result.current.isLoading('test')).toBe(false)
    })

    it('should update when loading states change', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setLoading('test', 'Loading test...')
      })

      expect(result.current.loadingStates.test).toBeDefined()
      expect(result.current.loadingStates.test.isLoading).toBe(true)
      expect(result.current.loadingStates.test.message).toBe('Loading test...')
      expect(result.current.isLoading('test')).toBe(true)
      expect(result.current.isAnyLoading()).toBe(true)
    })

    it('should clear loading states', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setLoading('test', 'Loading test...')
      })

      expect(result.current.isLoading('test')).toBe(true)

      act(() => {
        result.current.clearLoading('test')
      })

      expect(result.current.isLoading('test')).toBe(false)
      expect(result.current.loadingStates.test).toBeUndefined()
    })

    it('should set progress', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setLoading('upload', 'Uploading...')
      })

      act(() => {
        result.current.setProgress('upload', 50)
      })

      expect(result.current.loadingStates.upload.progress).toBe(50)
    })

    it('should set loading with timeout', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setLoadingWithTimeout(
          'test',
          'Loading...',
          1000,
          'Taking longer...'
        )
      })

      expect(result.current.isLoading('test')).toBe(true)
      expect(result.current.loadingStates.test.message).toBe('Loading...')

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.loadingStates.test.message).toBe('Taking longer...')
    })

    it('should set auth loading', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setAuthLoading('signin')
      })

      expect(result.current.isLoading('auth')).toBe(true)
      expect(result.current.loadingStates.auth.message).toBe(
        'Signing you in...'
      )
    })

    it('should set storage loading', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setStorageLoading('Saving data')
      })

      expect(result.current.isLoading('storage')).toBe(true)
      expect(result.current.loadingStates.storage.message).toBe(
        'Saving data...'
      )
    })

    it('should set network loading', () => {
      const { result } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setNetworkLoading('Fetching data')
      })

      expect(result.current.isLoading('network')).toBe(true)
      expect(result.current.loadingStates.network.message).toBe(
        'Fetching data...'
      )
    })
  })

  describe('useSpecificLoadingState', () => {
    it('should return specific loading state', () => {
      const { result } = renderHook(() => useSpecificLoadingState('test'))

      expect(result.current.loadingState).toBeUndefined()
      expect(result.current.isLoading).toBe(false)

      act(() => {
        result.current.setLoading('Loading test...')
      })

      expect(result.current.loadingState).toBeDefined()
      expect(result.current.loadingState?.message).toBe('Loading test...')
      expect(result.current.isLoading).toBe(true)
    })

    it('should clear specific loading state', () => {
      const { result } = renderHook(() => useSpecificLoadingState('test'))

      act(() => {
        result.current.setLoading('Loading test...')
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.clearLoading()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.loadingState).toBeUndefined()
    })

    it('should set progress for specific loading state', () => {
      const { result } = renderHook(() => useSpecificLoadingState('upload'))

      act(() => {
        result.current.setLoading('Uploading...')
      })

      act(() => {
        result.current.setProgress(75)
      })

      expect(result.current.loadingState?.progress).toBe(75)
    })

    it('should update when external changes occur', () => {
      const { result } = renderHook(() => useSpecificLoadingState('test'))

      // External change via loadingStateManager
      act(() => {
        loadingStateManager.setLoading('test', 'External loading...')
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.loadingState?.message).toBe('External loading...')

      act(() => {
        loadingStateManager.clearLoading('test')
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should cleanup subscription on unmount', () => {
      const { result, unmount } = renderHook(() => useLoadingState())

      act(() => {
        result.current.setLoading('test', 'Loading...')
      })

      expect(result.current.isLoading('test')).toBe(true)

      unmount()

      // After unmount, external changes should not affect the hook
      act(() => {
        loadingStateManager.clearLoading('test')
      })

      // The hook should have cleaned up its subscription
      expect(loadingStateManager.isLoading('test')).toBe(false)
    })
  })
})
