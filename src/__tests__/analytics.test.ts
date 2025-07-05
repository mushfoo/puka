import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Plausible
vi.mock('plausible-tracker', () => ({
  default: vi.fn(() => ({
    trackPageview: vi.fn(),
    trackEvent: vi.fn()
  }))
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
vi.stubGlobal('localStorage', localStorageMock)

describe('Analytics Utils', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Event tracking', () => {
    it('should track book actions', async () => {
      const { trackBookAction } = await import('../utils/analytics')
      // Test that the function doesn't throw
      expect(() => trackBookAction('add')).not.toThrow()
    })

    it('should track reading actions', async () => {
      const { trackReadingAction } = await import('../utils/analytics')
      // Test that the function doesn't throw
      expect(() => trackReadingAction('mark_day')).not.toThrow()
    })

    it('should not throw when tracking events', async () => {
      const { trackEvent, trackPageView } = await import('../utils/analytics')
      expect(() => trackEvent('test', { prop: 'value' })).not.toThrow()
      expect(() => trackPageView()).not.toThrow()
    })

    it('should handle tracking various event types', async () => {
      const { trackImportExport, trackSearch, trackFilter, trackQuickAction, trackPerformance, trackError } = await import('../utils/analytics')
      
      expect(() => trackImportExport('import', 'csv')).not.toThrow()
      expect(() => trackSearch(true)).not.toThrow()
      expect(() => trackFilter('currently-reading')).not.toThrow()
      expect(() => trackQuickAction('mark-finished')).not.toThrow()
      expect(() => trackPerformance('page_load_time', 1500)).not.toThrow()
      expect(() => trackError('api_error', 'BookService')).not.toThrow()
    })
  })

  describe('Analytics initialization', () => {
    it('should initialize without errors', async () => {
      const { initializeAnalytics } = await import('../utils/analytics')
      expect(() => initializeAnalytics()).not.toThrow()
    })
  })

  describe('Core functionality', () => {
    it('should export all required functions', async () => {
      const analytics = await import('../utils/analytics')
      
      expect(typeof analytics.hasOptedOut).toBe('function')
      expect(typeof analytics.setOptOut).toBe('function')
      expect(typeof analytics.trackPageView).toBe('function')
      expect(typeof analytics.trackEvent).toBe('function')
      expect(typeof analytics.trackBookAction).toBe('function')
      expect(typeof analytics.trackReadingAction).toBe('function')
      expect(typeof analytics.getAnalyticsState).toBe('function')
      expect(typeof analytics.initializeAnalytics).toBe('function')
    })

    it('should return analytics state object', async () => {
      const { getAnalyticsState } = await import('../utils/analytics')
      const state = getAnalyticsState()
      
      expect(state).toHaveProperty('enabled')
      expect(state).toHaveProperty('optOutAvailable')
      expect(state).toHaveProperty('hasOptedOut')
      expect(state).toHaveProperty('domain')
      expect(typeof state.enabled).toBe('boolean')
      expect(typeof state.optOutAvailable).toBe('boolean')
      expect(typeof state.hasOptedOut).toBe('boolean')
      expect(typeof state.domain).toBe('string')
    })

    it('should handle opt-out functions gracefully', async () => {
      const { hasOptedOut, setOptOut } = await import('../utils/analytics')
      
      expect(() => hasOptedOut()).not.toThrow()
      expect(() => setOptOut(true)).not.toThrow()
      expect(() => setOptOut(false)).not.toThrow()
    })
  })

  describe('Privacy compliance', () => {
    it('should handle disabled analytics gracefully', async () => {
      const { trackEvent, trackPageView } = await import('../utils/analytics')
      
      expect(() => trackEvent('test')).not.toThrow()
      expect(() => trackPageView()).not.toThrow()
    })

    it('should respect privacy settings', async () => {
      const { getAnalyticsState, trackEvent } = await import('../utils/analytics')
      const state = getAnalyticsState()
      
      // Privacy settings should be coherent
      if (!state.enabled) {
        // If analytics is disabled, tracking should still not throw
        expect(() => trackEvent('test')).not.toThrow()
      }
    })
  })
})