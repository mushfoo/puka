import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { withErrorBoundary, useErrorBoundary } from '../withErrorBoundary'
import { UserFriendlyError, ErrorType } from '../../../types'

// Mock the error services
vi.mock('../../../services/error/ErrorReporter', () => ({
  errorReporter: {
    reportError: vi.fn(),
  },
}))

vi.mock('../../../services/error/ErrorClassifier', () => ({
  ErrorClassifier: {
    classifyError: vi.fn(() => ErrorType.SERVER),
  },
}))

// Test component that can throw errors
const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error from component')
  }
  return <div>Test component content</div>
}

// Test component that uses the useErrorBoundary hook
const TestComponentWithHook = ({
  shouldCaptureError,
}: {
  shouldCaptureError: boolean
}) => {
  const { captureError, resetError } = useErrorBoundary()

  if (shouldCaptureError) {
    captureError(new Error('Hook captured error'))
  }

  return (
    <div>
      <span>Hook component content</span>
      <button onClick={() => captureError(new Error('Button error'))}>
        Trigger Error
      </button>
      <button onClick={resetError}>Reset Error</button>
    </div>
  )
}

describe('withErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('HOC functionality', () => {
    it('should wrap component with ErrorBoundary', () => {
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent shouldThrow={false} />)

      expect(screen.getByText('Test component content')).toBeInTheDocument()
    })

    it('should catch errors from wrapped component', () => {
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      expect(
        screen.queryByText('Test component content')
      ).not.toBeInTheDocument()
    })

    it('should use custom fallback when provided', () => {
      const customFallback = (error: UserFriendlyError, retry: () => void) => (
        <div>
          <h1>Custom Error Fallback</h1>
          <p>{error.title}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      )

      const WrappedComponent = withErrorBoundary(TestComponent, {
        fallback: customFallback,
      })

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Custom Retry' })
      ).toBeInTheDocument()
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
    })

    it('should call custom onError handler when provided', () => {
      const onErrorSpy = vi.fn()
      const WrappedComponent = withErrorBoundary(TestComponent, {
        onError: onErrorSpy,
      })

      render(<WrappedComponent shouldThrow={true} />)

      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('should set correct displayName', () => {
      const NamedComponent = () => <div>Named Component</div>
      NamedComponent.displayName = 'NamedComponent'

      const WrappedComponent = withErrorBoundary(NamedComponent)

      expect(WrappedComponent.displayName).toBe(
        'withErrorBoundary(NamedComponent)'
      )
    })

    it('should handle component without displayName', () => {
      const AnonymousComponent = () => <div>Anonymous Component</div>

      const WrappedComponent = withErrorBoundary(AnonymousComponent)

      expect(WrappedComponent.displayName).toBe(
        'withErrorBoundary(AnonymousComponent)'
      )
    })

    it('should pass through props to wrapped component', () => {
      const PropsComponent = ({ testProp }: { testProp: string }) => (
        <div>Props: {testProp}</div>
      )

      const WrappedComponent = withErrorBoundary(PropsComponent)

      render(<WrappedComponent testProp='test value' />)

      expect(screen.getByText('Props: test value')).toBeInTheDocument()
    })
  })

  describe('useErrorBoundary hook', () => {
    it('should provide captureError and resetError functions', () => {
      render(<TestComponentWithHook shouldCaptureError={false} />)

      expect(screen.getByText('Hook component content')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Trigger Error' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Reset Error' })
      ).toBeInTheDocument()
    })

    it('should throw error when captureError is called', () => {
      // We need to wrap this in an ErrorBoundary to catch the error
      const WrappedComponent = withErrorBoundary(TestComponentWithHook)

      render(<WrappedComponent shouldCaptureError={true} />)

      // The error should be caught by the ErrorBoundary
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      expect(
        screen.queryByText('Hook component content')
      ).not.toBeInTheDocument()
    })

    it('should handle button click to trigger error', () => {
      const WrappedComponent = withErrorBoundary(TestComponentWithHook)

      render(<WrappedComponent shouldCaptureError={false} />)

      expect(screen.getByText('Hook component content')).toBeInTheDocument()

      const triggerButton = screen.getByRole('button', {
        name: 'Trigger Error',
      })
      fireEvent.click(triggerButton)

      // After clicking, the error should be caught
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      expect(
        screen.queryByText('Hook component content')
      ).not.toBeInTheDocument()
    })

    it('should reset error state when resetError is called', () => {
      const TestResetComponent = () => {
        const { captureError, resetError } = useErrorBoundary()
        const [hasError, setHasError] = React.useState(false)

        React.useEffect(() => {
          if (hasError) {
            captureError(new Error('Test error'))
          }
        }, [hasError, captureError])

        return (
          <div>
            <span>Reset test component</span>
            <button onClick={() => setHasError(true)}>Trigger Error</button>
            <button
              onClick={() => {
                resetError()
                setHasError(false)
              }}>
              Reset Error
            </button>
          </div>
        )
      }

      const WrappedComponent = withErrorBoundary(TestResetComponent)
      const { rerender } = render(<WrappedComponent />)

      expect(screen.getByText('Reset test component')).toBeInTheDocument()

      // Trigger error
      const triggerButton = screen.getByRole('button', {
        name: 'Trigger Error',
      })
      fireEvent.click(triggerButton)

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()

      // Reset error
      const retryButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(retryButton)

      // Re-render to show the reset state
      rerender(<WrappedComponent />)

      expect(screen.getByText('Reset test component')).toBeInTheDocument()
    })
  })

  describe('error boundary integration', () => {
    it('should work with both HOC options and hook together', () => {
      const customFallback = (error: UserFriendlyError, retry: () => void) => (
        <div>
          <h1>Custom Hook Error</h1>
          <button onClick={retry}>Retry Hook Error</button>
        </div>
      )

      const onErrorSpy = vi.fn()

      const WrappedComponent = withErrorBoundary(TestComponentWithHook, {
        fallback: customFallback,
        onError: onErrorSpy,
      })

      render(<WrappedComponent shouldCaptureError={true} />)

      expect(screen.getByText('Custom Hook Error')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Retry Hook Error' })
      ).toBeInTheDocument()
      expect(onErrorSpy).toHaveBeenCalled()
    })

    it('should handle multiple error captures', () => {
      const MultiErrorComponent = () => {
        const { captureError } = useErrorBoundary()
        const [errorCount, setErrorCount] = React.useState(0)

        const handleError = () => {
          const newCount = errorCount + 1
          setErrorCount(newCount)
          captureError(new Error(`Error ${newCount}`))
        }

        return (
          <div>
            <span>Multi error component</span>
            <button onClick={handleError}>
              Trigger Error {errorCount + 1}
            </button>
          </div>
        )
      }

      const WrappedComponent = withErrorBoundary(MultiErrorComponent)

      render(<WrappedComponent />)

      expect(screen.getByText('Multi error component')).toBeInTheDocument()

      const triggerButton = screen.getByRole('button', {
        name: 'Trigger Error 1',
      })
      fireEvent.click(triggerButton)

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })
  })

  describe('TypeScript integration', () => {
    it('should maintain proper typing for wrapped components', () => {
      interface TestProps {
        requiredProp: string
        optionalProp?: number
      }

      const TypedComponent = ({ requiredProp, optionalProp }: TestProps) => (
        <div>
          Required: {requiredProp}, Optional: {optionalProp || 'none'}
        </div>
      )

      const WrappedComponent = withErrorBoundary(TypedComponent)

      // This should compile without TypeScript errors
      render(<WrappedComponent requiredProp='test' optionalProp={42} />)

      expect(
        screen.getByText('Required: test, Optional: 42')
      ).toBeInTheDocument()
    })
  })
})
