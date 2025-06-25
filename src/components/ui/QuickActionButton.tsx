import React from 'react';

export interface QuickActionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'increment' | 'complete' | 'default';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  className = '',
  size = 'sm',
}) => {
  // Base classes ensuring minimum 44px touch target for accessibility
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95 touch-manipulation';
  
  // Variant-specific styling using the project's color tokens
  const variantClasses = {
    increment: 'bg-secondary-blue hover:bg-blue-600 text-white focus:ring-blue-300 shadow-sm hover:shadow-md',
    complete: 'bg-secondary-green hover:bg-green-600 text-white focus:ring-green-300 shadow-sm hover:shadow-md',
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-300 border border-gray-200',
  };
  
  // Size classes with minimum touch target consideration
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs min-h-[44px] min-w-[44px]', // Ensures 44px minimum touch target
    md: 'px-4 py-2.5 text-sm min-h-[48px] min-w-[48px]', // Slightly larger for better visibility
  };
  
  // Disabled state styling
  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed pointer-events-none' 
    : 'cursor-pointer';
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;
  
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={classes}
      disabled={disabled}
      {...(disabled && { 'aria-disabled': 'true' })}
    >
      {children}
    </button>
  );
};