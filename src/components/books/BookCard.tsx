import React, { useState } from 'react';
import { Card, ProgressSlider, QuickActionButton, StatusIndicator } from '../ui';
import type { Book } from '../../types';

export interface BookCardProps {
  book: Book;
  onProgressUpdate?: (bookId: number, progress: number) => Promise<void>;
  onQuickAction?: (bookId: number, action: 'add10' | 'add25' | 'complete') => Promise<void>;
  onClick?: () => void;
  showQuickActions?: boolean;
  className?: string;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onProgressUpdate,
  onQuickAction,
  onClick,
  showQuickActions = true,
  className = '',
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticProgress, setOptimisticProgress] = useState(book.progress);

  const handleProgressChange = async (newProgress: number) => {
    if (!onProgressUpdate) return;

    // Optimistic update
    setOptimisticProgress(newProgress);
    setIsUpdating(true);

    try {
      await onProgressUpdate(book.id, newProgress);
    } catch (error) {
      // Revert on error
      setOptimisticProgress(book.progress);
      console.error('Failed to update progress:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAction = async (action: 'add10' | 'add25' | 'complete') => {
    if (!onQuickAction) return;

    let newProgress = optimisticProgress;
    
    // Calculate optimistic update
    switch (action) {
      case 'add10':
        newProgress = Math.min(100, optimisticProgress + 10);
        break;
      case 'add25':
        newProgress = Math.min(100, optimisticProgress + 25);
        break;
      case 'complete':
        newProgress = 100;
        break;
    }

    // Optimistic update
    setOptimisticProgress(newProgress);
    setIsUpdating(true);

    try {
      await onQuickAction(book.id, action);
    } catch (error) {
      // Revert on error
      setOptimisticProgress(book.progress);
      console.error('Failed to execute quick action:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderProgressControls = () => {
    if (book.status === 'want-to-read') {
      return (
        <div className="mt-3">
          <QuickActionButton
            onClick={() => handleQuickAction('add10')}
            variant="increment"
            size="md"
            className="w-full"
            disabled={isUpdating}
          >
            Start Reading
          </QuickActionButton>
        </div>
      );
    }

    if (book.status === 'reading') {
      return (
        <div className="mt-3 space-y-2">
          <ProgressSlider
            value={optimisticProgress}
            onChange={(newProgress) => {
              handleProgressChange(newProgress);
            }}
            disabled={isUpdating}
            showLabel={true}
          />
          {showQuickActions && (
            <div className="flex gap-2">
              <QuickActionButton
                onClick={() => handleQuickAction('add10')}
                disabled={isUpdating || optimisticProgress >= 100}
                className="flex-1"
              >
                +10%
              </QuickActionButton>
              <QuickActionButton
                onClick={() => handleQuickAction('add25')}
                disabled={isUpdating || optimisticProgress >= 100}
                className="flex-1"
              >
                +25%
              </QuickActionButton>
              <QuickActionButton
                onClick={() => handleQuickAction('complete')}
                disabled={isUpdating || optimisticProgress >= 100}
                className="flex-1"
              >
                ✓
              </QuickActionButton>
            </div>
          )}
        </div>
      );
    }

    if (book.status === 'finished') {
      return (
        <div className="mt-3">
          <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
            <span>Completed</span>
            <span className="font-medium text-green-600">100%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-lg overflow-hidden">
            <div className="h-full bg-green-500 rounded-lg w-full" />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card 
      onClick={onClick} 
      className={`relative transition-all duration-200 hover:shadow-md active:scale-98 ${className}`}
    >
      {/* Status Indicator */}
      <StatusIndicator 
        status={book.status} 
        className="absolute top-2 right-2 z-10" 
      />

      <div className="space-y-3">
        {/* Book Cover */}
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-4xl">
          📖
        </div>

        {/* Book Info */}
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
            {book.title}
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            {book.author}
          </p>

          {/* Progress Controls */}
          {renderProgressControls()}
        </div>

        {/* Loading Indicator */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </Card>
  );
};