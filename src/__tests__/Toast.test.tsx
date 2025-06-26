import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toast from '@/components/Toast';
import { ToastMessage } from '@/types';

describe('Toast', () => {
  const mockOnDismiss = vi.fn();
  
  const baseToast: ToastMessage = {
    id: 'test-toast-1',
    type: 'success',
    message: 'Test message',
    duration: 5000,
    dismissible: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success toast with correct styling', () => {
    render(<Toast toast={baseToast} onDismiss={mockOnDismiss} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800');
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders error toast with correct styling', () => {
    const errorToast = { ...baseToast, type: 'error' as const };
    render(<Toast toast={errorToast} onDismiss={mockOnDismiss} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
  });

  it('renders warning toast with correct styling', () => {
    const warningToast = { ...baseToast, type: 'warning' as const };
    render(<Toast toast={warningToast} onDismiss={mockOnDismiss} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
  });

  it('renders info toast with correct styling', () => {
    const infoToast = { ...baseToast, type: 'info' as const };
    render(<Toast toast={infoToast} onDismiss={mockOnDismiss} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
  });

  it('renders toast with title and message', () => {
    const toastWithTitle = { 
      ...baseToast, 
      title: 'Success!',
      message: 'Operation completed successfully'
    };
    render(<Toast toast={toastWithTitle} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
  });

  it('shows dismiss button when dismissible', () => {
    render(<Toast toast={baseToast} onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss notification');
    expect(dismissButton).toBeInTheDocument();
  });

  it('hides dismiss button when not dismissible', () => {
    const nonDismissibleToast = { ...baseToast, dismissible: false };
    render(<Toast toast={nonDismissibleToast} onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.queryByLabelText('Dismiss notification');
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    render(<Toast toast={baseToast} onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss notification');
    
    act(() => {
      fireEvent.click(dismissButton);
    });
    
    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
  });

  it('auto-dismisses after duration', async () => {
    render(<Toast toast={baseToast} onDismiss={mockOnDismiss} />);
    
    // Fast-forward time to trigger auto-dismiss
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
  });

  it('renders action button when provided', () => {
    const toastWithAction = {
      ...baseToast,
      action: {
        label: 'Undo',
        onClick: vi.fn()
      }
    };
    render(<Toast toast={toastWithAction} onDismiss={mockOnDismiss} />);
    
    const actionButton = screen.getByText('Undo');
    expect(actionButton).toBeInTheDocument();
  });

  it('calls action onClick and dismisses when action button is clicked', async () => {
    const mockActionClick = vi.fn();
    const toastWithAction = {
      ...baseToast,
      action: {
        label: 'Undo',
        onClick: mockActionClick
      }
    };
    render(<Toast toast={toastWithAction} onDismiss={mockOnDismiss} />);
    
    const actionButton = screen.getByText('Undo');
    
    act(() => {
      fireEvent.click(actionButton);
    });
    
    expect(mockActionClick).toHaveBeenCalled();
    
    // Wait for animation delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
  });

  it('has proper accessibility attributes', () => {
    render(<Toast toast={baseToast} onDismiss={mockOnDismiss} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('applies correct position classes', () => {
    const { rerender } = render(
      <Toast toast={baseToast} onDismiss={mockOnDismiss} position="top-left" />
    );
    
    let toast = screen.getByRole('alert');
    expect(toast).toHaveClass('top-4', 'left-4');
    
    rerender(<Toast toast={baseToast} onDismiss={mockOnDismiss} position="bottom-center" />);
    
    toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bottom-4', 'left-1/2', '-translate-x-1/2');
  });

  it('shows correct icon for each toast type', () => {
    const { rerender } = render(<Toast toast={baseToast} onDismiss={mockOnDismiss} />);
    
    // Success toast should have checkmark icon
    let icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toHaveClass('text-green-600');
    
    // Error toast should have X icon
    rerender(<Toast toast={{ ...baseToast, type: 'error' }} onDismiss={mockOnDismiss} />);
    icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toHaveClass('text-red-600');
    
    // Warning toast should have warning icon
    rerender(<Toast toast={{ ...baseToast, type: 'warning' }} onDismiss={mockOnDismiss} />);
    icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toHaveClass('text-yellow-600');
    
    // Info toast should have info icon
    rerender(<Toast toast={{ ...baseToast, type: 'info' }} onDismiss={mockOnDismiss} />);
    icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toHaveClass('text-blue-600');
  });
});