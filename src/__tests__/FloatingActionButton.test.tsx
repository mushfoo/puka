import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FloatingActionButton from '@/components/FloatingActionButton';

describe('FloatingActionButton', () => {
  it('renders with default props', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Add new book');
    expect(button).toHaveAttribute('title', 'Add new book');
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<FloatingActionButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const mockOnClick = vi.fn();
    render(<FloatingActionButton onClick={mockOnClick} disabled={true} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('applies disabled styles when disabled', () => {
    render(<FloatingActionButton disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(button).toBeDisabled();
  });

  it('renders plus icon', () => {
    render(<FloatingActionButton />);
    
    // Check for SVG icon
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('width', '24');
    expect(icon).toHaveAttribute('height', '24');
  });

  it('has correct positioning classes', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'fixed',
      'bottom-6',
      'right-6',
      'z-50'
    );
  });

  it('has responsive sizing classes', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'w-14',
      'h-14',
      'sm:w-16',
      'sm:h-16'
    );
  });

  it('applies custom className', () => {
    render(<FloatingActionButton className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('uses custom aria label', () => {
    render(<FloatingActionButton ariaLabel="Custom label" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('title', 'Custom label');
  });

  it('handles touch interactions', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    
    // Simulate touch start
    fireEvent.touchStart(button);
    expect(button).toHaveClass('scale-95');
    
    // Simulate touch end
    fireEvent.touchEnd(button);
    expect(button).not.toHaveClass('scale-95');
  });

  it('handles mouse leave', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    
    // Simulate touch start then mouse leave
    fireEvent.touchStart(button);
    expect(button).toHaveClass('scale-95');
    
    fireEvent.mouseLeave(button);
    expect(button).not.toHaveClass('scale-95');
  });

  it('shows ripple effect on press', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    
    // Simulate touch start to trigger ripple
    fireEvent.touchStart(button);
    
    // Check for ripple element
    const ripple = button.querySelector('.animate-ping');
    expect(ripple).toBeInTheDocument();
  });

  it('has proper focus styles', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'focus:outline-none',
      'focus:ring-4',
      'focus:ring-primary/30'
    );
  });

  it('has hover and active states', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'hover:bg-primary/90',
      'hover:shadow-xl',
      'active:scale-95'
    );
  });

  it('maintains accessibility when disabled', () => {
    render(<FloatingActionButton disabled={true} ariaLabel="Add book" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-label', 'Add book');
  });

  it('has correct background and text colors', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'bg-primary',
      'text-white'
    );
  });

  it('maintains rounded shape', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-full');
  });

  it('has shadow effects', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'shadow-lg',
      'hover:shadow-xl'
    );
  });

  it('has proper transition classes', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'transition-all',
      'duration-200',
      'ease-out'
    );
  });

  it('centers content properly', () => {
    render(<FloatingActionButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'flex',
      'items-center',
      'justify-center'
    );
  });
});