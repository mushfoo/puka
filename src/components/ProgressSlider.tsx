import React, { useState, useEffect } from 'react';

interface ProgressSliderProps {
  /** Current progress value (0-100) */
  value: number;
  /** Callback when progress changes */
  onChange?: (value: number) => void;
  /** Callback when user finishes dragging */
  onChangeComplete?: (value: number) => void;
  /** Whether the slider is interactive */
  interactive?: boolean;
  /** Show percentage label */
  showLabel?: boolean;
  /** Label text */
  label?: string;
  /** Custom className for the container */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Color of the progress bar */
  color?: 'primary' | 'success' | 'warning' | 'error';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const ProgressSlider: React.FC<ProgressSliderProps> = ({
  value,
  onChange,
  onChangeComplete,
  interactive = true,
  showLabel = true,
  label = 'Progress',
  className = '',
  disabled = false,
  color = 'primary',
  size = 'md'
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setLocalValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleChangeComplete = () => {
    if (onChangeComplete) {
      onChangeComplete(localValue);
    }
  };

  const getColorClass = () => {
    const colors = {
      primary: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error'
    };
    return colors[color];
  };

  const getSizeClass = () => {
    const sizes = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };
    return sizes[size];
  };

  const getLabelSizeClass = () => {
    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    return sizes[size];
  };

  return (
    <div className={`progress-slider ${className}`}>
      {showLabel && (
        <div className={`flex justify-between items-center mb-2 ${getLabelSizeClass()}`}>
          <span className="font-medium text-text-primary">{label}</span>
          <span className="text-text-secondary">{localValue}%</span>
        </div>
      )}
      
      <div className="relative">
        {/* Progress Bar Background */}
        <div className={`w-full bg-neutral-200 rounded-full ${getSizeClass()}`}>
          {/* Progress Bar Fill */}
          <div 
            className={`${getColorClass()} ${getSizeClass()} rounded-full transition-all duration-300`}
            style={{ width: `${localValue}%` }}
          />
        </div>
        
        {/* Interactive Slider Overlay */}
        {interactive && !disabled && (
          <input
            type="range"
            min="0"
            max="100"
            value={localValue}
            onChange={handleChange}
            onMouseUp={handleChangeComplete}
            onTouchEnd={handleChangeComplete}
            disabled={disabled}
            className={`absolute top-0 left-0 w-full ${getSizeClass()} opacity-0 cursor-pointer disabled:cursor-not-allowed`}
            aria-label={label}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressSlider;