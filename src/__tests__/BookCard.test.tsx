import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookCard from '@/components/books/BookCard';
import { Book } from '@/types';

const mockBook: Book = {
  id: 1,
  title: 'Test Book',
  author: 'Test Author',
  status: 'currently_reading',
  progress: 50,
  dateAdded: new Date('2024-01-01'),
  totalPages: 300,
  currentPage: 150,
  notes: 'This is a test note about the book'
};

const mockFinishedBook: Book = {
  id: 2,
  title: 'Finished Book',
  author: 'Another Author',
  status: 'finished',
  progress: 100,
  dateAdded: new Date('2024-01-01'),
  dateFinished: new Date('2024-01-15')
};

const mockWantToReadBook: Book = {
  id: 3,
  title: 'Future Book',
  author: 'Future Author',
  status: 'want_to_read',
  progress: 0,
  dateAdded: new Date('2024-01-01')
};

describe('BookCard', () => {
  const mockHandlers = {
    onUpdateProgress: vi.fn(),
    onQuickUpdate: vi.fn(),
    onMarkComplete: vi.fn(),
    onChangeStatus: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders book title and author', () => {
      render(<BookCard book={mockBook} />);
      
      expect(screen.getByText('Test Book')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
    });

    it('displays correct status badge for currently reading', () => {
      render(<BookCard book={mockBook} />);
      
      expect(screen.getByText('Reading')).toBeInTheDocument();
    });

    it('displays correct status badge for finished book', () => {
      render(<BookCard book={mockFinishedBook} />);
      
      expect(screen.getByText('Finished')).toBeInTheDocument();
    });

    it('displays correct status badge for want to read', () => {
      render(<BookCard book={mockWantToReadBook} />);
      
      expect(screen.getByText('Want to Read')).toBeInTheDocument();
    });

    it('shows progress percentage', () => {
      render(<BookCard book={mockBook} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows page information when available', () => {
      render(<BookCard book={mockBook} />);
      
      expect(screen.getByText('Page 150 of 300')).toBeInTheDocument();
    });

    it('shows notes when available', () => {
      render(<BookCard book={mockBook} />);
      
      expect(screen.getByText('This is a test note about the book')).toBeInTheDocument();
    });

    it('shows date added', () => {
      render(<BookCard book={mockBook} />);
      
      expect(screen.getByText(/Added/)).toBeInTheDocument();
    });

    it('shows finished date for completed books', () => {
      render(<BookCard book={mockFinishedBook} />);
      
      expect(screen.getByText(/Finished 15\/01\/2024/)).toBeInTheDocument();
    });
  });

  describe('Progress Controls', () => {
    it('shows progress controls for currently reading books', () => {
      render(<BookCard book={mockBook} interactive={true} showQuickActions={true} />);
      
      expect(screen.getByText('+10%')).toBeInTheDocument();
      expect(screen.getByText('+25%')).toBeInTheDocument();
      expect(screen.getByText('Done ✓')).toBeInTheDocument();
    });

    it('does not show progress controls for finished books', () => {
      render(<BookCard book={mockFinishedBook} interactive={true} showQuickActions={true} />);
      
      expect(screen.queryByText('+10%')).not.toBeInTheDocument();
      expect(screen.queryByText('+25%')).not.toBeInTheDocument();
      expect(screen.queryByText('Done ✓')).not.toBeInTheDocument();
    });

    it('does not show progress controls for want to read books', () => {
      render(<BookCard book={mockWantToReadBook} interactive={true} showQuickActions={true} />);
      
      expect(screen.queryByText('+10%')).not.toBeInTheDocument();
      expect(screen.queryByText('+25%')).not.toBeInTheDocument();
      expect(screen.queryByText('Done ✓')).not.toBeInTheDocument();
    });

    it('does not show progress controls when interactive is false', () => {
      render(<BookCard book={mockBook} interactive={false} showQuickActions={true} />);
      
      expect(screen.queryByText('+10%')).not.toBeInTheDocument();
    });

    it('does not show quick actions when showQuickActions is false', () => {
      render(<BookCard book={mockBook} interactive={true} showQuickActions={false} />);
      
      expect(screen.queryByText('+10%')).not.toBeInTheDocument();
    });
  });

  describe('Quick Action Interactions', () => {
    it('calls onQuickUpdate when +10% button is clicked', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true} 
          showQuickActions={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );
      
      fireEvent.click(screen.getByText('+10%'));
      
      expect(mockHandlers.onQuickUpdate).toHaveBeenCalledWith(1, 10);
      expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 60);
    });

    it('calls onQuickUpdate when +25% button is clicked', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true} 
          showQuickActions={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );
      
      fireEvent.click(screen.getByText('+25%'));
      
      expect(mockHandlers.onQuickUpdate).toHaveBeenCalledWith(1, 25);
      expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 75);
    });

    it('calls onMarkComplete when Done button is clicked', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true} 
          showQuickActions={true}
          onMarkComplete={mockHandlers.onMarkComplete}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );
      
      fireEvent.click(screen.getByText('Done ✓'));
      
      expect(mockHandlers.onMarkComplete).toHaveBeenCalledWith(1);
      expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 100);
    });

    it('does not allow progress above 100%', () => {
      const nearCompleteBook = { ...mockBook, progress: 95 };
      render(
        <BookCard 
          book={nearCompleteBook} 
          interactive={true} 
          showQuickActions={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );
      
      fireEvent.click(screen.getByText('+25%'));
      
      expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 100);
    });

    it('disables buttons when progress is 100%', () => {
      render(
        <BookCard 
          book={mockFinishedBook} 
          interactive={true} 
          showQuickActions={true}
        />
      );
      
      // Should not show quick actions for finished books anyway
      expect(screen.queryByText('+10%')).not.toBeInTheDocument();
    });
  });

  describe('Progress Slider', () => {
    it('renders progress slider for currently reading books', () => {
      render(<BookCard book={mockBook} interactive={true} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('50');
    });

    it('updates progress when slider is moved', async () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );
      
      const slider = screen.getByRole('slider');
      
      fireEvent.change(slider, { target: { value: '75' } });
      fireEvent.mouseUp(slider);
      
      await waitFor(() => {
        expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 75);
      });
    });

    it('does not render slider when not interactive', () => {
      render(<BookCard book={mockBook} interactive={false} />);
      
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('applies custom className', () => {
      const { container } = render(<BookCard book={mockBook} className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has proper accessibility attributes', () => {
      render(<BookCard book={mockBook} interactive={true} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '100');
    });

    it('shows correct progress bar width', () => {
      render(<BookCard book={mockBook} />);
      
      const progressBar = document.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles book without total pages', () => {
      const bookWithoutPages = { ...mockBook, totalPages: undefined, currentPage: undefined };
      render(<BookCard book={bookWithoutPages} />);
      
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });

    it('handles book without notes', () => {
      const bookWithoutNotes = { ...mockBook, notes: undefined };
      render(<BookCard book={bookWithoutNotes} />);
      
      expect(screen.queryByText('This is a test note')).not.toBeInTheDocument();
    });

    it('handles book without finished date', () => {
      const bookWithoutFinishDate = { ...mockFinishedBook, dateFinished: undefined };
      render(<BookCard book={bookWithoutFinishDate} />);
      
      expect(screen.queryByText(/Finished \d/)).not.toBeInTheDocument();
    });

    it('handles zero progress correctly', () => {
      render(<BookCard book={mockWantToReadBook} />);
      
      // Should still show progress if > 0, but this book has 0
      const progressText = screen.queryByText('0%');
      // For want_to_read status with 0 progress, we don't show progress section
      expect(progressText).not.toBeInTheDocument();
    });
  });

  describe('Gesture-Based Progress Updates', () => {
    beforeEach(() => {
      // Mock touch events
      Object.defineProperty(window, 'TouchEvent', {
        writable: true,
        value: class TouchEvent extends Event {
          touches: Touch[];
          constructor(type: string, options: any = {}) {
            super(type, options);
            this.touches = options.touches || [];
          }
        }
      });
    });

    const createTouchEvent = (type: string, clientX: number, clientY: number) => ({
      type,
      touches: [{ clientX, clientY }],
      preventDefault: vi.fn()
    });

    it('handles right swipe for +10% progress', async () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          showQuickActions={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Simulate right swipe gesture
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 180, 100)); // 80px right
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 180, 100));

      await waitFor(() => {
        expect(mockHandlers.onQuickUpdate).toHaveBeenCalledWith(1, 10);
        expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 60); // 50 + 10
      });
    });

    it('handles left swipe for +25% progress', async () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          showQuickActions={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Simulate left swipe gesture
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 20, 100)); // 80px left
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 20, 100));

      await waitFor(() => {
        expect(mockHandlers.onQuickUpdate).toHaveBeenCalledWith(1, 25);
        expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 75); // 50 + 25
      });
    });

    it('ignores gestures for non-reading books', () => {
      render(
        <BookCard 
          book={mockWantToReadBook} 
          interactive={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Simulate swipe on want_to_read book
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 180, 100));
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 180, 100));

      expect(mockHandlers.onQuickUpdate).not.toHaveBeenCalled();
      expect(mockHandlers.onUpdateProgress).not.toHaveBeenCalled();
    });

    it('ignores short swipes below threshold', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Simulate short swipe (below 60px threshold)
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 130, 100)); // 30px right
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 130, 100));

      expect(mockHandlers.onQuickUpdate).not.toHaveBeenCalled();
      expect(mockHandlers.onUpdateProgress).not.toHaveBeenCalled();
    });

    it('ignores vertical swipes', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          onQuickUpdate={mockHandlers.onQuickUpdate}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Simulate vertical swipe
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 100, 180)); // 80px down
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 100, 180));

      expect(mockHandlers.onQuickUpdate).not.toHaveBeenCalled();
      expect(mockHandlers.onUpdateProgress).not.toHaveBeenCalled();
    });

    it('shows gesture hint during swipe', async () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          showQuickActions={true}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Start swipe
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      
      // Move beyond threshold
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 180, 100));

      // Should show gesture hint overlay
      await waitFor(() => {
        const hintOverlay = document.querySelector('.absolute.inset-0.bg-primary\\/20');
        expect(hintOverlay).toBeInTheDocument();
      });

      // End swipe
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 180, 100));

      // Hint overlay should disappear
      await waitFor(() => {
        const hintOverlay = document.querySelector('.absolute.inset-0.bg-primary\\/20');
        expect(hintOverlay).not.toBeInTheDocument();
      });
    });

    it('provides undo functionality for gesture actions', async () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          showQuickActions={true}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Perform swipe gesture
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 180, 100));
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 180, 100));

      // Should show undo button
      await waitFor(() => {
        expect(screen.getByText('↶ Undo')).toBeInTheDocument();
      });

      // Click undo
      fireEvent.click(screen.getByText('↶ Undo'));

      // Should restore previous progress
      await waitFor(() => {
        expect(mockHandlers.onUpdateProgress).toHaveBeenLastCalledWith(1, 50); // back to original
        expect(screen.queryByText('↶ Undo')).not.toBeInTheDocument();
      });
    });

    it('auto-hides undo button after timeout', async () => {
      vi.useFakeTimers();
      
      try {
        render(
          <BookCard 
            book={mockBook} 
            interactive={true}
            showQuickActions={true}
            onUpdateProgress={mockHandlers.onUpdateProgress}
          />
        );

        const card = document.querySelector('.bg-surface');
        expect(card).not.toBeNull();
        
        // Perform gesture
        fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
        fireEvent.touchMove(card!, createTouchEvent('touchmove', 180, 100));
        fireEvent.touchEnd(card!, createTouchEvent('touchend', 180, 100));

        // Should show undo button immediately
        expect(screen.getByText('↶ Undo')).toBeInTheDocument();

        // Fast-forward 5 seconds and trigger re-render
        vi.advanceTimersByTime(5000);
        
        // Wait for the timeout to trigger state update
        await vi.runAllTimersAsync();

        // Undo button should be gone
        expect(screen.queryByText('↶ Undo')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows gesture instructions for currently reading books', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={true}
          showQuickActions={true}
        />
      );

      expect(screen.getByText('💫 Swipe → +10%, ← +25%')).toBeInTheDocument();
    });

    it('does not show gesture instructions for non-interactive cards', () => {
      render(
        <BookCard 
          book={mockBook} 
          interactive={false}
        />
      );

      expect(screen.queryByText('💫 Swipe → +10%, ← +25%')).not.toBeInTheDocument();
    });

    it('caps progress at 100% with gestures', () => {
      const nearCompleteBook = { ...mockBook, progress: 95 };
      
      render(
        <BookCard 
          book={nearCompleteBook} 
          interactive={true}
          onUpdateProgress={mockHandlers.onUpdateProgress}
        />
      );

      const card = document.querySelector('.bg-surface');
      expect(card).not.toBeNull();
      
      // Swipe for +25% when at 95%
      fireEvent.touchStart(card!, createTouchEvent('touchstart', 100, 100));
      fireEvent.touchMove(card!, createTouchEvent('touchmove', 20, 100)); // left swipe
      fireEvent.touchEnd(card!, createTouchEvent('touchend', 20, 100));

      // Progress should be capped at 100%
      expect(mockHandlers.onUpdateProgress).toHaveBeenCalledWith(1, 100);
    });
  });
});