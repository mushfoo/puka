import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QuickActionButton } from './QuickActionButton';

describe('QuickActionButton', () => {
  it('renders with children', () => {
    render(
      <QuickActionButton onClick={() => {}}>
        Test Button
      </QuickActionButton>
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Test Button');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <QuickActionButton onClick={handleClick}>
        Click me
      </QuickActionButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <QuickActionButton onClick={handleClick} disabled>
        Disabled
      </QuickActionButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies increment variant styles', () => {
    render(
      <QuickActionButton onClick={() => {}} variant="increment">
        +10%
      </QuickActionButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-secondary-blue');
  });

  it('applies complete variant styles', () => {
    render(
      <QuickActionButton onClick={() => {}} variant="complete">
        Done
      </QuickActionButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-secondary-green');
  });

  it('has minimum touch target size', () => {
    render(
      <QuickActionButton onClick={() => {}} size="sm">
        Small
      </QuickActionButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[44px]');
    expect(button).toHaveClass('min-w-[44px]');
  });

  it('applies disabled styles when disabled', () => {
    render(
      <QuickActionButton onClick={() => {}} disabled>
        Disabled
      </QuickActionButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('opacity-50');
    expect(button).toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('accepts custom className', () => {
    render(
      <QuickActionButton onClick={() => {}} className="custom-class">
        Custom
      </QuickActionButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <QuickActionButton onClick={() => {}} size="md">
        Medium
      </QuickActionButton>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[48px]');
    expect(button).toHaveClass('min-w-[48px]');

    rerender(
      <QuickActionButton onClick={() => {}} size="sm">
        Small
      </QuickActionButton>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[44px]');
    expect(button).toHaveClass('min-w-[44px]');
  });
});