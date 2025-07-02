import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarDayCell from '@/components/calendar/CalendarDayCell';
import { ReadingDayEntry } from '@/types';

// Mock reading data for testing
const mockReadingDataManual: ReadingDayEntry = {
  date: '2025-01-15',
  sources: [
    {
      type: 'manual',
      timestamp: new Date('2025-01-15T10:00:00'),
      metadata: {}
    }
  ],
  bookIds: [1],
  notes: 'Great reading session today!'
};

const mockReadingDataBookCompletion: ReadingDayEntry = {
  date: '2025-01-16',
  sources: [
    {
      type: 'book_completion',
      timestamp: new Date('2025-01-16T14:30:00'),
      bookId: 2,
      metadata: {}
    }
  ],
  bookIds: [2]
};

const mockReadingDataProgressUpdate: ReadingDayEntry = {
  date: '2025-01-17',
  sources: [
    {
      type: 'progress_update',
      timestamp: new Date('2025-01-17T20:00:00'),
      bookId: 3,
      metadata: { progress: 75, pages: 200 }
    }
  ],
  bookIds: [3]
};

const mockReadingDataMultipleSources: ReadingDayEntry = {
  date: '2025-01-18',
  sources: [
    {
      type: 'manual',
      timestamp: new Date('2025-01-18T09:00:00'),
      metadata: {}
    },
    {
      type: 'book_completion',
      timestamp: new Date('2025-01-18T15:00:00'),
      bookId: 4,
      metadata: {}
    },
    {
      type: 'progress_update',
      timestamp: new Date('2025-01-18T18:00:00'),
      bookId: 5,
      metadata: { progress: 50 }
    }
  ],
  bookIds: [4, 5],
  notes: 'Multiple activities today'
};

