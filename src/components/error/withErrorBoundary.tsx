import React, { ComponentType, ErrorInfo } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { UserFriendlyError } from '../../types'

interface WithErrorBoundaryOptions {
  fallback?: (error: UserFriendlyError, retry: () => void) => React.ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary fallback={options.fallback} onError={options.onError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`

  return WrappedComponent
}

/**
 * Hook to create an error boundary wrapper for components
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError,
  }
}
