import React from 'react';
import type { Book } from '../../types';

export interface StatusIndicatorProps {
  status: Book['status'];
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  className = '',
}) => {
  const getStatusColor = (status: Book['status']) => {
    switch (status) {
      case 'finished':
        return 'bg-green-500'; // Green for completed
      case 'reading':
        return 'bg-orange-500'; // Orange for currently reading
      case 'want-to-read':
        return 'bg-gray-400'; // Gray for want to read
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div 
      className={`w-2 h-2 rounded-full ${getStatusColor(status)} ${className}`}
      aria-label={`Status: ${status === 'want-to-read' ? 'want to read' : status}`}
    />
  );
};