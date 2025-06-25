import React from 'react';
import { Book } from '@/types';
import BookCard from './BookCard';

interface BookGridProps {
  books: Book[];
  onUpdateProgress?: (bookId: number, progress: number) => void;
  onQuickUpdate?: (bookId: number, increment: number) => void;
  onMarkComplete?: (bookId: number) => void;
  onChangeStatus?: (bookId: number, status: Book['status']) => void;
  showQuickActions?: boolean;
  loading?: boolean;
  className?: string;
}

const BookGrid: React.FC<BookGridProps> = ({
  books,
  onUpdateProgress,
  onQuickUpdate,
  onMarkComplete,
  onChangeStatus,
  showQuickActions = true,
  loading = false,
  className = ''
}) => {
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-64 text-center">
      <div className="text-6xl mb-4 text-text-secondary">📚</div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        No books yet
      </h3>
      <p className="text-text-secondary max-w-md">
        Start building your reading library by adding your first book. 
        Track your progress and build reading streaks!
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-surface rounded-xl p-4 border border-border animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
          <div className="h-2 bg-gray-200 rounded mb-4"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded flex-1"></div>
            <div className="h-8 bg-gray-200 rounded flex-1"></div>
            <div className="h-8 bg-gray-200 rounded flex-1"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        {renderLoadingState()}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Grid Container */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onUpdateProgress={onUpdateProgress}
            onQuickUpdate={onQuickUpdate}
            onMarkComplete={onMarkComplete}
            onChangeStatus={onChangeStatus}
            showQuickActions={showQuickActions}
            interactive={true}
          />
        ))}
      </div>

      {/* Results Count */}
      {books.length > 0 && (
        <div className="mt-6 text-center text-sm text-text-secondary">
          Showing {books.length} book{books.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default BookGrid;