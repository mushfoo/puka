import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ProgressSlider from '@/components/ProgressSlider';

describe('ProgressSlider', () => {
  const defaultProps = {
    value: 50,
    onChange: vi.fn(),
    onChangeComplete: vi.fn()
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<ProgressSlider {...defaultProps} />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<ProgressSlider {...defaultProps} label="Reading Progress" />);
    
    expect(screen.getByText('Reading Progress')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<ProgressSlider {...defaultProps} showLabel={false} />);
    
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('updates value when slider changes', () => {
    const mockOnChange = vi.fn();
    render(<ProgressSlider {...defaultProps} onChange={mockOnChange} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(75);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('calls onChangeComplete on mouse up', () => {
    const mockOnChangeComplete = vi.fn();
    render(<ProgressSlider {...defaultProps} onChangeComplete={mockOnChangeComplete} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.mouseUp(slider);
    
    expect(mockOnChangeComplete).toHaveBeenCalledWith(75);
  });

  it('calls onChangeComplete on touch end', () => {
    const mockOnChangeComplete = vi.fn();
    render(<ProgressSlider {...defaultProps} onChangeComplete={mockOnChangeComplete} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.touchEnd(slider);
    
    expect(mockOnChangeComplete).toHaveBeenCalledWith(75);
  });

  it('does not render interactive slider when interactive is false', () => {
    render(<ProgressSlider {...defaultProps} interactive={false} />);
    
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('disables slider when disabled prop is true', () => {
    render(<ProgressSlider {...defaultProps} disabled={true} />);
    
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ProgressSlider {...defaultProps} className="custom-class" />);
    
    expect(container.querySelector('.progress-slider')).toHaveClass('custom-class');
  });

  it('renders with different color variants', () => {
    const colors = ['primary', 'success', 'warning', 'error'] as const;
    
    colors.forEach((color) => {
      const { container } = render(<ProgressSlider {...defaultProps} color={color} />);
      const progressBar = container.querySelector(`.bg-${color}`);
      expect(progressBar).toBeInTheDocument();
    });
  });

  it('renders with different size variants', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const expectedHeights = ['h-1', 'h-2', 'h-3'];
    
    sizes.forEach((size, index) => {
      const { container } = render(<ProgressSlider {...defaultProps} size={size} />);
      const progressBar = container.querySelector(`.${expectedHeights[index]}`);
      expect(progressBar).toBeInTheDocument();
    });
  });

  it('displays correct progress bar width', () => {
    const { container } = render(<ProgressSlider {...defaultProps} value={75} />);
    
    const progressBar = container.querySelector('.bg-primary');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('updates local value when prop value changes', () => {
    const { rerender } = render(<ProgressSlider {...defaultProps} value={25} />);
    
    expect(screen.getByText('25%')).toBeInTheDocument();
    
    rerender(<ProgressSlider {...defaultProps} value={80} />);
    
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('has proper aria-label for accessibility', () => {
    render(<ProgressSlider {...defaultProps} label="Book Progress" />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-label', 'Book Progress');
  });

  it('handles edge cases for progress values', () => {
    const { rerender } = render(<ProgressSlider {...defaultProps} value={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    
    rerender(<ProgressSlider {...defaultProps} value={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('does not call onChangeComplete if value has not changed', () => {
    const mockOnChangeComplete = vi.fn();
    render(<ProgressSlider {...defaultProps} value={50} onChangeComplete={mockOnChangeComplete} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.mouseUp(slider);
    
    expect(mockOnChangeComplete).not.toHaveBeenCalled();
  });
});