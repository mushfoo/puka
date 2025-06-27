import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Book } from '@/types';
import BookCard from './BookCard';
import { FixedSizeGrid as Grid } from 'react-window';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [columnCount, setColumnCount] = useState(1);
  
  // Virtual scrolling threshold
  const VIRTUAL_SCROLLING_THRESHOLD = 50;
  const useVirtualScrolling = books.length > VIRTUAL_SCROLLING_THRESHOLD;
  
  // Calculate responsive column count based on width
  const calculateColumnCount = useCallback((width: number) => {
    if (width >= 1280) return 4; // xl: 4 columns
    if (width >= 1024) return 3; // lg: 3 columns
    if (width >= 640) return 2;  // sm: 2 columns
    return 1;                     // default: 1 column
  }, []);
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
        setColumnCount(calculateColumnCount(width));
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [calculateColumnCount]);
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
          <div className="h-6 bg-neutral-200 rounded mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded mb-4 w-3/4"></div>
          <div className="h-2 bg-neutral-200 rounded mb-4"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-neutral-200 rounded flex-1"></div>
            <div className="h-8 bg-neutral-200 rounded flex-1"></div>
            <div className="h-8 bg-neutral-200 rounded flex-1"></div>
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

  // Virtual scrolling cell renderer
  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    if (itemIndex >= books.length) return null;
    
    const book = books[itemIndex];
    const gap = 16; // 1rem gap
    
    return (
      <div
        style={{
          ...style,
          left: style.left + gap / 2,
          top: style.top + gap / 2,
          width: style.width - gap,
          height: style.height - gap,
        }}
      >
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
      </div>
    );
  };
  
  // Regular grid rendering for small datasets
  const renderRegularGrid = () => (
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
  );
  
  // Virtual grid rendering for large datasets
  const renderVirtualGrid = () => {
    // Don't render virtual grid until dimensions are available
    if (dimensions.width === 0) {
      return <div className="min-h-64">Loading...</div>;
    }
    
    const rowCount = Math.ceil(books.length / columnCount);
    const columnWidth = Math.max(250, (dimensions.width - 16) / columnCount); // Minimum width
    const rowHeight = 320; // Approximate height of BookCard
    
    return (
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={Math.min(dimensions.height || 800, rowCount * rowHeight)}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={dimensions.width}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {Cell}
      </Grid>
    );
  };
  
  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {/* Use virtual scrolling for large datasets */}
      {useVirtualScrolling ? renderVirtualGrid() : renderRegularGrid()}
      
      {/* Results Count */}
      {books.length > 0 && (
        <div className="mt-6 text-center text-sm text-text-secondary">
          Showing {books.length} book{books.length !== 1 ? 's' : ''}
          {useVirtualScrolling && ' (virtualized for performance)'}
        </div>
      )}
    </div>
  );
};

export default BookGrid;