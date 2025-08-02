import { ErrorType, AuthError } from '../../types'

export class ErrorClassifier {
  /**
   * Classify an error based on its properties
   */
  static classifyError(error: any): ErrorType {
    // Check for network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return ErrorType.NETWORK
    }

    // Check for authentication errors
    if (error.status === 401 || error.status === 403) {
      return ErrorType.AUTHENTICATION
    }

    // Check for rate limiting
    if (error.status === 429) {
      return ErrorType.RATE_LIMIT
    }

    // Check for server errors
    if (error.status >= 500) {
      return ErrorType.SERVER
    }

    // Check for storage errors
    if (
      error.message?.includes('storage') ||
      error.message?.includes('database')
    ) {
      return ErrorType.STORAGE
    }

    // Default to server error
    return ErrorType.SERVER
  }

  /**
   * Determine if an error is retryable
   */
  static isRetryable(error: any): boolean {
    const errorType = this.classifyError(error)

    switch (errorType) {
      case ErrorType.NETWORK:
      case ErrorType.RATE_LIMIT:
      case ErrorType.SERVER:
        return true
      case ErrorType.AUTHENTICATION:
        // Only retry auth errors if they're not credential-related
        return error.status !== 401
      case ErrorType.STORAGE:
        return true
      default:
        return false
    }
  }

  /**
   * Get retry delay based on error type and attempt count
   */
  static getRetryDelay(error: any, attemptCount: number): number {
    const errorType = this.classifyError(error)
    const baseDelay = 1000 // 1 second

    switch (errorType) {
      case ErrorType.RATE_LIMIT:
        // For rate limiting, use exponential backoff with longer delays
        return Math.min(baseDelay * Math.pow(2, attemptCount), 30000) // Max 30 seconds
      case ErrorType.NETWORK:
        // For network errors, use moderate exponential backoff
        return Math.min(baseDelay * Math.pow(1.5, attemptCount), 10000) // Max 10 seconds
      case ErrorType.SERVER:
        // For server errors, use standard exponential backoff
        return Math.min(baseDelay * Math.pow(2, attemptCount), 15000) // Max 15 seconds
      default:
        return baseDelay * attemptCount // Linear backoff for other errors
    }
  }

  /**
   * Create an AuthError from a generic error
   */
  static createAuthError(error: any): AuthError {
    const errorType = this.classifyError(error)

    let authErrorType: AuthError['type'] = 'UNKNOWN'
    let userMessage = 'An unexpected error occurred during authentication.'

    switch (errorType) {
      case ErrorType.NETWORK:
        authErrorType = 'NETWORK'
        userMessage =
          'Unable to connect to our servers. Please check your internet connection.'
        break
      case ErrorType.RATE_LIMIT:
        authErrorType = 'RATE_LIMIT'
        userMessage = 'Too many attempts. Please wait before trying again.'
        break
      case ErrorType.SERVER:
        authErrorType = 'SERVER'
        userMessage =
          'Our servers are experiencing issues. Please try again later.'
        break
      case ErrorType.AUTHENTICATION:
        if (error.status === 401) {
          authErrorType = 'CREDENTIALS'
          userMessage = 'The email or password you entered is incorrect.'
        } else {
          authErrorType = 'SERVER'
          userMessage = 'Authentication service is temporarily unavailable.'
        }
        break
    }

    return {
      type: authErrorType,
      message: error.message || 'Unknown error',
      userMessage,
      actionable: this.isActionable(errorType),
      retryable: this.isRetryable(error),
    }
  }

  /**
   * Determine if an error has actionable recovery options
   */
  private static isActionable(errorType: ErrorType): boolean {
    switch (errorType) {
      case ErrorType.NETWORK:
      case ErrorType.RATE_LIMIT:
      case ErrorType.AUTHENTICATION:
        return true
      default:
        return false
    }
  }
}
