import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LegalModal } from '../components/legal/LegalModal'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
vi.stubGlobal('localStorage', localStorageMock)

describe('LegalModal Component', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    const { container } = render(
      <LegalModal isOpen={false} onClose={mockOnClose} document="terms" />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should render Terms of Service modal when open', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    expect(screen.getByText('Last updated: July 5, 2025')).toBeInTheDocument()
    expect(screen.getByLabelText('I have read and agree to the Terms of Service')).toBeInTheDocument()
  })

  it('should render Privacy Policy modal when open', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="privacy" />
    )
    
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    expect(screen.getByText('Last updated: July 5, 2025')).toBeInTheDocument()
    expect(screen.queryByLabelText('I have read and agree to the Terms of Service')).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when cancel button is clicked', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should disable accept button until checkbox is checked', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    const acceptButton = screen.getByRole('button', { name: 'Accept Terms' })
    expect(acceptButton).toBeDisabled()
    
    const checkbox = screen.getByLabelText('I have read and agree to the Terms of Service')
    fireEvent.click(checkbox)
    
    expect(acceptButton).not.toBeDisabled()
  })

  it('should store terms acceptance when accept button is clicked', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    const checkbox = screen.getByLabelText('I have read and agree to the Terms of Service')
    fireEvent.click(checkbox)
    
    const acceptButton = screen.getByRole('button', { name: 'Accept Terms' })
    fireEvent.click(acceptButton)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'puka-terms-accepted',
      expect.stringContaining('"accepted":true')
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show different content for terms vs privacy', () => {
    const { rerender } = render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    expect(screen.getByText('Welcome to Puka Reading Tracker')).toBeInTheDocument()
    
    rerender(
      <LegalModal isOpen={true} onClose={mockOnClose} document="privacy" />
    )
    
    expect(screen.getByText('Your Privacy Matters')).toBeInTheDocument()
  })

  it('should show close button for privacy modal', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="privacy" />
    )
    
    const closeButton = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should display key privacy information', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="privacy" />
    )
    
    expect(screen.getByText('Data We Store Locally')).toBeInTheDocument()
    expect(screen.getByText('Cloud Sync (Optional)')).toBeInTheDocument()
    expect(screen.getByText('Your Rights')).toBeInTheDocument()
    expect(screen.getByText('What We Don\'t Collect')).toBeInTheDocument()
  })

  it('should display key terms information', () => {
    render(
      <LegalModal isOpen={true} onClose={mockOnClose} document="terms" />
    )
    
    expect(screen.getByText('Service Description')).toBeInTheDocument()
    expect(screen.getByText('Acceptable Use')).toBeInTheDocument()
    expect(screen.getByText('Your Data')).toBeInTheDocument()
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument()
  })
})