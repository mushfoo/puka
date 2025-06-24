import React from 'react';

export interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };
  
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      {showText && (
        <p className="text-sm text-gray-600">
          {normalizedProgress}% complete
        </p>
      )}
    </div>
  );
};