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
  const actionsMenuRef = useRef<HTMLDivElement>(null);

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
    const newProgress = Math.min(100, Math.max(0, localProgress + increment));
    setLocalProgress(newProgress);
    if (onQuickUpdate) {
      onQuickUpdate(book.id, increment);
    }
    if (onUpdateProgress) {
      onUpdateProgress(book.id, newProgress);
    }
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
    <div className={`bg-surface rounded-xl shadow-card p-4 border border-border hover:shadow-lg transition-all duration-200 ${className}`}>
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
                className="p-1 hover:bg-background rounded-full transition-colors"
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
            <div className="flex gap-3">
              <button
                onClick={() => handleQuickIncrement(10)}
                disabled={progressPercentage >= 100}
                className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-medium py-3 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                +10%
              </button>
              <button
                onClick={() => handleQuickIncrement(25)}
                disabled={progressPercentage >= 100}
                className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-medium py-3 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                +25%
              </button>
              <button
                onClick={handleMarkDone}
                disabled={progressPercentage >= 100}
                className="flex-1 bg-success hover:bg-success/90 text-white font-medium py-3 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
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
        <span>Added {book.dateAdded.toLocaleDateString()}</span>
        {book.status === 'finished' && book.dateFinished && (
          <span>Finished {book.dateFinished.toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
};

export default BookCard;