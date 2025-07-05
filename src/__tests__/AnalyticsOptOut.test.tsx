import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnalyticsOptOut } from '../components/analytics/AnalyticsOptOut'

// Mock analytics utils
vi.mock('../utils/analytics', () => ({
  getAnalyticsState: vi.fn(() => ({
    enabled: true,
    optOutAvailable: true,
    hasOptedOut: false,
    domain: 'test-domain.com'
  })),
  setOptOut: vi.fn(),
  hasOptedOut: vi.fn(() => false)
}))

describe('AnalyticsOptOut Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render analytics opt-out component', () => {
    render(<AnalyticsOptOut />)
    
    expect(screen.getByText('Privacy & Analytics')).toBeInTheDocument()
    expect(screen.getByText('What we track:')).toBeInTheDocument()
    expect(screen.getByText('What we don\'t track:')).toBeInTheDocument()
  })

  it('should show correct privacy information', () => {
    render(<AnalyticsOptOut />)
    
    // Check tracking information
    expect(screen.getByText('Page views and feature usage')).toBeInTheDocument()
    expect(screen.getByText('Performance metrics')).toBeInTheDocument()
    expect(screen.getByText('Anonymous error reports')).toBeInTheDocument()
    
    // Check non-tracking information
    expect(screen.getByText('Book titles, authors, or reading data')).toBeInTheDocument()
    expect(screen.getByText('Personal information or account details')).toBeInTheDocument()
  })

  it('should display current analytics status', () => {
    render(<AnalyticsOptOut />)
    
    expect(screen.getByText('Currently enabled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument()
  })

  it('should handle opt-out toggle', () => {
    const { setOptOut } = require('../utils/analytics')
    render(<AnalyticsOptOut />)
    
    const toggleButton = screen.getByRole('button', { name: 'Disable' })
    fireEvent.click(toggleButton)
    
    expect(setOptOut).toHaveBeenCalledWith(true)
  })

  it('should show close button when onClose is provided', () => {
    const mockOnClose = vi.fn()
    render(<AnalyticsOptOut onClose={mockOnClose} />)
    
    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(closeButton).toBeInTheDocument()
    
    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should not render when analytics is disabled', () => {
    const { getAnalyticsState } = require('../utils/analytics')
    getAnalyticsState.mockReturnValue({
      enabled: false,
      optOutAvailable: true,
      hasOptedOut: false,
      domain: 'test-domain.com'
    })
    
    const { container } = render(<AnalyticsOptOut />)
    expect(container.firstChild).toBeNull()
  })

  it('should not render when opt-out is not available', () => {
    const { getAnalyticsState } = require('../utils/analytics')
    getAnalyticsState.mockReturnValue({
      enabled: true,
      optOutAvailable: false,
      hasOptedOut: false,
      domain: 'test-domain.com'
    })
    
    const { container } = render(<AnalyticsOptOut />)
    expect(container.firstChild).toBeNull()
  })
})