describe('CalendarDayCell', () => {
  const mockOnClick = vi.fn();
  const mockOnKeyDown = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders day number correctly', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('renders with correct accessibility attributes', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveAttribute('role', 'gridcell');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('shows correct aria-label with basic date', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Wednesday, January 15, 2025'));
    });
  });

  describe('State Variations', () => {
    it('applies today styling when isToday is true', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          isToday={true}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveClass('bg-primary/10', 'border-primary', 'font-semibold', 'text-primary');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Today'));
    });

    it('applies selected styling when isSelected is true', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          isSelected={true}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveClass('bg-accent/20', 'border-accent', 'ring-2', 'ring-accent/30');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Selected'));
    });

    it('applies non-current month styling when isCurrentMonth is false', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          isCurrentMonth={false}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveClass('text-text-secondary/40');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });

    it('shows book count when provided and no reading data', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          bookCount={3}
          onClick={mockOnClick}
        />
      );
      
      expect(screen.getByText('3')).toBeInTheDocument();
      const button = screen.getByRole('gridcell');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('3 books'));
    });
  });

  describe('Status Indicators', () => {
    it('shows manual reading indicator', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          readingData={mockReadingDataManual}
          onClick={mockOnClick}
        />
      );
      
      const indicator = screen.getByLabelText('Manual reading day');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('bg-success');
    });

    it('shows book completion indicator', () => {
      render(
        <CalendarDayCell
          date="2025-01-16"
          readingData={mockReadingDataBookCompletion}
          onClick={mockOnClick}
        />
      );
      
      const indicator = screen.getByLabelText('Book completed');
      expect(indicator).toBeInTheDocument();
    });

    it('shows progress update indicator', () => {
      render(
        <CalendarDayCell
          date="2025-01-17"
          readingData={mockReadingDataProgressUpdate}
          onClick={mockOnClick}
        />
      );
      
      const indicator = screen.getByLabelText('Progress updated');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('bg-warning');
    });

    it('shows notes indicator when notes are present', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          readingData={mockReadingDataManual}
          onClick={mockOnClick}
        />
      );
      
      const notesIndicator = screen.getByLabelText('Has notes');
      expect(notesIndicator).toBeInTheDocument();
    });

    it('prioritizes manual reading over other indicators', () => {
      render(
        <CalendarDayCell
          date="2025-01-18"
          readingData={mockReadingDataMultipleSources}
          onClick={mockOnClick}
        />
      );
      
      // Should show manual reading indicator (highest priority)
      expect(screen.getByLabelText('Manual reading day')).toBeInTheDocument();
      // Should also show notes indicator
      expect(screen.getByLabelText('Has notes')).toBeInTheDocument();
    });

    it('shows overflow indicator when more than 3 indicators', () => {
      const manyIndicatorsData: ReadingDayEntry = {
        date: '2025-01-19',
        sources: [
          { type: 'manual', timestamp: new Date(), metadata: {} },
          { type: 'book_completion', timestamp: new Date(), bookId: 1, metadata: {} },
          { type: 'progress_update', timestamp: new Date(), bookId: 2, metadata: {} },
          { type: 'progress_update', timestamp: new Date(), bookId: 3, metadata: {} }
        ],
        bookIds: [1, 2, 3],
        notes: 'Lots of activity'
      };

      render(
        <CalendarDayCell
          date="2025-01-19"
          readingData={manyIndicatorsData}
          onClick={mockOnClick}
        />
      );
      
      // Should show overflow indicator
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('applies reading activity background when status indicators present', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          readingData={mockReadingDataManual}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveClass('bg-success/5');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Has reading activity'));
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClick when clicked', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledWith('2025-01-15');
    });

    it('calls onClick when Enter key is pressed', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
          onKeyDown={mockOnKeyDown}
        />
      );
      
      const button = screen.getByRole('gridcell');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(mockOnClick).toHaveBeenCalledWith('2025-01-15');
      expect(mockOnKeyDown).toHaveBeenCalled();
    });

    it('calls onClick when Space key is pressed', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
          onKeyDown={mockOnKeyDown}
        />
      );
      
      const button = screen.getByRole('gridcell');
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(mockOnClick).toHaveBeenCalledWith('2025-01-15');
      expect(mockOnKeyDown).toHaveBeenCalled();
    });

    it('calls onKeyDown for other keys without triggering onClick', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
          onKeyDown={mockOnKeyDown}
        />
      );
      
      const button = screen.getByRole('gridcell');
      fireEvent.keyDown(button, { key: 'ArrowRight' });
      
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(mockOnKeyDown).toHaveBeenCalled();
    });

    it('prevents default behavior for Enter and Space keys', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      
      const enterPreventDefault = vi.spyOn(enterEvent, 'preventDefault');
      const spacePreventDefault = vi.spyOn(spaceEvent, 'preventDefault');
      
      fireEvent(button, enterEvent);
      fireEvent(button, spaceEvent);
      
      expect(enterPreventDefault).toHaveBeenCalled();
      expect(spacePreventDefault).toHaveBeenCalled();
    });
  });

  describe('Mobile Accessibility', () => {
    it('has minimum touch target size', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    });

    it('has focus ring for keyboard navigation', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-primary/20', 'focus:ring-offset-1');
    });

    it('is not focusable when not in current month', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          isCurrentMonth={false}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Visual States', () => {
    it('shows today indicator dot when isToday and no other indicators', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          isToday={true}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      const todayDot = button.querySelector('.absolute.bottom-1.right-1');
      expect(todayDot).toBeInTheDocument();
      expect(todayDot).toHaveClass('w-1.5', 'h-1.5', 'bg-primary', 'rounded-full');
    });

    it('does not show today indicator dot when other indicators are present', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          isToday={true}
          readingData={mockReadingDataManual}
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      const todayDot = button.querySelector('.absolute.bottom-1.right-1');
      expect(todayDot).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid date gracefully', () => {
      // Test with date that would create an invalid Date object
      expect(() => {
        render(
          <CalendarDayCell
            date="invalid-date"
            onClick={mockOnClick}
          />
        );
      }).not.toThrow();
    });

    it('handles empty reading data sources', () => {
      const emptyReadingData: ReadingDayEntry = {
        date: '2025-01-15',
        sources: [],
        bookIds: []
      };

      render(
        <CalendarDayCell
          date="2025-01-15"
          readingData={emptyReadingData}
          onClick={mockOnClick}
        />
      );
      
      // Should render without indicators
      expect(screen.queryByLabelText('Manual reading day')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Book completed')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Progress updated')).not.toBeInTheDocument();
    });

    it('handles missing onKeyDown prop', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      const button = screen.getByRole('gridcell');
      expect(() => {
        fireEvent.keyDown(button, { key: 'ArrowRight' });
      }).not.toThrow();
    });

    it('handles reading data with only notes and no sources', () => {
      const notesOnlyData: ReadingDayEntry = {
        date: '2025-01-15',
        sources: [],
        bookIds: [],
        notes: 'Just a note'
      };

      render(
        <CalendarDayCell
          date="2025-01-15"
          readingData={notesOnlyData}
          onClick={mockOnClick}
        />
      );
      
      // Should show notes indicator
      expect(screen.getByLabelText('Has notes')).toBeInTheDocument();
    });

    it('handles zero book count', () => {
      render(
        <CalendarDayCell
          date="2025-01-15"
          bookCount={0}
          onClick={mockOnClick}
        />
      );
      
      // Should not show book count
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes day number calculation', () => {
      const { rerender } = render(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
        />
      );
      
      expect(screen.getByText('15')).toBeInTheDocument();
      
      // Re-render with same date
      rerender(
        <CalendarDayCell
          date="2025-01-15"
          onClick={mockOnClick}
          isSelected={true}
        />
      );
      
      // Day number should still be correct
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('memoizes status indicators calculation', () => {
      const { rerender } = render(
        <CalendarDayCell
          date="2025-01-15"
          readingData={mockReadingDataManual}
          onClick={mockOnClick}
        />
      );
      
      expect(screen.getByLabelText('Manual reading day')).toBeInTheDocument();
      
      // Re-render with same reading data but different other props
      rerender(
        <CalendarDayCell
          date="2025-01-15"
          readingData={mockReadingDataManual}
          onClick={mockOnClick}
          isSelected={true}
        />
      );
      
      // Indicators should still be present
      expect(screen.getByLabelText('Manual reading day')).toBeInTheDocument();
    });
  });
});