import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorManager } from '../ErrorManager'
import { ErrorType, UserFriendlyError, AuthError } from '../../../types'

describe('ErrorManager', () => {
  let errorManager: ErrorManager

  beforeEach(() => {
    errorManager = new ErrorManager()
  })

  describe('addError', () => {
    it('should add a valid error', () => {
      const error: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorManager.addError(error)
      const errors = errorManager.getErrors()

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual(error)
    })

    it('should throw error for invalid error object', () => {
      expect(() => {
        errorManager.addError(null as any)
      }).toThrow('Invalid error object provided')
    })

    it('should throw error for missing ID', () => {
      const error = {
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      } as any

      expect(() => {
        errorManager.addError(error)
      }).toThrow('Error must have a valid string ID')
    })

    it('should throw error for invalid error type', () => {
      const error = {
        id: 'test-error',
        type: 'invalid-type',
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      } as any

      expect(() => {
        errorManager.addError(error)
      }).toThrow('Error must have a valid ErrorType')
    })
  })

  describe('removeError', () => {
    it('should remove an existing error', () => {
      const error: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorManager.addError(error)
      expect(errorManager.getErrors()).toHaveLength(1)

      errorManager.removeError('test-error')
      expect(errorManager.getErrors()).toHaveLength(0)
    })

    it('should handle removing non-existent error gracefully', () => {
      errorManager.removeError('non-existent')
      expect(errorManager.getErrors()).toHaveLength(0)
    })
  })

  describe('createAuthError', () => {
    it('should create rate limit error', () => {
      const authError: AuthError = {
        type: 'RATE_LIMIT',
        message: 'Too many requests',
        userMessage: 'Please wait',
        actionable: true,
        retryable: true,
      }

      const userError = errorManager.createAuthError(authError)

      expect(userError.type).toBe(ErrorType.AUTHENTICATION)
      expect(userError.title).toBe('Too Many Attempts')
      expect(userError.actions).toHaveLength(2)
      expect(userError.actions[0].label).toBe('Try Offline Mode')
    })

    it('should create network error', () => {
      const authError: AuthError = {
        type: 'NETWORK',
        message: 'Network failed',
        userMessage: 'Connection issue',
        actionable: true,
        retryable: true,
      }

      const userError = errorManager.createAuthError(authError)

      expect(userError.type).toBe(ErrorType.AUTHENTICATION)
      expect(userError.title).toBe('Connection Problem')
      expect(userError.actions).toHaveLength(2)
    })

    it('should create credentials error', () => {
      const authError: AuthError = {
        type: 'CREDENTIALS',
        message: 'Invalid credentials',
        userMessage: 'Wrong password',
        actionable: true,
        retryable: false,
      }

      const userError = errorManager.createAuthError(authError)

      expect(userError.type).toBe(ErrorType.AUTHENTICATION)
      expect(userError.title).toBe('Sign In Failed')
      expect(userError.actions).toHaveLength(2)
      expect(userError.actions[1].label).toBe('Reset Password')
    })
  })

  describe('createGenericError', () => {
    it('should create generic error with correct ID', () => {
      const error = new Error('Test error')
      const userError = errorManager.createGenericError(error)

      expect(userError.id).toMatch(/^generic-\d+$/)
      expect(userError.type).toBe(ErrorType.SERVER)
      expect(userError.title).toBe('Something Went Wrong')
      expect(userError.details).toBe('Test error')
      expect(userError.actions).toHaveLength(1)

      // Test that the dismiss action uses the correct error ID
      const dismissAction = userError.actions[0]
      expect(dismissAction.label).toBe('Dismiss')

      // Add the error and then call the dismiss action
      errorManager.addError(userError)
      expect(errorManager.getErrors()).toHaveLength(1)

      dismissAction.action()
      expect(errorManager.getErrors()).toHaveLength(0)
    })
  })

  describe('subscription', () => {
    it('should notify listeners when errors change', () => {
      const listener = vi.fn()
      const unsubscribe = errorManager.subscribe(listener)

      const error: UserFriendlyError = {
        id: 'test-error',
        type: ErrorType.NETWORK,
        title: 'Test Error',
        message: 'Test message',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorManager.addError(error)
      expect(listener).toHaveBeenCalledWith([error])

      errorManager.removeError('test-error')
      expect(listener).toHaveBeenCalledWith([])

      unsubscribe()
      errorManager.addError(error)
      expect(listener).toHaveBeenCalledTimes(2) // Should not be called again
    })
  })

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      const error1: UserFriendlyError = {
        id: 'error-1',
        type: ErrorType.NETWORK,
        title: 'Error 1',
        message: 'Message 1',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      const error2: UserFriendlyError = {
        id: 'error-2',
        type: ErrorType.SERVER,
        title: 'Error 2',
        message: 'Message 2',
        dismissible: true,
        persistent: false,
        actions: [],
      }

      errorManager.addError(error1)
      errorManager.addError(error2)
      expect(errorManager.getErrors()).toHaveLength(2)

      errorManager.clearErrors()
      expect(errorManager.getErrors()).toHaveLength(0)
    })
  })
})
