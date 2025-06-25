import React, { useState } from 'react';

interface FloatingActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  ariaLabel = 'Add new book'
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const getButtonClasses = () => {
    const baseClasses = `
      fixed bottom-6 right-6 z-50
      w-14 h-14 sm:w-16 sm:h-16
      bg-primary hover:bg-primary/90 
      text-white
      rounded-full
      shadow-lg hover:shadow-xl
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-4 focus:ring-primary/30
      flex items-center justify-center
      active:scale-95
      transform
    `;

    if (disabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed hover:bg-primary hover:shadow-lg active:scale-100`;
    }

    if (isPressed) {
      return `${baseClasses} scale-95 shadow-md`;
    }

    return `${baseClasses} hover:scale-105`;
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled}
      className={`${getButtonClasses()} ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {/* Plus Icon */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 sm:w-7 sm:h-7"
        aria-hidden="true"
      >
        <path
          d="M12 5V19M5 12H19"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Ripple effect on press */}
      {isPressed && (
        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
      )}
    </button>
  );
};

export default FloatingActionButton;