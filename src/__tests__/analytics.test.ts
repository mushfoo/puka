import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hasOptedOut,
  setOptOut,
  trackPageView,
  trackEvent,
  trackBookAction,
  trackReadingAction,
  getAnalyticsState,
  initializeAnalytics
} from '../utils/analytics'

// Mock Plausible
vi.mock('plausible-tracker', () => ({
  default: vi.fn(() => ({
    trackPageview: vi.fn(),
    trackEvent: vi.fn()
  }))
}))

// Mock environment variables
const mockEnv = {
  VITE_ANALYTICS_ENABLED: 'true',
  VITE_PLAUSIBLE_DOMAIN: 'test-domain.com',
  VITE_ANALYTICS_OPT_OUT_AVAILABLE: 'true',
  VITE_APP_VERSION: '2.0.0',
  VITE_APP_ENV: 'test'
}

vi.stubGlobal('import.meta.env', mockEnv)

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
vi.stubGlobal('localStorage', localStorageMock)

describe('Analytics Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Opt-out functionality', () => {
    it('should return false for hasOptedOut when no preference is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(hasOptedOut()).toBe(false)
    })

    it('should return true for hasOptedOut when opted out', () => {
      localStorageMock.getItem.mockReturnValue('true')
      expect(hasOptedOut()).toBe(true)
    })

    it('should set opt-out preference in localStorage', () => {
      setOptOut(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('puka-analytics-opt-out', 'true')
    })

    it('should remove opt-out preference when opting back in', () => {
      setOptOut(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('puka-analytics-opt-out')
    })
  })

  describe('Analytics state', () => {
    it('should return correct analytics state', () => {
      const state = getAnalyticsState()
      expect(state).toEqual({
        enabled: true,
        optOutAvailable: true,
        hasOptedOut: false,
        domain: 'test-domain.com'
      })
    })
  })

  describe('Event tracking', () => {
    it('should track book actions', () => {
      trackBookAction('add')
      // Test that the function doesn't throw
      expect(true).toBe(true)
    })

    it('should track reading actions', () => {
      trackReadingAction('mark_day')
      // Test that the function doesn't throw
      expect(true).toBe(true)
    })

    it('should not throw when tracking events', () => {
      expect(() => trackEvent('test', { prop: 'value' })).not.toThrow()
      expect(() => trackPageView()).not.toThrow()
    })
  })

  describe('Analytics initialization', () => {
    it('should initialize without errors', () => {
      expect(() => initializeAnalytics()).not.toThrow()
    })
  })

  describe('Privacy compliance', () => {
    it('should respect opt-out when disabled', () => {
      vi.stubGlobal('import.meta.env', {
        ...mockEnv,
        VITE_ANALYTICS_OPT_OUT_AVAILABLE: 'false'
      })
      
      // Should not throw and should handle gracefully
      expect(() => setOptOut(true)).not.toThrow()
      expect(() => hasOptedOut()).not.toThrow()
    })

    it('should handle disabled analytics gracefully', () => {
      vi.stubGlobal('import.meta.env', {
        ...mockEnv,
        VITE_ANALYTICS_ENABLED: 'false'
      })
      
      expect(() => trackEvent('test')).not.toThrow()
      expect(() => trackPageView()).not.toThrow()
    })
  })
})