import { describe, it, expect } from 'vitest';
import {
  extractReadingPeriods,
  generateReadingDays,
  calculateStreaksFromDays,
  calculateDaysBetween,
  formatDateToISO,
  validateReadingPeriods,
  getReadingPeriodStats
} from '@/utils/readingPeriodExtractor';
import { Book } from '@/types';

describe('readingPeriodExtractor', () => {
  // Helper function to create test books
  const createTestBook = (
    id: number,
    title: string,
    dateStarted?: string,
    dateFinished?: string
  ): Book => ({
    id,
    title,
    author: 'Test Author',
    status: 'finished',
    progress: 100,
    dateAdded: new Date(),
    dateStarted: dateStarted ? new Date(dateStarted) : undefined,
    dateFinished: dateFinished ? new Date(dateFinished) : undefined
  });

  describe('extractReadingPeriods', () => {
    it('should extract reading periods from books with both start and end dates', () => {
      const books: Book[] = [
        createTestBook(1, 'Book 1', '2024-01-01', '2024-01-05'),
        createTestBook(2, 'Book 2', '2024-01-10', '2024-01-15'),
      ];

      const periods = extractReadingPeriods(books);

      expect(periods).toHaveLength(2);
      expect(periods[0]).toEqual({
        bookId: 1,
        title: 'Book 1',
        author: 'Test Author',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        totalDays: 5
      });
      expect(periods[1]).toEqual({
        bookId: 2,
        title: 'Book 2',
        author: 'Test Author',
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-01-15'),
        totalDays: 6
      });
    });

    it('should skip books without both start and end dates', () => {
      const books: Book[] = [
        createTestBook(1, 'Complete Book', '2024-01-01', '2024-01-05'),
        createTestBook(2, 'No End Date', '2024-01-01'),
        createTestBook(3, 'No Start Date', undefined, '2024-01-05'),
        createTestBook(4, 'No Dates'),
      ];

      const periods = extractReadingPeriods(books);

      expect(periods).toHaveLength(1);
      expect(periods[0].title).toBe('Complete Book');
    });

    it('should handle invalid dates', () => {
      const books: Book[] = [
        {
          ...createTestBook(1, 'Invalid Book'),
          dateStarted: new Date('invalid-date'),
          dateFinished: new Date('2024-01-05')
        },
      ];

      const periods = extractReadingPeriods(books);

      expect(periods).toHaveLength(0);
    });

    it('should handle start date after end date', () => {
      const books: Book[] = [
        createTestBook(1, 'Wrong Order', '2024-01-10', '2024-01-05'),
      ];

      const periods = extractReadingPeriods(books);

      expect(periods).toHaveLength(0);
    });

    it('should calculate correct total days including both start and end dates', () => {
      const books: Book[] = [
        createTestBook(1, 'Same Day', '2024-01-01', '2024-01-01'),
        createTestBook(2, 'Multiple Days', '2024-01-01', '2024-01-03'),
      ];

      const periods = extractReadingPeriods(books);

      expect(periods[0].totalDays).toBe(1); // Same day = 1 day
      expect(periods[1].totalDays).toBe(3); // Jan 1, 2, 3 = 3 days
    });
  });

  describe('generateReadingDays', () => {
    it('should generate all days for single period', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Test Book',
          author: 'Test Author',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-03'),
          totalDays: 3
        }
      ];

      const readingDays = generateReadingDays(periods);

      expect(readingDays.size).toBe(3);
      expect(readingDays.has('2024-01-01')).toBe(true);
      expect(readingDays.has('2024-01-02')).toBe(true);
      expect(readingDays.has('2024-01-03')).toBe(true);
    });

    it('should merge overlapping periods without duplicating days', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Book 1',
          author: 'Author 1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-03'),
          totalDays: 3
        },
        {
          bookId: 2,
          title: 'Book 2',
          author: 'Author 2',
          startDate: new Date('2024-01-02'),
          endDate: new Date('2024-01-04'),
          totalDays: 3
        }
      ];

      const readingDays = generateReadingDays(periods);

      expect(readingDays.size).toBe(4); // Jan 1, 2, 3, 4 (not 6)
      expect(readingDays.has('2024-01-01')).toBe(true);
      expect(readingDays.has('2024-01-02')).toBe(true);
      expect(readingDays.has('2024-01-03')).toBe(true);
      expect(readingDays.has('2024-01-04')).toBe(true);
    });

    it('should handle empty periods array', () => {
      const readingDays = generateReadingDays([]);
      expect(readingDays.size).toBe(0);
    });
  });

  describe('calculateStreaksFromDays', () => {
    it('should return zero streaks for empty set', () => {
      const result = calculateStreaksFromDays(new Set());

      expect(result).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null
      });
    });

    it('should calculate simple consecutive streak', () => {
      const readingDays = new Set([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03'
      ]);

      const result = calculateStreaksFromDays(readingDays);

      expect(result.longestStreak).toBe(3);
      expect(result.lastReadDate).toEqual(new Date('2024-01-03'));
    });

    it('should handle gaps in reading days', () => {
      const readingDays = new Set([
        '2024-01-01',
        '2024-01-02',
        '2024-01-05', // Gap here
        '2024-01-06',
        '2024-01-07'
      ]);

      const result = calculateStreaksFromDays(readingDays);

      expect(result.longestStreak).toBe(3); // Either first 2 days or last 3 days
    });

    it('should calculate current streak from today backwards', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const readingDays = new Set([
        formatDateToISO(twoDaysAgo),
        formatDateToISO(yesterday),
        formatDateToISO(today)
      ]);

      const result = calculateStreaksFromDays(readingDays);

      expect(result.currentStreak).toBe(3);
    });
  });

  describe('calculateDaysBetween', () => {
    it('should calculate days between dates correctly', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-05');

      const days = calculateDaysBetween(start, end);

      expect(days).toBe(4); // Jan 1 to Jan 5 is 4 days difference
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-01');

      const days = calculateDaysBetween(date, date);

      expect(days).toBe(0);
    });

    it('should handle reverse order', () => {
      const start = new Date('2024-01-05');
      const end = new Date('2024-01-01');

      const days = calculateDaysBetween(start, end);

      expect(days).toBe(-4);
    });
  });

  describe('formatDateToISO', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-05T15:30:00Z');

      const formatted = formatDateToISO(date);

      expect(formatted).toBe('2024-01-05');
    });

    it('should handle different timezones consistently', () => {
      const date1 = new Date('2024-01-05T00:00:00Z');
      const date2 = new Date('2024-01-05T23:59:59Z');

      expect(formatDateToISO(date1)).toBe('2024-01-05');
      expect(formatDateToISO(date2)).toBe('2024-01-05');
    });
  });

  describe('validateReadingPeriods', () => {
    it('should validate normal reading periods', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Normal Book',
          author: 'Author',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15'),
          totalDays: 15
        }
      ];

      const result = validateReadingPeriods(periods);

      expect(result.valid).toHaveLength(1);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about very long reading periods', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Very Long Book',
          author: 'Author',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2024-12-31'),
          totalDays: 730
        }
      ];

      const result = validateReadingPeriods(periods);

      expect(result.valid).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Very long reading period');
    });

    it('should warn about one-day reading periods', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Quick Read',
          author: 'Author',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-01'),
          totalDays: 1
        }
      ];

      const result = validateReadingPeriods(periods);

      expect(result.valid).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('completed in one day');
    });

    it('should warn about future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const periods = [
        {
          bookId: 1,
          title: 'Future Book',
          author: 'Author',
          startDate: new Date('2024-01-01'),
          endDate: futureDate,
          totalDays: 1
        }
      ];

      const result = validateReadingPeriods(periods);

      expect(result.valid).toHaveLength(1);
      expect(result.warnings).toHaveLength(2); // One day + future date
      expect(result.warnings.some(w => w.message.includes('future'))).toBe(true);
    });
  });

  describe('getReadingPeriodStats', () => {
    it('should calculate stats for multiple periods', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Book 1',
          author: 'Author',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          totalDays: 5
        },
        {
          bookId: 2,
          title: 'Book 2',
          author: 'Author',
          startDate: new Date('2024-01-03'),
          endDate: new Date('2024-01-07'),
          totalDays: 5
        }
      ];

      const stats = getReadingPeriodStats(periods);

      expect(stats.totalBooks).toBe(2);
      expect(stats.totalDays).toBe(10);
      expect(stats.uniqueDays).toBe(7); // Jan 1-7
      expect(stats.averageDaysPerBook).toBe(5);
      expect(stats.overlappingPeriods).toBe(1); // Books 1 and 2 overlap
    });

    it('should handle empty periods', () => {
      const stats = getReadingPeriodStats([]);

      expect(stats.totalBooks).toBe(0);
      expect(stats.totalDays).toBe(0);
      expect(stats.uniqueDays).toBe(0);
      expect(stats.averageDaysPerBook).toBe(0);
      expect(stats.overlappingPeriods).toBe(0);
    });

    it('should detect overlapping periods correctly', () => {
      const periods = [
        {
          bookId: 1,
          title: 'Book 1',
          author: 'Author',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          totalDays: 5
        },
        {
          bookId: 2,
          title: 'Book 2',
          author: 'Author',
          startDate: new Date('2024-01-03'),
          endDate: new Date('2024-01-07'),
          totalDays: 5
        },
        {
          bookId: 3,
          title: 'Book 3',
          author: 'Author',
          startDate: new Date('2024-01-10'),
          endDate: new Date('2024-01-15'),
          totalDays: 6
        }
      ];

      const stats = getReadingPeriodStats(periods);

      expect(stats.overlappingPeriods).toBe(1); // Only books 1 and 2 overlap
    });
  });
});