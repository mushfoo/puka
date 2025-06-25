import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface ProgressSliderProps {
  value: number;
  onChange: (value: number) => void;
  onChangeComplete?: (value: number) => void;
  disabled?: boolean;
  showPercentage?: boolean;
  showLabel?: boolean; // Legacy support for existing usage
  className?: string;
}

export const ProgressSlider: React.FC<ProgressSliderProps> = ({
  value,
  onChange,
  onChangeComplete,
  disabled = false,
  showPercentage = true,
  showLabel = true, // Default to true for backward compatibility
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Normalize value to 0-100 range
  const normalizedValue = Math.min(Math.max(localValue, 0), 100);

  // Snap to 5% increments
  const snapToIncrement = (val: number): number => {
    return Math.round(val / 5) * 5;
  };

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const updateValueFromPosition = useCallback((clientX: number) => {
    if (!sliderRef.current || disabled) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.min(Math.max((clientX - rect.left) / rect.width * 100, 0), 100);
    const snappedValue = snapToIncrement(percentage);
    
    setLocalValue(snappedValue);
    onChange(snappedValue);
  }, [onChange, disabled]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    updateValueFromPosition(e.clientX);
    
    // Focus the thumb for keyboard accessibility
    thumbRef.current?.focus();
  }, [updateValueFromPosition, disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    updateValueFromPosition(e.clientX);
  }, [isDragging, updateValueFromPosition, disabled]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    onChangeComplete?.(normalizedValue);
  }, [isDragging, normalizedValue, onChangeComplete]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updateValueFromPosition(touch.clientX);
    
    // Focus the thumb for accessibility
    thumbRef.current?.focus();
  }, [updateValueFromPosition, disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || disabled) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateValueFromPosition(touch.clientX);
  }, [isDragging, updateValueFromPosition, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    onChangeComplete?.(normalizedValue);
  }, [isDragging, normalizedValue, onChangeComplete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = normalizedValue;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = Math.max(0, normalizedValue - 5);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = Math.min(100, normalizedValue + 5);
        break;
      case 'Home':
        e.preventDefault();
        newValue = 0;
        break;
      case 'End':
        e.preventDefault();
        newValue = 100;
        break;
      default:
        return;
    }
    
    setLocalValue(newValue);
    onChange(newValue);
    onChangeComplete?.(newValue);
  }, [normalizedValue, onChange, onChangeComplete, disabled]);

  // Add global event listeners for mouse/touch events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const baseClasses = 'relative w-full touch-none select-none';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const classes = `${baseClasses} ${disabledClasses}`;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Legacy showLabel support for existing BookCard usage */}
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs font-medium text-gray-800">{normalizedValue}%</span>
        </div>
      )}
      
      <div
        ref={sliderRef}
        className={classes}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-valuenow={normalizedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Reading progress: ${normalizedValue}%`}
      >
        {/* Track */}
        <div className="h-3 bg-gray-200 rounded-full relative overflow-hidden">
          {/* Progress fill */}
          <div
            className={`h-full bg-primary rounded-full transition-all duration-200 ease-out ${
              isDragging ? 'transition-none' : ''
            }`}
            style={{ width: `${normalizedValue}%` }}
          />
          
          {/* Thumb with 44px touch target */}
          <div
            ref={thumbRef}
            className={`
              absolute top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
            `}
            style={{ 
              left: `calc(${normalizedValue}% - 22px)`, // Center the 44px container
              touchAction: 'none'
            }}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
            aria-label={`Slider thumb, current value ${normalizedValue}%`}
          >
            {/* Visual thumb inside the touch target */}
            <div
              className={`
                w-6 h-6 bg-white border-2 border-primary rounded-full shadow-md 
                transition-all duration-200 ease-out
                ${isDragging ? 'scale-110 shadow-lg transition-none' : 'hover:scale-105'}
              `}
            />
          </div>
        </div>
      </div>
      
      {/* New showPercentage prop for additional percentage display */}
      {showPercentage && !showLabel && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>0%</span>
          <span className="font-medium text-primary">{normalizedValue}%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};