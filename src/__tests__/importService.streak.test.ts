import { describe, it, expect } from 'vitest';
import { ImportService } from '@/services/importService';
import { Book } from '@/types';

describe('ImportService Streak Features', () => {
  describe('analyzeStreakData', () => {
    it('should analyze books with complete date ranges', () => {
      const books = [
        {
          id: 1,
          title: 'Book 1',
          author: 'Author 1',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-05')
        },
        {
          id: 2,
          title: 'Book 2',
          author: 'Author 2',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-10'),
          dateFinished: new Date('2024-01-15')
        }
      ];

      const preview = ImportService.analyzeStreakData(books);

      expect(preview.periodsFound).toBe(2);
      expect(preview.totalDaysToAdd).toBe(12); // 5 + 6 days (inclusive)
      expect(preview.dateRange.earliest).toEqual(new Date('2024-01-01'));
      expect(preview.dateRange.latest).toEqual(new Date('2024-01-15'));
      expect(preview.stats.booksWithDates).toBe(2);
      expect(preview.stats.averageDaysPerBook).toBe(6); // (5 + 6) / 2 = 5.5 -> rounded to 6
      expect(preview.stats.overlappingPeriods).toBe(0);
    });

    it('should handle books without date ranges', () => {
      const books = [
        {
          id: 1,
          title: 'Book Without Dates',
          author: 'Author',
          status: 'want_to_read' as const,
          progress: 0,
          dateAdded: new Date()
        }
      ];

      const preview = ImportService.analyzeStreakData(books);

      expect(preview.periodsFound).toBe(0);
      expect(preview.totalDaysToAdd).toBe(0);
      expect(preview.dateRange.earliest).toBeNull();
      expect(preview.dateRange.latest).toBeNull();
      expect(preview.stats.booksWithDates).toBe(0);
      expect(preview.stats.overlappingPeriods).toBe(0);
    });

    it('should detect overlapping reading periods', () => {
      const books = [
        {
          id: 1,
          title: 'Book 1',
          author: 'Author 1',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-05')
        },
        {
          id: 2,
          title: 'Book 2',
          author: 'Author 2',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-03'),
          dateFinished: new Date('2024-01-07')
        }
      ];

      const preview = ImportService.analyzeStreakData(books);

      expect(preview.periodsFound).toBe(2);
      expect(preview.totalDaysToAdd).toBe(7); // Jan 1-7, no double counting
      expect(preview.stats.overlappingPeriods).toBe(1);
    });

    it('should generate warnings for unusual periods', () => {
      const books = [
        {
          id: 1,
          title: 'Very Long Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2023-01-01'),
          dateFinished: new Date('2024-12-31')
        },
        {
          id: 2,
          title: 'One Day Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-01')
        }
      ];

      const preview = ImportService.analyzeStreakData(books);

      expect(preview.warnings.length).toBeGreaterThan(0);
      expect(preview.warnings.some(w => w.message.includes('Very long reading period'))).toBe(true);
      expect(preview.warnings.some(w => w.message.includes('one day'))).toBe(true);
    });

    it('should handle empty book list', () => {
      const preview = ImportService.analyzeStreakData([]);

      expect(preview.periodsFound).toBe(0);
      expect(preview.totalDaysToAdd).toBe(0);
      expect(preview.dateRange.earliest).toBeNull();
      expect(preview.dateRange.latest).toBeNull();
      expect(preview.warnings).toHaveLength(0);
    });
  });

  describe('processImportWithStreaks', () => {
    it('should process import and calculate streak impact', () => {
      const importedBooks = [
        {
          title: 'Imported Book 1',
          author: 'Author 1',
          status: 'finished' as const,
          progress: 100,
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-05')
        },
        {
          title: 'Imported Book 2',
          author: 'Author 2',
          status: 'finished' as const,
          progress: 100,
          dateStarted: new Date('2024-01-10'),
          dateFinished: new Date('2024-01-15')
        }
      ];

      const existingBooks: Book[] = [];

      const result = ImportService.processImportWithStreaks(
        importedBooks,
        existingBooks
      );

      expect(result.importData.books).toHaveLength(2);
      expect(result.importData.validRows).toBe(2);
      expect(result.streakResult).toBeDefined();
      expect(result.streakResult!.periodsProcessed).toBe(2);
      expect(result.streakResult!.daysAdded).toBe(12); // 5 + 6 days
    });

    it('should handle books without date information', () => {
      const importedBooks = [
        {
          title: 'Book Without Dates',
          author: 'Author',
          status: 'want_to_read' as const,
          progress: 0
        }
      ];

      const existingBooks: Book[] = [];

      const result = ImportService.processImportWithStreaks(
        importedBooks,
        existingBooks
      );

      expect(result.importData.books).toHaveLength(1);
      expect(result.streakResult).toBeUndefined(); // No books with dates
    });

    it('should merge with existing books for streak calculation', () => {
      const importedBooks = [
        {
          title: 'New Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateStarted: new Date('2024-01-10'),
          dateFinished: new Date('2024-01-15')
        }
      ];

      const existingBooks: Book[] = [
        {
          id: 1,
          title: 'Existing Book',
          author: 'Author',
          status: 'finished',
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-05')
        }
      ];

      const result = ImportService.processImportWithStreaks(
        importedBooks,
        existingBooks
      );

      expect(result.streakResult).toBeDefined();
      expect(result.streakResult!.periodsProcessed).toBe(1); // Only new book
      expect(result.streakResult!.daysAdded).toBe(6); // New book period
    });

    it('should assign temporary IDs to imported books', () => {
      const importedBooks = [
        {
          title: 'Test Book',
          author: 'Author',
          status: 'want_to_read' as const,
          progress: 0
        }
      ];

      const existingBooks: Book[] = [];

      const result = ImportService.processImportWithStreaks(
        importedBooks,
        existingBooks
      );

      expect(result.importData.books[0].id).toBeDefined();
      expect(typeof result.importData.books[0].id).toBe('number');
      expect(result.importData.books[0].dateAdded).toBeInstanceOf(Date);
    });

    it('should handle import with custom options', () => {
      const importedBooks = [
        {
          title: 'Test Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-03')
        }
      ];

      const existingBooks: Book[] = [];
      const options = {
        mergeDuplicates: true,
        overwriteExisting: true,
        validateData: false,
        skipInvalid: false
      };

      const result = ImportService.processImportWithStreaks(
        importedBooks,
        existingBooks,
        options
      );

      expect(result.importData.books).toHaveLength(1);
      expect(result.streakResult).toBeDefined();
    });
  });

  describe('integration with CSV parsing', () => {
    it('should integrate streak analysis with CSV preview', async () => {
      const csvContent = `Title,Author,Status,Progress,Date Started,Date Finished
Book 1,Author 1,finished,100,2024-01-01,2024-01-05
Book 2,Author 2,finished,100,2024-01-10,2024-01-15`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });

      const preview = await ImportService.parseCSVFile(file);

      expect(preview.success).toBe(true);
      expect(preview.sampleBooks).toHaveLength(2);
      
      // Analyze streak data for the sample
      const streakPreview = ImportService.analyzeStreakData(preview.sampleBooks);
      expect(streakPreview.periodsFound).toBe(2);
      expect(streakPreview.totalDaysToAdd).toBe(12);
    });

    it('should handle CSV with missing date columns', async () => {
      const csvContent = `Title,Author,Status,Progress
Book 1,Author 1,finished,100
Book 2,Author 2,currently_reading,50`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });

      const preview = await ImportService.parseCSVFile(file);
      const streakPreview = ImportService.analyzeStreakData(preview.sampleBooks);

      expect(streakPreview.periodsFound).toBe(0);
      expect(streakPreview.totalDaysToAdd).toBe(0);
    });

    it('should handle Goodreads format with date reading', async () => {
      const csvContent = `Title,Author,My Rating,Date Read
Book 1,Author 1,5,2024-01-05
Book 2,Author 2,4,2024-01-15`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'goodreads.csv', { type: 'text/csv' });

      const preview = await ImportService.parseCSVFile(file);

      expect(preview.success).toBe(true);
      // Goodreads format has dateFinished but no dateStarted
      const streakPreview = ImportService.analyzeStreakData(preview.sampleBooks);
      expect(streakPreview.periodsFound).toBe(0); // Needs both dates
    });
  });

  describe('error handling', () => {
    it('should handle invalid dates gracefully', () => {
      const books = [
        {
          id: 1,
          title: 'Invalid Dates Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('invalid-date'),
          dateFinished: new Date('2024-01-05')
        }
      ];

      expect(() => {
        ImportService.analyzeStreakData(books);
      }).not.toThrow();

      const preview = ImportService.analyzeStreakData(books);
      expect(preview.periodsFound).toBe(0);
    });

    it('should handle books with end date before start date', () => {
      const books = [
        {
          id: 1,
          title: 'Wrong Order Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateStarted: new Date('2024-01-10'),
          dateFinished: new Date('2024-01-05')
        }
      ];

      const preview = ImportService.analyzeStreakData(books);
      expect(preview.periodsFound).toBe(0);
      expect(preview.totalDaysToAdd).toBe(0);
    });

    it('should handle streak calculation errors gracefully', () => {
      const importedBooks = [
        {
          title: 'Test Book',
          author: 'Author',
          status: 'finished' as const,
          progress: 100,
          dateStarted: new Date('2024-01-01'),
          dateFinished: new Date('2024-01-05')
        }
      ];

      // Force an error scenario by providing malformed existing books
      const existingBooks = null as any;

      expect(() => {
        ImportService.processImportWithStreaks(importedBooks, existingBooks);
      }).not.toThrow();

      const result = ImportService.processImportWithStreaks(importedBooks, existingBooks);
      expect(result.importData.books).toHaveLength(1);
      // Streak result might be undefined due to error, but import should still work
    });
  });

  describe('performance considerations', () => {
    it('should handle large imports efficiently', () => {
      const startTime = Date.now();
      
      // Create 100 books with dates
      const books = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        status: 'finished' as const,
        progress: 100,
        dateAdded: new Date(),
        dateStarted: new Date(`2024-01-${(i % 28) + 1}`),
        dateFinished: new Date(`2024-01-${((i % 28) + 1) + 2}`)
      }));

      const preview = ImportService.analyzeStreakData(books);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(preview.periodsFound).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle overlapping periods efficiently', () => {
      // Create many overlapping books
      const books = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        status: 'finished' as const,
        progress: 100,
        dateAdded: new Date(),
        dateStarted: new Date('2024-01-01'),
        dateFinished: new Date('2024-01-31') // All overlap
      }));

      const preview = ImportService.analyzeStreakData(books);

      expect(preview.periodsFound).toBe(50);
      expect(preview.totalDaysToAdd).toBe(31); // Should not multiply
      expect(preview.stats.overlappingPeriods).toBeGreaterThan(0);
    });
  });
});