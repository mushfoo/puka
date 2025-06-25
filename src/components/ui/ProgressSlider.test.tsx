import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressSlider } from './ProgressSlider';

// Mock getBoundingClientRect for slider positioning
const mockGetBoundingClientRect = vi.fn(() => ({
  left: 0,
  width: 200,
  height: 12,
  top: 0,
  right: 200,
  bottom: 12,
  x: 0,
  y: 0,
  toJSON: () => {},
}));

// Apply mock to slider element
Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: mockGetBoundingClientRect,
});

describe('ProgressSlider', () => {
  const defaultProps = {
    value: 50,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct initial value', () => {
    render(<ProgressSlider {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows label by default (legacy support)', () => {
    render(<ProgressSlider {...defaultProps} />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<ProgressSlider {...defaultProps} showLabel={false} />);
    
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
  });

  it('shows percentage scale when showPercentage is true and showLabel is false', () => {
    render(<ProgressSlider {...defaultProps} showLabel={false} showPercentage={true} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<ProgressSlider {...defaultProps} onChange={onChange} />);
    
    const slider = screen.getByRole('slider');
    
    // Click at 50% position (100px on 200px width)
    fireEvent.mouseDown(slider, { clientX: 100 });
    
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('calls onChangeComplete when mouse is released', () => {
    const onChangeComplete = vi.fn();
    render(
      <ProgressSlider {...defaultProps} onChangeComplete={onChangeComplete} />
    );
    
    const slider = screen.getByRole('slider');
    
    fireEvent.mouseDown(slider, { clientX: 100 });
    fireEvent.mouseUp(document);
    
    expect(onChangeComplete).toHaveBeenCalledWith(50);
  });

  it('snaps to 5% increments', () => {
    const onChange = vi.fn();
    render(<ProgressSlider {...defaultProps} onChange={onChange} />);
    
    const slider = screen.getByRole('slider');
    
    // Click at 47% position (94px on 200px width) - should snap to 45%
    fireEvent.mouseDown(slider, { clientX: 94 });
    
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it('handles keyboard navigation', () => {
    const onChange = vi.fn();
    const onChangeComplete = vi.fn();
    
    render(
      <ProgressSlider 
        value={50}
        onChange={onChange} 
        onChangeComplete={onChangeComplete}
      />
    );
    
    const thumb = screen.getByLabelText(/slider thumb/i);
    thumb.focus();
    
    vi.clearAllMocks();
    
    // Test arrow right (should increase by 5%)
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(55);
    expect(onChangeComplete).toHaveBeenCalledWith(55);
    
    vi.clearAllMocks();
    
    // Test arrow left (should decrease by 5% from current value)
    fireEvent.keyDown(thumb, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(50); // 55 - 5 = 50
    
    vi.clearAllMocks();
    
    // Test Home key (should go to 0%)
    fireEvent.keyDown(thumb, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(0);
    
    vi.clearAllMocks();
    
    // Test End key (should go to 100%)
    fireEvent.keyDown(thumb, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('does not respond when disabled', () => {
    const onChange = vi.fn();
    render(<ProgressSlider {...defaultProps} onChange={onChange} disabled />);
    
    const slider = screen.getByRole('slider');
    
    fireEvent.mouseDown(slider, { clientX: 100 });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies disabled styles when disabled', () => {
    render(<ProgressSlider {...defaultProps} disabled />);
    
    const sliderContainer = screen.getByRole('slider');
    expect(sliderContainer).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles touch events', () => {
    const onChange = vi.fn();
    render(<ProgressSlider {...defaultProps} onChange={onChange} />);
    
    const slider = screen.getByRole('slider');
    
    fireEvent.touchStart(slider, {
      touches: [{ clientX: 100 }],
    });
    
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('normalizes values outside 0-100 range', () => {
    const { rerender } = render(<ProgressSlider value={-10} onChange={vi.fn()} />);
    
    let slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    
    rerender(<ProgressSlider value={150} onChange={vi.fn()} />);
    
    slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('updates when value prop changes', () => {
    const { rerender } = render(<ProgressSlider value={30} onChange={vi.fn()} />);
    
    let slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '30');
    
    rerender(<ProgressSlider value={70} onChange={vi.fn()} />);
    
    slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '70');
  });

  it('applies custom className', () => {
    render(<ProgressSlider {...defaultProps} className="custom-class" />);
    
    const container = screen.getByRole('slider').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ProgressSlider {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-label', 'Reading progress: 50%');
    
    const thumb = screen.getByLabelText(/slider thumb/i);
    expect(thumb).toHaveAttribute('tabIndex', '0');
  });

  it('disables keyboard navigation when disabled', () => {
    const onChange = vi.fn();
    render(<ProgressSlider {...defaultProps} onChange={onChange} disabled />);
    
    const thumb = screen.getByLabelText(/slider thumb/i);
    expect(thumb).toHaveAttribute('tabIndex', '-1');
    
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has touch-optimized thumb size', () => {
    render(<ProgressSlider {...defaultProps} />);
    
    const thumb = screen.getByLabelText(/slider thumb/i);
    // Check that the thumb container has 44px touch target
    expect(thumb).toHaveClass('w-11', 'h-11'); // 44px each for touch target
    
    // Check that the visual thumb inside exists
    const visualThumb = thumb.querySelector('div');
    expect(visualThumb).toHaveClass('w-6', 'h-6'); // 24px visual size
  });

  it('shows visual feedback during dragging', () => {
    render(<ProgressSlider {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    const thumb = screen.getByLabelText(/slider thumb/i);
    
    // Start dragging
    fireEvent.mouseDown(slider, { clientX: 100 });
    
    // Visual thumb should have dragging styles
    const visualThumb = thumb.querySelector('div');
    expect(visualThumb).toHaveClass('scale-110', 'shadow-lg');
    
    // End dragging
    fireEvent.mouseUp(document);
    
    // Dragging styles should be removed (not scale-110)
    expect(thumb).not.toHaveClass('scale-110');
  });
});