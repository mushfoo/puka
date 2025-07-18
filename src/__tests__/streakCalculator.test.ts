import { describe, it, expect } from 'vitest';
import {
  calculateStreak,
  calculateStreakFromImport,
  calculateStreakWithHistory,
  processStreakImport,
  createStreakHistoryFromBooks,
  trackProgressUpdate
} from '@/utils/streakCalculator';
import { Book, StreakHistory } from '@/types';

describe('streakCalculator', () => {
  // Helper function to create test books
  const createTestBook = (
    id: number,
    title: string,
    options: {
      status?: Book['status'];
      progress?: number;
      dateStarted?: string;
      dateFinished?: string;
      dateModified?: string;
      totalPages?: number;
    } = {}
  ): Book => ({
    id,
    title,
    author: 'Test Author',
    status: options.status || 'want_to_read',
    progress: options.progress || 0,
    dateAdded: new Date(),
    dateModified: options.dateModified ? new Date(options.dateModified) : undefined,
    dateStarted: options.dateStarted ? new Date(options.dateStarted) : undefined,
    dateFinished: options.dateFinished ? new Date(options.dateFinished) : undefined,
    totalPages: options.totalPages
  });

  const createTestStreakHistory = (readingDays: string[]): StreakHistory => ({
    readingDays: new Set(readingDays),
    bookPeriods: [],
    lastCalculated: new Date()
  });

  describe('calculateStreak (legacy)', () => {
    it('should calculate streak from book dates', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const books: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'finished',
          progress: 100,
          dateFinished: today.toISOString(),
          totalPages: 200
        }),
        createTestBook(2, 'Book 2', {
          status: 'currently_reading',
          progress: 50,
          dateModified: yesterday.toISOString(),
          totalPages: 300
        })
      ];

      const result = calculateStreak(books, 30);

      expect(result.currentStreak).toBeGreaterThanOrEqual(1);
      expect(result.hasReadToday).toBe(true);
      expect(result.dailyGoal).toBe(30);
    });

    it('should handle books without dates', () => {
      const books: Book[] = [
        createTestBook(1, 'Book 1', { status: 'want_to_read' })
      ];

      const result = calculateStreak(books, 30);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.hasReadToday).toBe(false);
    });

    it('should calculate progress from book pages', () => {
      const today = new Date();
      const books: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'currently_reading',
          progress: 50,
          dateModified: today.toISOString(),
          totalPages: 200
        })
      ];

      const result = calculateStreak(books, 30);

      expect(result.todayProgress).toBeGreaterThan(0);
    });
  });

  describe('calculateStreakFromImport', () => {
    it('should calculate streak impact from imported books', () => {
      const importedBooks: Book[] = [
        createTestBook(1, 'Imported Book 1', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-05'
        }),
        createTestBook(2, 'Imported Book 2', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-06',
          dateFinished: '2024-01-10'
        })
      ];

      const result = calculateStreakFromImport(importedBooks, 30);

      expect(result.periodsProcessed).toBe(2);
      expect(result.daysAdded).toBe(10); // 5 days + 5 days
      expect(result.newCurrentStreak).toBeGreaterThanOrEqual(0);
      expect(result.newLongestStreak).toBeGreaterThanOrEqual(0);
    });

    it('should handle books without complete date ranges', () => {
      const importedBooks: Book[] = [
        createTestBook(1, 'Incomplete Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01'
          // No dateFinished
        })
      ];

      const result = calculateStreakFromImport(importedBooks, 30);

      expect(result.periodsProcessed).toBe(0);
      expect(result.daysAdded).toBe(0);
    });

    it('should handle empty import', () => {
      const result = calculateStreakFromImport([], 30);

      expect(result.periodsProcessed).toBe(0);
      expect(result.daysAdded).toBe(0);
      expect(result.oldCurrentStreak).toBe(0);
      expect(result.oldLongestStreak).toBe(0);
    });
  });

  describe('calculateStreakWithHistory', () => {
    it('should merge streak history with current books', () => {
      const books: Book[] = [
        createTestBook(1, 'Current Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-15',
          dateFinished: '2024-01-20'
        })
      ];

      const history = createTestStreakHistory([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03'
      ]);

      const result = calculateStreakWithHistory(books, history, 30);

      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.longestStreak).toBeGreaterThanOrEqual(3);
    });

    it('should work without existing history', () => {
      const books: Book[] = [
        createTestBook(1, 'Only Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-03'
        })
      ];

      const result = calculateStreakWithHistory(books, undefined, 30);

      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.longestStreak).toBeGreaterThanOrEqual(0);
    });

    it('should combine reading days correctly', () => {
      const books: Book[] = [
        createTestBook(1, 'Book with dates', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-10',
          dateFinished: '2024-01-12'
        })
      ];

      const history = createTestStreakHistory([
        '2024-01-01',
        '2024-01-02',
        '2024-01-11' // Overlaps with book period
      ]);

      const result = calculateStreakWithHistory(books, history, 30);

      // Should not double-count overlapping days
      expect(result.longestStreak).toBeGreaterThanOrEqual(2);
    });
  });

  describe('processStreakImport', () => {
    it('should process import and merge with existing data', () => {
      const existingBooks: Book[] = [
        createTestBook(1, 'Existing Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-03'
        })
      ];

      const importedBooks: Book[] = [
        createTestBook(2, 'Imported Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-05',
          dateFinished: '2024-01-07'
        })
      ];

      const existingHistory = createTestStreakHistory(['2024-01-01', '2024-01-02']);

      const result = processStreakImport(
        importedBooks,
        existingBooks,
        existingHistory,
        30
      );

      expect(result.periodsProcessed).toBe(1);
      expect(result.daysAdded).toBe(3); // Jan 5, 6, 7
      expect(result.oldCurrentStreak).toBeGreaterThanOrEqual(0);
      expect(result.newCurrentStreak).toBeGreaterThanOrEqual(0);
    });

    it('should handle overlapping imports correctly', () => {
      const existingBooks: Book[] = [];
      const importedBooks: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-05'
        }),
        createTestBook(2, 'Book 2', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-03',
          dateFinished: '2024-01-07'
        })
      ];

      const result = processStreakImport(importedBooks, existingBooks, undefined, 30);

      expect(result.periodsProcessed).toBe(2);
      expect(result.daysAdded).toBe(7); // Jan 1-7, no double counting
    });
  });

  describe('createStreakHistoryFromBooks', () => {
    it('should create history from books with reading periods', () => {
      const books: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-03'
        }),
        createTestBook(2, 'Book 2', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-05',
          dateFinished: '2024-01-07'
        })
      ];

      const history = createStreakHistoryFromBooks(books);

      expect(history.readingDays.size).toBe(6); // 3 + 3 days
      expect(history.bookPeriods).toHaveLength(2);
      expect(history.lastCalculated).toBeInstanceOf(Date);
      expect(history.readingDays.has('2024-01-01')).toBe(true);
      expect(history.readingDays.has('2024-01-07')).toBe(true);
    });

    it('should handle books without reading periods', () => {
      const books: Book[] = [
        createTestBook(1, 'Incomplete Book', {
          status: 'want_to_read',
          progress: 0
        })
      ];

      const history = createStreakHistoryFromBooks(books);

      expect(history.bookPeriods).toHaveLength(0);
      expect(history.readingDays.size).toBeGreaterThanOrEqual(0);
    });

    it('should include progress entries in reading days', () => {
      const today = new Date();
      const books: Book[] = [
        createTestBook(1, 'Modified Today', {
          status: 'currently_reading',
          progress: 50,
          dateModified: today.toISOString(),
          totalPages: 200
        })
      ];

      const history = createStreakHistoryFromBooks(books);

      // Should include today from dateModified
      const todayISO = today.toISOString().split('T')[0];
      expect(history.readingDays.has(todayISO)).toBe(true);
    });
  });

  describe('trackProgressUpdate', () => {
    it('should create progress entry with page calculation', () => {
      const book = createTestBook(1, 'Test Book', {
        totalPages: 200
      });

      const entry = trackProgressUpdate(book, 25, 50);

      expect(entry.oldProgress).toBe(25);
      expect(entry.newProgress).toBe(50);
      expect(entry.pagesRead).toBe(50); // 25% of 200 pages
      expect(entry.date).toBeInstanceOf(Date);
    });

    it('should estimate pages when totalPages is not available', () => {
      const book = createTestBook(1, 'Test Book');

      const entry = trackProgressUpdate(book, 10, 30);

      expect(entry.oldProgress).toBe(10);
      expect(entry.newProgress).toBe(30);
      expect(entry.pagesRead).toBe(2); // Estimated based on progress difference
    });

    it('should handle zero or negative progress differences', () => {
      const book = createTestBook(1, 'Test Book', {
        totalPages: 200
      });

      const entry = trackProgressUpdate(book, 50, 25);

      expect(entry.pagesRead).toBe(0); // Math.max(0, negative value)
    });

    it('should ensure minimum of 1 page when no total pages', () => {
      const book = createTestBook(1, 'Test Book');

      const entry = trackProgressUpdate(book, 0, 5);

      expect(entry.pagesRead).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle books with invalid date ranges', () => {
      const books: Book[] = [
        createTestBook(1, 'Invalid Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-10',
          dateFinished: '2024-01-05' // End before start
        })
      ];

      const result = calculateStreakFromImport(books, 30);

      expect(result.periodsProcessed).toBe(0);
      expect(result.daysAdded).toBe(0);
    });

    it('should handle very large date ranges', () => {
      const books: Book[] = [
        createTestBook(1, 'Very Long Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2020-01-01',
          dateFinished: '2024-12-31'
        })
      ];

      const result = calculateStreakFromImport(books, 30);

      expect(result.periodsProcessed).toBe(1);
      expect(result.daysAdded).toBeGreaterThan(1000);
    });

    it('should handle future dates gracefully', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const books: Book[] = [
        createTestBook(1, 'Future Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: futureDate.toISOString()
        })
      ];

      // Should not crash, though the data is questionable
      expect(() => {
        calculateStreakFromImport(books, 30);
      }).not.toThrow();
    });

    it('should handle empty reading days in history', () => {
      const books: Book[] = [];
      const history = createTestStreakHistory([]);

      const result = calculateStreakWithHistory(books, history, 30);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.hasReadToday).toBe(false);
    });
  });
});