import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ErrorReporter } from '../ErrorReporter'
import { ErrorType, UserFriendlyError } from '../../../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('ErrorReporter', () => {
  let errorReporter: ErrorReporter

  beforeEach(() => {
    errorReporter = new ErrorReporter()
    vi.clearAllMocks()
    // Mock console methods
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('reportError', () => {
    const mockError: UserFriendlyError = {
      id: 'test-error',
      type: ErrorType.NETWORK,
      title: 'Test Error',
      message: 'Test message',
      dismissible: true,
      persistent: false,
      actions: [],
    }

    it('should create and store error report', () => {
      errorReporter.reportError(mockError, 'user123')

      const reports = errorReporter.getRecentReports(1)
      expect(reports).toHaveLength(1)
      expect(reports[0].error).toEqual(mockError)
      expect(reports[0].userId).toBe('user123')
      expect(reports[0].userAgent).toBe(navigator.userAgent)
      expect(reports[0].url).toBe(window.location.href)
    })

    it('should generate unique report IDs', () => {
      errorReporter.reportError(mockError)
      errorReporter.reportError(mockError)

      const reports = errorReporter.getRecentReports(2)
      expect(reports[0].id).not.toBe(reports[1].id)
    })

    it('should limit stored reports to maxReports', () => {
      // Create 150 reports (exceeding the limit of 100)
      for (let i = 0; i < 150; i++) {
        errorReporter.reportError({
          ...mockError,
          id: `error-${i}`,
        })
      }

      const allReports = errorReporter.getRecentReports(200)
      expect(allReports).toHaveLength(100)

      // Should keep the most recent reports
      expect(allReports[0].error.id).toBe('error-50')
      expect(allReports[99].error.id).toBe('error-149')
    })

    it('should log to console in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      errorReporter.reportError(mockError)

      expect(console.group).toHaveBeenCalledWith('🚨 Error Report: Test Error')
      expect(console.error).toHaveBeenCalledWith('Error:', mockError)
      expect(console.groupEnd).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should send to monitoring service in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      localStorageMock.getItem.mockReturnValue(null)

      errorReporter.reportError(mockError)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'puka-error-reports',
        expect.stringContaining('"error":{"id":"test-error"')
      )

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getErrorStats', () => {
    it('should return empty stats initially', () => {
      const stats = errorReporter.getErrorStats()

      expect(stats[ErrorType.AUTHENTICATION]).toBe(0)
      expect(stats[ErrorType.NETWORK]).toBe(0)
      expect(stats[ErrorType.RATE_LIMIT]).toBe(0)
      expect(stats[ErrorType.SERVER]).toBe(0)
      expect(stats[ErrorType.STORAGE]).toBe(0)
    })

    it('should count errors by type', () => {
      const networkError: UserFriendlyError = {
        id: 'network-error',
        type: ErrorType.NETWORK,
        title: 'Network Error',
        message: 'Network failed',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      const authError: UserFriendlyError = {
        id: 'auth-error',
        type: ErrorType.AUTHENTICATION,
        title: 'Auth Error',
        message: 'Auth failed',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(networkError)
      errorReporter.reportError(networkError)
      errorReporter.reportError(authError)

      const stats = errorReporter.getErrorStats()

      expect(stats[ErrorType.NETWORK]).toBe(2)
      expect(stats[ErrorType.AUTHENTICATION]).toBe(1)
      expect(stats[ErrorType.RATE_LIMIT]).toBe(0)
      expect(stats[ErrorType.SERVER]).toBe(0)
      expect(stats[ErrorType.STORAGE]).toBe(0)
    })
  })

  describe('getRecentReports', () => {
    it('should return empty array initially', () => {
      const reports = errorReporter.getRecentReports()
      expect(reports).toHaveLength(0)
    })

    it('should return recent reports with default limit', () => {
      for (let i = 0; i < 15; i++) {
        errorReporter.reportError({
          id: `error-${i}`,
          type: ErrorType.SERVER,
          title: `Error ${i}`,
          message: 'Test message',
          dismissible: true,
          persistent: false,
          actions: [],
        })
      }

      const reports = errorReporter.getRecentReports()
      expect(reports).toHaveLength(10) // Default limit
      expect(reports[0].error.id).toBe('error-5')
      expect(reports[9].error.id).toBe('error-14')
    })

    it('should respect custom limit', () => {
      for (let i = 0; i < 10; i++) {
        errorReporter.reportError({
          id: `error-${i}`,
          type: ErrorType.SERVER,
          title: `Error ${i}`,
          message: 'Test message',
          dismissible: true,
          persistent: false,
          actions: [],
        })
      }

      const reports = errorReporter.getRecentReports(5)
      expect(reports).toHaveLength(5)
      expect(reports[0].error.id).toBe('error-5')
      expect(reports[4].error.id).toBe('error-9')
    })
  })

  describe('clearReports', () => {
    it('should clear all reports', () => {
      const mockError: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(mockError)
      expect(errorReporter.getRecentReports()).toHaveLength(1)

      errorReporter.clearReports()
      expect(errorReporter.getRecentReports()).toHaveLength(0)
    })
  })

  describe('exportReports', () => {
    it('should export reports as JSON string', () => {
      const mockError: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(mockError)
      const exported = errorReporter.exportReports()
      const parsed = JSON.parse(exported)

      expect(parsed.sessionId).toBeDefined()
      expect(parsed.timestamp).toBeDefined()
      expect(parsed.reports).toHaveLength(1)
      expect(parsed.stats).toBeDefined()
      expect(parsed.reports[0].error).toEqual(mockError)
    })

    it('should include error statistics in export', () => {
      const networkError: UserFriendlyError = {
        id: 'network-error',
        type: ErrorType.NETWORK,
        title: 'Network Error',
        message: 'Network failed',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(networkError)
      errorReporter.reportError(networkError)

      const exported = errorReporter.exportReports()
      const parsed = JSON.parse(exported)

      expect(parsed.stats[ErrorType.NETWORK]).toBe(2)
    })
  })

  describe('localStorage error handling', () => {
    it('should handle localStorage quota exceeded error', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const quotaError = new DOMException(
        'Quota exceeded',
        'QuotaExceededError'
      )

      localStorageMock.getItem.mockReturnValue('[]')
      localStorageMock.setItem
        .mockImplementationOnce(() => {
          throw quotaError
        })
        .mockImplementationOnce(() => {}) // Second call should succeed

      const mockError: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(mockError)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'puka-error-reports'
      )
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)

      process.env.NODE_ENV = originalEnv
    })

    it('should handle other localStorage errors gracefully', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const genericError = new Error('Generic storage error')
      localStorageMock.getItem.mockReturnValue('[]')
      localStorageMock.setItem.mockImplementation(() => {
        throw genericError
      })

      const mockError: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(mockError)

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to send error report to monitoring service:',
        genericError
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should handle JSON parsing errors', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      localStorageMock.getItem.mockReturnValue('invalid json')

      const mockError: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorReporter.reportError(mockError)

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to send error report to monitoring service:',
        expect.any(Error)
      )

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('sessionId generation', () => {
    it('should generate unique session IDs', () => {
      const reporter1 = new ErrorReporter()
      const reporter2 = new ErrorReporter()

      const export1 = JSON.parse(reporter1.exportReports())
      const export2 = JSON.parse(reporter2.exportReports())

      expect(export1.sessionId).not.toBe(export2.sessionId)
      expect(export1.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/)
      expect(export2.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/)
    })
  })
})
