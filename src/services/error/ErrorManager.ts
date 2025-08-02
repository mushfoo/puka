import { UserFriendlyError, ErrorType, AuthError } from '../../types'

export class ErrorManager {
  private errors: Map<string, UserFriendlyError> = new Map()
  private listeners: Set<(errors: UserFriendlyError[]) => void> = new Set()

  /**
   * Add or update an error in the error state
   */
  addError(error: UserFriendlyError): void {
    this.errors.set(error.id, error)
    this.notifyListeners()
  }

  /**
   * Remove an error from the error state
   */
  removeError(errorId: string): void {
    this.errors.delete(errorId)
    this.notifyListeners()
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors.clear()
    this.notifyListeners()
  }

  /**
   * Get all current errors
   */
  getErrors(): UserFriendlyError[] {
    return Array.from(this.errors.values())
  }

  /**
   * Subscribe to error state changes
   */
  subscribe(listener: (errors: UserFriendlyError[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Create a user-friendly error from an authentication error
   */
  createAuthError(authError: AuthError): UserFriendlyError {
    const baseError = {
      id: `auth-${Date.now()}`,
      type: ErrorType.AUTHENTICATION,
      dismissible: true,
      persistent: false,
    }

    switch (authError.type) {
      case 'RATE_LIMIT':
        return {
          ...baseError,
          title: 'Too Many Attempts',
          message:
            'Please wait before trying again. Our servers are temporarily limiting requests.',
          details: authError.message,
          actions: [
            {
              label: 'Try Offline Mode',
              action: () => this.switchToOfflineMode(),
              style: 'secondary' as const,
            },
            {
              label: 'Retry Later',
              action: () => this.removeError(baseError.id),
              style: 'primary' as const,
            },
          ],
        }

      case 'NETWORK':
        return {
          ...baseError,
          title: 'Connection Problem',
          message:
            'Unable to connect to our servers. Check your internet connection.',
          details: authError.message,
          actions: [
            {
              label: 'Use Offline Mode',
              action: () => this.switchToOfflineMode(),
              style: 'primary' as const,
            },
            {
              label: 'Retry',
              action: () => this.retryLastOperation(),
              style: 'secondary' as const,
            },
          ],
        }

      case 'CREDENTIALS':
        return {
          ...baseError,
          title: 'Sign In Failed',
          message: 'The email or password you entered is incorrect.',
          actions: [
            {
              label: 'Try Again',
              action: () => this.removeError(baseError.id),
              style: 'primary' as const,
            },
            {
              label: 'Reset Password',
              action: () => this.initiatePasswordReset(),
              style: 'secondary' as const,
            },
          ],
        }

      case 'SERVER':
        return {
          ...baseError,
          title: 'Server Error',
          message:
            'Our servers are experiencing issues. Please try again later.',
          details: authError.message,
          actions: [
            {
              label: 'Use Offline Mode',
              action: () => this.switchToOfflineMode(),
              style: 'primary' as const,
            },
            {
              label: 'Check Status',
              action: () => this.openStatusPage(),
              style: 'secondary' as const,
            },
          ],
        }

      default:
        return {
          ...baseError,
          title: 'Authentication Error',
          message:
            authError.userMessage ||
            'An unexpected error occurred during authentication.',
          details: authError.message,
          actions: [
            {
              label: 'Try Again',
              action: () => this.removeError(baseError.id),
              style: 'primary' as const,
            },
            {
              label: 'Use Offline Mode',
              action: () => this.switchToOfflineMode(),
              style: 'secondary' as const,
            },
          ],
        }
    }
  }

  /**
   * Create a user-friendly error from a generic error
   */
  createGenericError(
    error: Error,
    type: ErrorType = ErrorType.SERVER
  ): UserFriendlyError {
    return {
      id: `generic-${Date.now()}`,
      type,
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      details: error.message,
      dismissible: true,
      persistent: false,
      actions: [
        {
          label: 'Dismiss',
          action: () => this.removeError(`generic-${Date.now()}`),
          style: 'primary' as const,
        },
      ],
    }
  }

  private notifyListeners(): void {
    const errors = this.getErrors()
    this.listeners.forEach((listener) => listener(errors))
  }

  private switchToOfflineMode(): void {
    // This will be implemented when StorageServiceManager is available
    console.log('Switching to offline mode...')
  }

  private retryLastOperation(): void {
    // This will be implemented when retry logic is available
    console.log('Retrying last operation...')
  }

  private initiatePasswordReset(): void {
    // This will be implemented when password reset is available
    console.log('Initiating password reset...')
  }

  private openStatusPage(): void {
    window.open('https://status.puka.app', '_blank')
  }
}

// Singleton instance
export const errorManager = new ErrorManager()
