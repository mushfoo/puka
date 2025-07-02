import React, { useMemo } from 'react';
import { ReadingDayEntry } from '@/types';

interface CalendarDayCellProps {
  date: string; // YYYY-MM-DD format
  readingData?: ReadingDayEntry;
  bookCount?: number;
  isSelected?: boolean;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  onClick: (date: string) => void;
  onKeyDown?: (event: React.KeyboardEvent, date: string) => void;
}

interface StatusIndicatorProps {
  type: 'manual' | 'book_completion' | 'progress_update' | 'notes';
  size?: 'sm' | 'md';
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  type, 
  size = 'sm',
  className = '' 
}) => {
  const sizeClasses = size === 'md' ? 'w-3 h-3' : 'w-2 h-2';
  
  switch (type) {
    case 'manual':
      return (
        <div 
          className={`${sizeClasses} bg-success rounded-full ${className}`}
          title="Manual reading day"
          aria-label="Manual reading day"
        />
      );
    case 'book_completion':
      return (
        <div 
          className={`${sizeClasses} flex items-center justify-center ${className}`}
          title="Book completed"
          aria-label="Book completed"
        >
          <svg 
            className="w-full h-full text-blue-600" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      );
    case 'progress_update':
      return (
        <div 
          className={`${sizeClasses} bg-warning rounded-full ${className}`}
          title="Progress updated"
          aria-label="Progress updated"
        />
      );
    case 'notes':
      return (
        <div 
          className={`${sizeClasses} flex items-center justify-center ${className}`}
          title="Has notes"
          aria-label="Has notes"
        >
          <svg 
            className="w-full h-full text-text-secondary" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 3a1 1 0 000 2h8a1 1 0 100-2H5zm0 3a1 1 0 000 2h3a1 1 0 100-2H5z" clipRule="evenodd"/>
          </svg>
        </div>
      );
    default:
      return null;
  }
};

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  readingData,
  bookCount = 0,
  isSelected = false,
  isToday = false,
  isCurrentMonth = true,
  onClick,
  onKeyDown
}) => {
  // Parse the date to get day number
  const dayNumber = useMemo(() => {
    const dateObj = new Date(date + 'T00:00:00');
    return dateObj.getDate();
  }, [date]);

  // Analyze reading data to determine status indicators
  const statusIndicators = useMemo(() => {
    if (!readingData) return [];
    
    const indicators: Array<'manual' | 'book_completion' | 'progress_update' | 'notes'> = [];
    
    // Check sources for different types of reading activity
    const sources = readingData.sources || [];
    
    // Determine source types
    const hasManual = sources.some(source => source.type === 'manual');
    const hasBookCompletion = sources.some(source => source.type === 'book_completion');
    const hasProgressUpdate = sources.some(source => source.type === 'progress_update');
    const hasNotes = Boolean(readingData.notes?.trim());
    
    // Add indicators based on priority (manual reading takes precedence)
    if (hasManual) {
      indicators.push('manual');
    } else if (hasBookCompletion) {
      indicators.push('book_completion');
    } else if (hasProgressUpdate) {
      indicators.push('progress_update');
    }
    
    // Always show notes indicator if present
    if (hasNotes) {
      indicators.push('notes');
    }
    
    return indicators;
  }, [readingData]);

  // Generate CSS classes for the cell
  const cellClasses = useMemo(() => {
    const baseClasses = [
      'relative',
      'min-h-[44px]', // Minimum touch target size
      'min-w-[44px]',
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'p-1',
      'rounded-lg',
      'cursor-pointer',
      'transition-all',
      'duration-200',
      'select-none',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary/20',
      'focus:ring-offset-1'
    ];
    
    // Current month vs other month styling
    if (!isCurrentMonth) {
      baseClasses.push('text-text-secondary/40', 'hover:text-text-secondary/60');
    } else {
      baseClasses.push('text-text-primary');
    }
    
    // Today highlighting
    if (isToday) {
      baseClasses.push(
        'bg-primary/10',
        'border-2',
        'border-primary',
        'font-semibold',
        'text-primary'
      );
    } else {
      baseClasses.push('border-2', 'border-transparent');
    }
    
    // Selection state
    if (isSelected) {
      baseClasses.push(
        'bg-accent/20',
        'border-accent',
        'ring-2',
        'ring-accent/30'
      );
    }
    
    // Hover states (only for current month)
    if (isCurrentMonth) {
      if (!isSelected && !isToday) {
        baseClasses.push('hover:bg-background/80', 'hover:border-border');
      }
    }
    
    // Reading data present
    if (statusIndicators.length > 0) {
      baseClasses.push('bg-success/5');
    }
    
    return baseClasses.join(' ');
  }, [isCurrentMonth, isToday, isSelected, statusIndicators.length]);

  // Handle click events
  const handleClick = () => {
    onClick(date);
  };

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(date);
    }
    
    if (onKeyDown) {
      onKeyDown(event, date);
    }
  };

  // Generate aria-label for accessibility
  const ariaLabel = useMemo(() => {
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const labels = [formattedDate];
    
    if (isToday) {
      labels.push('Today');
    }
    
    if (statusIndicators.length > 0) {
      labels.push('Has reading activity');
    }
    
    if (bookCount > 0) {
      labels.push(`${bookCount} book${bookCount === 1 ? '' : 's'}`);
    }
    
    if (isSelected) {
      labels.push('Selected');
    }
    
    return labels.join(', ');
  }, [date, isToday, statusIndicators.length, bookCount, isSelected]);

  return (
    <button
      className={cellClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      role="gridcell"
      tabIndex={isCurrentMonth ? 0 : -1}
      type="button"
    >
      {/* Day number */}
      <span className="text-sm font-medium leading-none mb-1">
        {dayNumber}
      </span>
      
      {/* Status indicators container */}
      {statusIndicators.length > 0 && (
        <div className="flex items-center justify-center gap-0.5 flex-wrap max-w-full">
          {statusIndicators.slice(0, 3).map((indicator, index) => (
            <StatusIndicator
              key={`${indicator}-${index}`}
              type={indicator}
              size="sm"
              className="flex-shrink-0"
            />
          ))}
          {statusIndicators.length > 3 && (
            <span 
              className="text-xs text-text-secondary ml-0.5"
              title={`${statusIndicators.length - 3} more indicators`}
            >
              +{statusIndicators.length - 3}
            </span>
          )}
        </div>
      )}
      
      {/* Book count indicator (small text below indicators) */}
      {bookCount > 0 && statusIndicators.length === 0 && (
        <div className="text-xs text-text-secondary leading-none">
          {bookCount}
        </div>
      )}
      
      {/* Today indicator dot (if no other indicators) */}
      {isToday && statusIndicators.length === 0 && (
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
      )}
    </button>
  );
};

export default CalendarDayCell;