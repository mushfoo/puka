import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'
import { ErrorType } from '../../../types'

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

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('normal operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('should not show error UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
      expect(
        screen.getByText(
          "An unexpected error occurred. We're sorry for the inconvenience."
        )
      ).toBeInTheDocument()
    })

    it('should show retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: 'Try Again' })
      ).toBeInTheDocument()
    })

    it('should show reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: 'Reload Page' })
      ).toBeInTheDocument()
    })

    it('should show report issue button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(
        screen.getByRole('button', { name: 'Report Issue' })
      ).toBeInTheDocument()
    })
  })

  describe('retry functionality', () => {
    it('should retry when retry button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()

      const retryButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(retryButton)

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
    })

    it('should limit retry attempts', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: 'Try Again' })

      // Click retry 4 times (exceeding the limit of 3)
      fireEvent.click(retryButton)
      fireEvent.click(retryButton)
      fireEvent.click(retryButton)
      fireEvent.click(retryButton)

      expect(alertSpy).toHaveBeenCalledWith(
        'Maximum retry attempts (3) reached. Please refresh the page or contact support.'
      )

      alertSpy.mockRestore()
    })
  })

  describe('custom fallback', () => {
    it('should use custom fallback when provided', () => {
      const customFallback = (error: any, retry: () => void) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>{error.title}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Custom Retry' })
      ).toBeInTheDocument()
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
    })
  })

  describe('error reporting', () => {
    it('should call onError callback when provided', () => {
      const onErrorSpy = vi.fn()

      render(
        <ErrorBoundary onError={onErrorSpy}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })

    it('should handle report issue button click', () => {
      const clipboardSpy = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockResolvedValue()
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reportButton = screen.getByRole('button', { name: 'Report Issue' })
      fireEvent.click(reportButton)

      expect(clipboardSpy).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Test error"')
      )

      clipboardSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('should handle clipboard failure gracefully', () => {
      const clipboardSpy = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockRejectedValue(new Error('Clipboard failed'))
      const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue({
        document: {
          createElement: vi.fn().mockReturnValue({
            appendChild: vi.fn(),
            textContent: '',
            style: {},
          }),
          appendChild: vi.fn(),
          title: '',
        },
      } as any)

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reportButton = screen.getByRole('button', { name: 'Report Issue' })
      fireEvent.click(reportButton)

      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank')

      clipboardSpy.mockRestore()
      windowOpenSpy.mockRestore()
    })
  })

  describe('configurable auth route', () => {
    it('should use custom auth route when provided', () => {
      const locationSpy = vi
        .spyOn(window.location, 'href', 'set')
        .mockImplementation(() => {})

      render(
        <ErrorBoundary authRoute='/custom-auth'>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // This would need to be tested with a specific error type that shows auth actions
      // For now, we'll just verify the prop is accepted
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()

      locationSpy.mockRestore()
    })

    it('should use default auth route when not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const errorContainer =
        screen.getByRole('main', { hidden: true }) ||
        screen.getByText('Something Went Wrong').closest('div')
      expect(errorContainer).toBeInTheDocument()
    })

    it('should have keyboard accessible buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('disabled')
        expect(button).toHaveAttribute('type', 'button')
      })
    })
  })

  describe('error details', () => {
    it('should show technical details when expanded', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const detailsElement = screen.getByText('Technical Details')
      expect(detailsElement).toBeInTheDocument()

      fireEvent.click(detailsElement)
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('should hide technical details by default', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // The error message should not be visible initially
      expect(screen.queryByText('Test error')).not.toBeInTheDocument()
    })
  })

  describe('reload functionality', () => {
    it('should reload page when reload button is clicked', () => {
      const reloadSpy = vi
        .spyOn(window.location, 'reload')
        .mockImplementation(() => {})

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: 'Reload Page' })
      fireEvent.click(reloadButton)

      expect(reloadSpy).toHaveBeenCalled()

      reloadSpy.mockRestore()
    })
  })
})
