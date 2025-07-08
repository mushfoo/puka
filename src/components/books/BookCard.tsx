import React, { useState, useRef, useEffect } from 'react';
import { Book } from '@/types';
import ProgressSlider from '@/components/ProgressSlider';

interface BookCardProps {
  book: Book;
  onUpdateProgress?: (bookId: number, progress: number) => void;
  onQuickUpdate?: (bookId: number, increment: number) => void;
  onMarkComplete?: (bookId: number) => void;
  onChangeStatus?: (bookId: number, status: Book['status']) => void;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  showQuickActions?: boolean;
  interactive?: boolean;
  className?: string;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  onUpdateProgress,
  onQuickUpdate,
  onMarkComplete,
  onEdit,
  onDelete,
  showQuickActions = true,
  interactive = true,
  className = ''
}) => {
  const [localProgress, setLocalProgress] = useState(book.progress);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [gestureState, setGestureState] = useState({ 
    isDragging: false, 
    startX: 0, 
    startY: 0, 
    deltaX: 0,
    gestureHint: '' 
  });
  const [undoTimeout, setUndoTimeout] = useState<number | null>(null);
  const [lastGestureAction, setLastGestureAction] = useState<{ type: string, value: number } | null>(null);
  
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  // Clear undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  // Gesture handling functions
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive || book.status !== 'currently_reading') return;
    
    const touch = e.touches[0];
    setGestureState({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      gestureHint: ''
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!gestureState.isDragging || !interactive || book.status !== 'currently_reading') return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - gestureState.startX;
    const deltaY = touch.clientY - gestureState.startY;
    
    // Detect if this is primarily vertical scrolling
    const isVerticalScroll = Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20;
    
    // If vertical scrolling detected, abandon gesture
    if (isVerticalScroll) {
      setGestureState(prev => ({ ...prev, isDragging: false, gestureHint: '' }));
      return;
    }
    
    // Only process horizontal gestures with significant movement
    if (Math.abs(deltaX) < 30) {
      return;
    }
    
    // Prevent default scrolling for horizontal gestures
    e.preventDefault();

    const threshold = 60; // Minimum swipe distance
    let hint = '';
    
    if (deltaX > threshold) {
      hint = '+10%';
    } else if (deltaX < -threshold) {
      hint = '+25%';
    }
    
    setGestureState(prev => ({
      ...prev,
      deltaX,
      gestureHint: hint
    }));
  };

  const handleTouchEnd = () => {
    if (!gestureState.isDragging || !interactive || book.status !== 'currently_reading') {
      setGestureState(prev => ({ ...prev, isDragging: false, gestureHint: '' }));
      return;
    }
    
    const threshold = 80; // Increased threshold for more deliberate gestures
    const { deltaX } = gestureState;
    
    // Only trigger if gesture was significant and primarily horizontal
    if (Math.abs(deltaX) >= threshold) {
      if (deltaX > 0) {
        // Right swipe: +10%
        handleQuickIncrementWithUndo(10, 'Right swipe: +10%');
      } else {
        // Left swipe: +25%
        handleQuickIncrementWithUndo(25, 'Left swipe: +25%');
      }
    }
    
    setGestureState({
      isDragging: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      gestureHint: ''
    });
  };

  const handleQuickIncrementWithUndo = (increment: number, actionType: string) => {
    const previousProgress = localProgress;
    const newProgress = Math.min(100, Math.max(0, localProgress + increment));
    
    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }
    
    // Apply the increment
    setLocalProgress(newProgress);
    if (onQuickUpdate) {
      onQuickUpdate(book.id, increment);
    }
    if (onUpdateProgress) {
      onUpdateProgress(book.id, newProgress);
    }
    
    // Set up undo capability
    setLastGestureAction({ type: actionType, value: previousProgress });
    
    // Auto-clear undo after 5 seconds
    const timeout = setTimeout(() => {
      setLastGestureAction(null);
    }, 5000);
    
    setUndoTimeout(timeout as unknown as number);
  };

  const handleUndoGesture = () => {
    if (!lastGestureAction) return;
    
    const previousProgress = lastGestureAction.value;
    setLocalProgress(previousProgress);
    
    if (onUpdateProgress) {
      onUpdateProgress(book.id, previousProgress);
    }
    
    // Clear undo state
    setLastGestureAction(null);
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
  };

  const getStatusColor = (status: Book['status']) => {
    switch (status) {
      case 'want_to_read':
        return 'bg-status-want-to-read text-status-want-to-read-foreground';
      case 'currently_reading':
        return 'bg-status-currently-reading text-status-currently-reading-foreground';
      case 'finished':
        return 'bg-status-finished text-status-finished-foreground';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusLabel = (status: Book['status']) => {
    switch (status) {
      case 'want_to_read':
        return 'Want to Read';
      case 'currently_reading':
        return 'Reading';
      case 'finished':
        return 'Finished';
      default:
        return 'Unknown';
    }
  };

  const handleProgressComplete = (newProgress: number) => {
    if (onUpdateProgress && newProgress !== book.progress) {
      onUpdateProgress(book.id, newProgress);
    }
  };

  const handleQuickIncrement = (increment: number) => {
    handleQuickIncrementWithUndo(increment, `Button: +${increment}%`);
  };

  const handleMarkDone = () => {
    setLocalProgress(100);
    if (onMarkComplete) {
      onMarkComplete(book.id);
    }
    if (onUpdateProgress) {
      onUpdateProgress(book.id, 100);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(book);
    }
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
      onDelete(book.id);
    }
    setShowActionsMenu(false);
  };

  const shouldShowProgressControls = book.status === 'currently_reading' && interactive;
  const progressPercentage = localProgress;

  return (
    <div 
      ref={cardRef}
      className={`bg-surface rounded-xl shadow-card p-4 border border-border hover:shadow-lg transition-all duration-200 relative ${className} ${
        gestureState.isDragging && book.status === 'currently_reading' ? 'select-none' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: gestureState.isDragging && book.status === 'currently_reading' 
          ? `translateX(${Math.max(-30, Math.min(30, gestureState.deltaX * 0.3))}px)` 
          : undefined
      }}
    >
      {/* Header with title, author, and status */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-lg leading-tight truncate">
            {book.title}
          </h3>
          <p className="text-text-secondary text-sm mt-1 truncate">
            {book.author}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(book.status)}`}>
            {getStatusLabel(book.status)}
          </span>
          {interactive && (onEdit || onDelete) && (
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 hover:bg-background rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Book actions"
              >
                <svg className="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 top-8 bg-surface border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-background transition-colors"
                    >
                      Edit book
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-background transition-colors"
                    >
                      Delete book
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {shouldShowProgressControls && (
        <div className="mb-4">
          {/* Progress Slider */}
          <div className="mb-3">
            <ProgressSlider
              value={localProgress}
              onChange={setLocalProgress}
              onChangeComplete={handleProgressComplete}
              interactive={interactive}
              showLabel={true}
              label="Progress"
            />
          </div>

          {/* Page Information */}
          {book.totalPages && book.currentPage && (
            <div className="text-xs text-text-secondary mb-3">
              Page {Math.round((progressPercentage / 100) * book.totalPages)} of {book.totalPages}
            </div>
          )}

          {/* Quick Action Buttons */}
          {showQuickActions && (
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => handleQuickIncrement(10)}
                disabled={progressPercentage >= 100}
                className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-medium py-4 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
              >
                +10%
              </button>
              <button
                onClick={() => handleQuickIncrement(25)}
                disabled={progressPercentage >= 100}
                className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-medium py-4 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
              >
                +25%
              </button>
              <button
                onClick={handleMarkDone}
                disabled={progressPercentage >= 100}
                className="flex-1 bg-success hover:bg-success/90 text-white font-medium py-4 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
              >
                Done ✓
              </button>
            </div>
          )}
        </div>
      )}

      {/* Static Progress for non-reading books */}
      {!shouldShowProgressControls && book.progress > 0 && (
        <div className="mb-3">
          <ProgressSlider
            value={book.progress}
            interactive={false}
            showLabel={true}
            label="Progress"
          />
        </div>
      )}

      {/* Notes Preview */}
      {book.notes && (
        <div className="mt-3 p-3 bg-background rounded-lg">
          <p className="text-sm text-text-secondary line-clamp-2">
            {book.notes}
          </p>
        </div>
      )}

      {/* Additional Info */}
      <div className="flex justify-between items-center mt-3 text-xs text-text-secondary">
        <span>Added {book.dateAdded.toLocaleDateString('en-GB')}</span>
        {book.status === 'finished' && book.dateFinished && (
          <span>Finished {book.dateFinished.toLocaleDateString('en-GB')}</span>
        )}
      </div>

      {/* Gesture Hint Overlay */}
      {gestureState.gestureHint && gestureState.isDragging && book.status === 'currently_reading' && (
        <div className="absolute inset-0 bg-primary/20 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-primary text-white px-4 py-2 rounded-lg font-medium text-lg">
            {gestureState.gestureHint}
          </div>
        </div>
      )}

      {/* Undo Button for Gesture Actions */}
      {lastGestureAction && book.status === 'currently_reading' && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={handleUndoGesture}
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-2 rounded-md transition-colors touch-manipulation min-h-[40px]"
            title={`Undo: ${lastGestureAction.type}`}
          >
            ↶ Undo
          </button>
        </div>
      )}

      {/* Gesture Instructions (show for mobile users) */}
      {book.status === 'currently_reading' && interactive && shouldShowProgressControls && !gestureState.isDragging && (
        <div className="absolute bottom-2 left-2 text-xs text-text-secondary bg-background/80 px-2 py-1 rounded-md pointer-events-none sm:opacity-60 sm:bg-transparent sm:px-0 sm:py-0">
          💫 Swipe → +10%, ← +25%
        </div>
      )}
    </div>
  );
};

export default BookCard;