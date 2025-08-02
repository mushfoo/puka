import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorType, UserFriendlyError, ErrorAction } from '../../types/error'
import { ErrorClassifier } from '../../services/error/ErrorClassifier'
import { errorReporter } from '../../services/error/ErrorReporter'

interface Props {
  children: ReactNode
  fallback?: (error: UserFriendlyError, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  userFriendlyError?: UserFriendlyError
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create user-friendly error
    const userFriendlyError = this.createUserFriendlyError(error)

    // Report error for monitoring
    errorReporter.reportError(userFriendlyError)

    // Update state with error info
    this.setState({
      errorInfo,
      userFriendlyError,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 ErrorBoundary caught an error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('User-Friendly Error:', userFriendlyError)
      console.groupEnd()
    }
  }

  private createUserFriendlyError(error: Error): UserFriendlyError {
    const errorType = ErrorClassifier.classifyError(error)
    const retryAction: ErrorAction = {
      label: 'Try Again',
      action: this.handleRetry,
      style: 'primary',
    }

    const reloadAction: ErrorAction = {
      label: 'Reload Page',
      action: () => window.location.reload(),
      style: 'secondary',
    }

    const reportAction: ErrorAction = {
      label: 'Report Issue',
      action: this.handleReportIssue,
      style: 'secondary',
    }

    switch (errorType) {
      case ErrorType.NETWORK:
        return {
          id: `boundary-network-${Date.now()}`,
          type: ErrorType.NETWORK,
          title: 'Connection Problem',
          message: 'Unable to load the application due to a network issue.',
          details: error.message,
          dismissible: false,
          persistent: true,
          actions: [retryAction, reloadAction],
        }

      case ErrorType.AUTHENTICATION:
        return {
          id: `boundary-auth-${Date.now()}`,
          type: ErrorType.AUTHENTICATION,
          title: 'Authentication Error',
          message:
            'There was a problem with your authentication. Please sign in again.',
          details: error.message,
          dismissible: false,
          persistent: true,
          actions: [
            {
              label: 'Sign In Again',
              action: () => (window.location.href = '/auth'),
              style: 'primary',
            },
            reloadAction,
          ],
        }

      case ErrorType.STORAGE:
        return {
          id: `boundary-storage-${Date.now()}`,
          type: ErrorType.STORAGE,
          title: 'Storage Error',
          message:
            'There was a problem accessing your data. Your changes may not be saved.',
          details: error.message,
          dismissible: false,
          persistent: true,
          actions: [
            {
              label: 'Use Offline Mode',
              action: this.handleOfflineMode,
              style: 'primary',
            },
            retryAction,
            reloadAction,
          ],
        }

      default:
        return {
          id: `boundary-generic-${Date.now()}`,
          type: ErrorType.SERVER,
          title: 'Something Went Wrong',
          message:
            "An unexpected error occurred. We're sorry for the inconvenience.",
          details: error.message,
          dismissible: false,
          persistent: true,
          actions: [retryAction, reloadAction, reportAction],
        }
    }
  }

  private handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      userFriendlyError: undefined,
      retryCount: prevState.retryCount + 1,
    }))
  }

  private handleOfflineMode = (): void => {
    // This would trigger offline mode in the app
    localStorage.setItem('puka-force-offline', 'true')
    window.location.reload()
  }

  private handleReportIssue = (): void => {
    const { error, errorInfo } = this.state
    const reportData = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Copy error details to clipboard
    navigator.clipboard
      .writeText(JSON.stringify(reportData, null, 2))
      .then(() => {
        alert(
          'Error details copied to clipboard. Please paste this information when reporting the issue.'
        )
      })
      .catch(() => {
        // Fallback: show error details in a new window
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`
          <html>
            <head><title>Error Report</title></head>
            <body>
              <h1>Error Report</h1>
              <p>Please copy this information when reporting the issue:</p>
              <pre>${JSON.stringify(reportData, null, 2)}</pre>
            </body>
          </html>
        `)
        }
      })
  }

  render() {
    if (this.state.hasError && this.state.userFriendlyError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.userFriendlyError,
          this.handleRetry
        )
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.userFriendlyError} />
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: UserFriendlyError
}

function DefaultErrorFallback({ error }: DefaultErrorFallbackProps) {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-6'>
        <div className='flex items-center mb-4'>
          <div className='flex-shrink-0'>
            <svg
              className='h-8 w-8 text-red-500'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <div className='ml-3'>
            <h3 className='text-lg font-medium text-gray-900'>{error.title}</h3>
          </div>
        </div>

        <div className='mb-4'>
          <p className='text-sm text-gray-600'>{error.message}</p>
          {error.details && (
            <details className='mt-2'>
              <summary className='text-xs text-gray-500 cursor-pointer'>
                Technical Details
              </summary>
              <pre className='mt-1 text-xs text-gray-400 bg-gray-50 p-2 rounded overflow-auto'>
                {error.details}
              </pre>
            </details>
          )}
        </div>

        <div className='flex flex-col space-y-2'>
          {error.actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={action.loading}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  action.style === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                    : action.style === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100'
                }
                ${action.loading ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}>
              {action.loading ? 'Loading...' : action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
