import { describe, it, expect } from 'vitest'
import { ErrorClassifier } from '../ErrorClassifier'
import { ErrorType } from '../../../types'

describe('ErrorClassifier', () => {
  describe('classifyError', () => {
    it('should classify network errors', () => {
      const networkError = { name: 'NetworkError' }
      expect(ErrorClassifier.classifyError(networkError)).toBe(
        ErrorType.NETWORK
      )

      const codeError = { code: 'NETWORK_ERROR' }
      expect(ErrorClassifier.classifyError(codeError)).toBe(ErrorType.NETWORK)
    })

    it('should classify authentication errors', () => {
      const unauthorizedError = { status: 401 }
      expect(ErrorClassifier.classifyError(unauthorizedError)).toBe(
        ErrorType.AUTHENTICATION
      )

      const forbiddenError = { status: 403 }
      expect(ErrorClassifier.classifyError(forbiddenError)).toBe(
        ErrorType.AUTHENTICATION
      )
    })

    it('should classify rate limiting errors', () => {
      const rateLimitError = { status: 429 }
      expect(ErrorClassifier.classifyError(rateLimitError)).toBe(
        ErrorType.RATE_LIMIT
      )
    })

    it('should classify server errors', () => {
      const serverError = { status: 500 }
      expect(ErrorClassifier.classifyError(serverError)).toBe(ErrorType.SERVER)

      const badGatewayError = { status: 502 }
      expect(ErrorClassifier.classifyError(badGatewayError)).toBe(
        ErrorType.SERVER
      )

      const serviceUnavailableError = { status: 503 }
      expect(ErrorClassifier.classifyError(serviceUnavailableError)).toBe(
        ErrorType.SERVER
      )
    })

    it('should classify storage errors', () => {
      const storageError = { message: 'storage failed' }
      expect(ErrorClassifier.classifyError(storageError)).toBe(
        ErrorType.STORAGE
      )

      const databaseError = { message: 'database connection failed' }
      expect(ErrorClassifier.classifyError(databaseError)).toBe(
        ErrorType.STORAGE
      )
    })

    it('should default to server error for unknown errors', () => {
      const unknownError = { message: 'unknown error' }
      expect(ErrorClassifier.classifyError(unknownError)).toBe(ErrorType.SERVER)

      const emptyError = {}
      expect(ErrorClassifier.classifyError(emptyError)).toBe(ErrorType.SERVER)
    })
  })

  describe('isRetryable', () => {
    it('should mark network errors as retryable', () => {
      const networkError = { name: 'NetworkError' }
      expect(ErrorClassifier.isRetryable(networkError)).toBe(true)
    })

    it('should mark rate limit errors as retryable', () => {
      const rateLimitError = { status: 429 }
      expect(ErrorClassifier.isRetryable(rateLimitError)).toBe(true)
    })

    it('should mark server errors as retryable', () => {
      const serverError = { status: 500 }
      expect(ErrorClassifier.isRetryable(serverError)).toBe(true)
    })

    it('should mark storage errors as retryable', () => {
      const storageError = { message: 'storage failed' }
      expect(ErrorClassifier.isRetryable(storageError)).toBe(true)
    })

    it('should mark non-401 auth errors as retryable', () => {
      const forbiddenError = { status: 403 }
      expect(ErrorClassifier.isRetryable(forbiddenError)).toBe(true)
    })

    it('should not mark 401 auth errors as retryable', () => {
      const unauthorizedError = { status: 401 }
      expect(ErrorClassifier.isRetryable(unauthorizedError)).toBe(false)
    })
  })

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff for rate limit errors', () => {
      const rateLimitError = { status: 429 }

      expect(ErrorClassifier.getRetryDelay(rateLimitError, 0)).toBe(1000)
      expect(ErrorClassifier.getRetryDelay(rateLimitError, 1)).toBe(2000)
      expect(ErrorClassifier.getRetryDelay(rateLimitError, 2)).toBe(4000)
      expect(ErrorClassifier.getRetryDelay(rateLimitError, 3)).toBe(8000)
    })

    it('should cap rate limit delays at 30 seconds', () => {
      const rateLimitError = { status: 429 }

      expect(ErrorClassifier.getRetryDelay(rateLimitError, 10)).toBe(30000)
    })

    it('should calculate moderate backoff for network errors', () => {
      const networkError = { name: 'NetworkError' }

      expect(ErrorClassifier.getRetryDelay(networkError, 0)).toBe(1000)
      expect(ErrorClassifier.getRetryDelay(networkError, 1)).toBe(1500)
      expect(ErrorClassifier.getRetryDelay(networkError, 2)).toBe(2250)
    })

    it('should cap network delays at 10 seconds', () => {
      const networkError = { name: 'NetworkError' }

      expect(ErrorClassifier.getRetryDelay(networkError, 10)).toBe(10000)
    })

    it('should calculate standard backoff for server errors', () => {
      const serverError = { status: 500 }

      expect(ErrorClassifier.getRetryDelay(serverError, 0)).toBe(1000)
      expect(ErrorClassifier.getRetryDelay(serverError, 1)).toBe(2000)
      expect(ErrorClassifier.getRetryDelay(serverError, 2)).toBe(4000)
    })

    it('should cap server delays at 15 seconds', () => {
      const serverError = { status: 500 }

      expect(ErrorClassifier.getRetryDelay(serverError, 10)).toBe(15000)
    })

    it('should use linear backoff for other errors', () => {
      const unknownError = { message: 'unknown' }

      expect(ErrorClassifier.getRetryDelay(unknownError, 1)).toBe(1000)
      expect(ErrorClassifier.getRetryDelay(unknownError, 2)).toBe(2000)
      expect(ErrorClassifier.getRetryDelay(unknownError, 3)).toBe(3000)
    })
  })

  describe('createAuthError', () => {
    it('should create network auth error', () => {
      const networkError = { name: 'NetworkError', message: 'Network failed' }
      const authError = ErrorClassifier.createAuthError(networkError)

      expect(authError.type).toBe('NETWORK')
      expect(authError.userMessage).toBe(
        'Unable to connect to our servers. Please check your internet connection.'
      )
      expect(authError.retryable).toBe(true)
      expect(authError.actionable).toBe(true)
    })

    it('should create rate limit auth error', () => {
      const rateLimitError = { status: 429, message: 'Too many requests' }
      const authError = ErrorClassifier.createAuthError(rateLimitError)

      expect(authError.type).toBe('RATE_LIMIT')
      expect(authError.userMessage).toBe(
        'Too many attempts. Please wait before trying again.'
      )
      expect(authError.retryable).toBe(true)
      expect(authError.actionable).toBe(true)
    })

    it('should create server auth error', () => {
      const serverError = { status: 500, message: 'Internal server error' }
      const authError = ErrorClassifier.createAuthError(serverError)

      expect(authError.type).toBe('SERVER')
      expect(authError.userMessage).toBe(
        'Our servers are experiencing issues. Please try again later.'
      )
      expect(authError.retryable).toBe(true)
      expect(authError.actionable).toBe(false)
    })

    it('should create credentials auth error for 401', () => {
      const credentialsError = { status: 401, message: 'Unauthorized' }
      const authError = ErrorClassifier.createAuthError(credentialsError)

      expect(authError.type).toBe('CREDENTIALS')
      expect(authError.userMessage).toBe(
        'The email or password you entered is incorrect.'
      )
      expect(authError.retryable).toBe(false)
      expect(authError.actionable).toBe(true)
    })

    it('should create server auth error for non-401 auth errors', () => {
      const forbiddenError = { status: 403, message: 'Forbidden' }
      const authError = ErrorClassifier.createAuthError(forbiddenError)

      expect(authError.type).toBe('SERVER')
      expect(authError.userMessage).toBe(
        'Authentication service is temporarily unavailable.'
      )
      expect(authError.retryable).toBe(true)
      expect(authError.actionable).toBe(false)
    })

    it('should handle unknown errors', () => {
      const unknownError = { message: 'Unknown error' }
      const authError = ErrorClassifier.createAuthError(unknownError)

      expect(authError.type).toBe('UNKNOWN')
      expect(authError.userMessage).toBe(
        'An unexpected error occurred during authentication.'
      )
      expect(authError.retryable).toBe(false)
      expect(authError.actionable).toBe(false)
    })
  })

  describe('isActionable', () => {
    it('should identify actionable error types', () => {
      expect(ErrorClassifier['isActionable'](ErrorType.NETWORK)).toBe(true)
      expect(ErrorClassifier['isActionable'](ErrorType.RATE_LIMIT)).toBe(true)
      expect(ErrorClassifier['isActionable'](ErrorType.AUTHENTICATION)).toBe(
        true
      )
    })

    it('should identify non-actionable error types', () => {
      expect(ErrorClassifier['isActionable'](ErrorType.SERVER)).toBe(false)
      expect(ErrorClassifier['isActionable'](ErrorType.STORAGE)).toBe(false)
    })
  })
})
