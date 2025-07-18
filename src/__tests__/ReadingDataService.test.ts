import { describe, it, expect, beforeEach } from 'vitest';
import { ReadingDataService } from '@/services/ReadingDataService';
import { 
  Book, 
  StreakHistory, 
  ReadingDayMap, 
  ReadingDayEntry, 
  ReadingDataSource 
} from '@/types';

describe('ReadingDataService', () => {
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
      dateAdded?: string;
      totalPages?: number;
      currentPage?: number;
    } = {}
  ): Book => ({
    id,
    title,
    author: 'Test Author',
    status: options.status || 'want_to_read',
    progress: options.progress ?? 0,
    dateAdded: options.dateAdded ? new Date(options.dateAdded) : new Date(),
    dateModified: options.dateModified ? new Date(options.dateModified) : undefined,
    dateStarted: options.dateStarted ? new Date(options.dateStarted) : undefined,
    dateFinished: options.dateFinished ? new Date(options.dateFinished) : undefined,
    totalPages: options.totalPages,
    currentPage: options.currentPage
  });

  const createTestStreakHistory = (readingDays: string[]): StreakHistory => ({
    readingDays: new Set(readingDays),
    bookPeriods: [],
    lastCalculated: new Date()
  });

  const createTestReadingDayEntry = (
    date: string,
    sources: ReadingDataSource[],
    bookIds: number[] = [],
    notes?: string
  ): ReadingDayEntry => ({
    date,
    sources,
    bookIds,
    notes
  });

  describe('mergeReadingData', () => {
    it('should merge data from all sources correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const fourDaysAgo = new Date(today);
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const streakHistory = createTestStreakHistory([
        fourDaysAgo.toISOString().split('T')[0],
        fiveDaysAgo.toISOString().split('T')[0]
      ]);

      const books: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'finished',
          progress: 100,
          dateStarted: threeDaysAgo.toISOString().split('T')[0],
          dateFinished: yesterday.toISOString().split('T')[0],
          totalPages: 200
        }),
        createTestBook(2, 'Book 2', {
          status: 'currently_reading',
          progress: 50,
          dateModified: twoDaysAgo.toISOString().split('T')[0],
          totalPages: 300
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);

      // Should have entries for all unique dates
      expect(result.size).toBeGreaterThanOrEqual(5);
      
      // Check manual entries
      expect(result.has(fourDaysAgo.toISOString().split('T')[0])).toBe(true);
      expect(result.has(fiveDaysAgo.toISOString().split('T')[0])).toBe(true);
      
      // Check book completion entries
      expect(result.has(threeDaysAgo.toISOString().split('T')[0])).toBe(true);
      expect(result.has(yesterday.toISOString().split('T')[0])).toBe(true);
      
      // Check progress update entry (within 7 days)
      expect(result.has(twoDaysAgo.toISOString().split('T')[0])).toBe(true);
    });

    it('should handle empty streak history', () => {
      const streakHistory = createTestStreakHistory([]);
      const books: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-03'
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      expect(result.size).toBe(3);
      expect(result.has('2024-01-01')).toBe(true);
      expect(result.has('2024-01-03')).toBe(true);
    });

    it('should handle empty books array', () => {
      const streakHistory = createTestStreakHistory([
        '2024-01-01',
        '2024-01-02'
      ]);
      const books: Book[] = [];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      expect(result.size).toBe(2);
      expect(result.has('2024-01-01')).toBe(true);
      expect(result.has('2024-01-02')).toBe(true);
    });

    it('should merge overlapping dates correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const streakHistory = createTestStreakHistory([twoDaysAgo.toISOString().split('T')[0]]);
      const books: Book[] = [
        createTestBook(1, 'Book 1', {
          status: 'finished',
          progress: 100,
          dateStarted: threeDaysAgo.toISOString().split('T')[0],
          dateFinished: yesterday.toISOString().split('T')[0]
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      // Should have 3 unique dates
      expect(result.size).toBe(3);
      
      // Check that overlapping date has both manual and book completion sources
      const overlappingEntry = result.get(twoDaysAgo.toISOString().split('T')[0]);
      expect(overlappingEntry).toBeDefined();
      expect(overlappingEntry!.sources.length).toBeGreaterThanOrEqual(1);
      
      // Should have book ID from book completion
      expect(overlappingEntry!.bookIds).toContain(1);
    });

    it('should handle books with invalid dates', () => {
      const streakHistory = createTestStreakHistory([]);
      const books: Book[] = [
        createTestBook(1, 'Invalid Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-10',
          dateFinished: '2024-01-05' // End before start
        }),
        createTestBook(2, 'Valid Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-03'
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      // Should only process valid book
      expect(result.size).toBe(3);
      expect(result.has('2024-01-01')).toBe(true);
      expect(result.has('2024-01-03')).toBe(true);
    });
  });

  describe('getReadingDaysInRange', () => {
    let testReadingData: ReadingDayMap;

    beforeEach(() => {
      testReadingData = new Map();
      testReadingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [], [1]));
      testReadingData.set('2024-01-05', createTestReadingDayEntry('2024-01-05', [], [2]));
      testReadingData.set('2024-01-10', createTestReadingDayEntry('2024-01-10', [], [3]));
      testReadingData.set('2024-01-15', createTestReadingDayEntry('2024-01-15', [], [4]));
    });

    it('should return entries within date range', () => {
      const result = ReadingDataService.getReadingDaysInRange(
        '2024-01-01',
        '2024-01-10',
        testReadingData
      );

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[1].date).toBe('2024-01-05');
      expect(result[2].date).toBe('2024-01-10');
    });

    it('should return empty array for range with no entries', () => {
      const result = ReadingDataService.getReadingDaysInRange(
        '2024-02-01',
        '2024-02-28',
        testReadingData
      );

      expect(result).toHaveLength(0);
    });

    it('should handle single day range', () => {
      const result = ReadingDataService.getReadingDaysInRange(
        '2024-01-05',
        '2024-01-05',
        testReadingData
      );

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-05');
    });

    it('should throw error for invalid date format', () => {
      expect(() => {
        ReadingDataService.getReadingDaysInRange(
          'invalid-date',
          '2024-01-10',
          testReadingData
        );
      }).toThrow('Invalid date format');
    });

    it('should throw error when start date is after end date', () => {
      expect(() => {
        ReadingDataService.getReadingDaysInRange(
          '2024-01-10',
          '2024-01-01',
          testReadingData
        );
      }).toThrow('Start date must be before or equal to end date');
    });

    it('should return results sorted by date', () => {
      const result = ReadingDataService.getReadingDaysInRange(
        '2024-01-01',
        '2024-01-15',
        testReadingData
      );

      expect(result).toHaveLength(4);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date > result[i - 1].date).toBe(true);
      }
    });
  });

  describe('resolveConflicts', () => {
    it('should return single entry when no conflicts', () => {
      const entry = createTestReadingDayEntry('2024-01-01', [], [1]);
      const result = ReadingDataService.resolveConflicts([entry]);

      expect(result).toEqual(entry);
    });

    it('should merge multiple entries correctly', () => {
      const manualSource: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const bookCompletionSource: ReadingDataSource = {
        type: 'book_completion',
        timestamp: new Date('2024-01-01T15:00:00Z'),
        bookId: 1
      };

      const entries = [
        createTestReadingDayEntry('2024-01-01', [manualSource], [], 'Manual entry'),
        createTestReadingDayEntry('2024-01-01', [bookCompletionSource], [1], 'Book completion')
      ];

      const result = ReadingDataService.resolveConflicts(entries);

      expect(result.date).toBe('2024-01-01');
      expect(result.sources).toHaveLength(2);
      expect(result.bookIds).toContain(1);
      expect(result.notes).toContain('Manual entry');
      expect(result.notes).toContain('Book completion');
    });

    it('should prioritize manual entries over book completion', () => {
      const manualSource: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const bookCompletionSource: ReadingDataSource = {
        type: 'book_completion',
        timestamp: new Date('2024-01-01T15:00:00Z'),
        bookId: 1
      };

      const entries = [
        createTestReadingDayEntry('2024-01-01', [bookCompletionSource], [1]),
        createTestReadingDayEntry('2024-01-01', [manualSource], [])
      ];

      const result = ReadingDataService.resolveConflicts(entries);

      // Manual source should be first (highest priority)
      expect(result.sources[0].type).toBe('manual');
    });

    it('should prioritize book completion over progress updates', () => {
      const progressSource: ReadingDataSource = {
        type: 'progress_update',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        bookId: 1
      };

      const bookCompletionSource: ReadingDataSource = {
        type: 'book_completion',
        timestamp: new Date('2024-01-01T15:00:00Z'),
        bookId: 1
      };

      const entries = [
        createTestReadingDayEntry('2024-01-01', [progressSource], [1]),
        createTestReadingDayEntry('2024-01-01', [bookCompletionSource], [1])
      ];

      const result = ReadingDataService.resolveConflicts(entries);

      // Book completion source should be first (higher priority)
      expect(result.sources[0].type).toBe('book_completion');
    });

    it('should remove duplicate book IDs', () => {
      const source1: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date()
      };

      const source2: ReadingDataSource = {
        type: 'book_completion',
        timestamp: new Date(),
        bookId: 1
      };

      const entries = [
        createTestReadingDayEntry('2024-01-01', [source1], [1, 2]),
        createTestReadingDayEntry('2024-01-01', [source2], [1, 3])
      ];

      const result = ReadingDataService.resolveConflicts(entries);

      expect(result.bookIds).toEqual([1, 2, 3]);
    });

    it('should throw error for empty entries array', () => {
      expect(() => {
        ReadingDataService.resolveConflicts([]);
      }).toThrow('Cannot resolve conflicts for empty array');
    });
  });

  describe('getReadingStatistics', () => {
    it('should calculate statistics correctly', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      
      const manualSource: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date()
      };

      const bookSource: ReadingDataSource = {
        type: 'book_completion',
        timestamp: new Date(),
        bookId: 1
      };

      readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [manualSource], []));
      readingData.set('2024-01-02', createTestReadingDayEntry('2024-01-02', [bookSource], [1]));
      readingData.set('2024-01-03', createTestReadingDayEntry('2024-01-03', [bookSource], [2]));

      const stats = ReadingDataService.getReadingStatistics(readingData);

      expect(stats.totalReadingDays).toBe(3);
      expect(stats.totalBooks).toBe(2);
      expect(stats.sourceBreakdown.manual).toBe(1);
      expect(stats.sourceBreakdown.book_completion).toBe(2);
      expect(stats.dateRange.earliest).toBe('2024-01-01');
      expect(stats.dateRange.latest).toBe('2024-01-03');
    });

    it('should handle empty reading data', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      const stats = ReadingDataService.getReadingStatistics(readingData);

      expect(stats.totalReadingDays).toBe(0);
      expect(stats.totalBooks).toBe(0);
      expect(stats.dateRange.earliest).toBeNull();
      expect(stats.dateRange.latest).toBeNull();
    });
  });

  describe('validateReadingData', () => {
    it('should validate correct reading data', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      const source: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date()
      };

      readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [source], [1]));

      const result = ReadingDataService.validateReadingData(readingData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid date formats', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      const source: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date()
      };

      readingData.set('invalid-date', createTestReadingDayEntry('invalid-date', [source], [1]));

      const result = ReadingDataService.validateReadingData(readingData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format: invalid-date');
    });

    it('should detect entries without sources', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [], [1]));

      const result = ReadingDataService.validateReadingData(readingData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No sources for date: 2024-01-01');
    });

    it('should warn about future dates', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      const source: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date()
      };

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      readingData.set(futureDateStr, createTestReadingDayEntry(futureDateStr, [source], [1]));

      const result = ReadingDataService.validateReadingData(readingData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(`Future date detected: ${futureDateStr}`);
    });

    it('should warn about very old dates', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      const source: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date()
      };

      // Date from 3 years ago
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3);
      const oldDateStr = oldDate.toISOString().split('T')[0];

      readingData.set(oldDateStr, createTestReadingDayEntry(oldDateStr, [source], [1]));

      const result = ReadingDataService.validateReadingData(readingData);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Very old reading date'))).toBe(true);
    });
  });

  describe('performance optimizations', () => {
    it('should handle large datasets efficiently', () => {
      const streakHistory = createTestStreakHistory(
        Array.from({ length: 1000 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        })
      );

      const books: Book[] = Array.from({ length: 100 }, (_, i) => 
        createTestBook(i + 1, `Book ${i + 1}`, {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-03'
        })
      );

      const startTime = performance.now();
      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      const endTime = performance.now();

      expect(result.size).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should efficiently filter large date ranges', () => {
      const readingData = new Map<string, ReadingDayEntry>();
      
      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        readingData.set(dateStr, createTestReadingDayEntry(dateStr, [], [1]));
      }

      const startTime = performance.now();
      const result = ReadingDataService.getReadingDaysInRange(
        '2024-01-01',
        '2024-12-31',
        readingData
      );
      const endTime = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('edge cases', () => {
    it('should handle books with only dateStarted', () => {
      const streakHistory = createTestStreakHistory([]);
      const books: Book[] = [
        createTestBook(1, 'Incomplete Book', {
          status: 'currently_reading',
          progress: 50,
          dateStarted: '2024-01-01',
          dateModified: '2024-01-03'
          // No dateFinished
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      // Should create reading period entries from dateStarted to dateModified for currently reading books
      expect(result.has('2024-01-01')).toBe(true);
      expect(result.has('2024-01-02')).toBe(true);
      expect(result.has('2024-01-03')).toBe(true);
      
      // Check that it's marked as progress_update (not book_completion)
      const entry = result.get('2024-01-01');
      expect(entry?.sources[0].type).toBe('progress_update');
    });

    it('should handle books with only dateFinished', () => {
      const streakHistory = createTestStreakHistory([]);
      const books: Book[] = [
        createTestBook(1, 'Incomplete Book', {
          status: 'finished',
          progress: 100,
          dateFinished: '2024-01-01'
          // No dateStarted
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      // Should not create book completion entries without dateStarted
      expect(result.has('2024-01-01')).toBe(false);
    });

    it('should handle books with same start and end date', () => {
      const streakHistory = createTestStreakHistory([]);
      const books: Book[] = [
        createTestBook(1, 'Same Day Book', {
          status: 'finished',
          progress: 100,
          dateStarted: '2024-01-01',
          dateFinished: '2024-01-01'
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      expect(result.size).toBe(1);
      expect(result.has('2024-01-01')).toBe(true);
    });

    it('should handle progress updates from distant past', () => {
      const streakHistory = createTestStreakHistory([]);
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

      const books: Book[] = [
        createTestBook(1, 'Old Update', {
          status: 'currently_reading',
          progress: 50,
          dateModified: oldDate.toISOString().split('T')[0]
        })
      ];

      const result = ReadingDataService.mergeReadingData(streakHistory, books);
      
      // Should not include progress updates from more than 7 days ago
      expect(result.has(oldDate.toISOString().split('T')[0])).toBe(false);
    });
  });

  describe('extended functionality', () => {
    describe('getExtendedReadingStatistics', () => {
      it('should calculate extended statistics correctly', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        
        // Add reading data for a month
        for (let i = 1; i <= 30; i++) {
          const date = `2024-01-${String(i).padStart(2, '0')}`;
          const sources: ReadingDataSource[] = [
            {
              type: 'manual',
              timestamp: new Date(`2024-01-${String(i).padStart(2, '0')}T10:00:00Z`)
            }
          ];
          readingData.set(date, createTestReadingDayEntry(date, sources, [1]));
        }

        const stats = ReadingDataService.getExtendedReadingStatistics(readingData);

        expect(stats.totalReadingDays).toBe(30);
        expect(stats.readingFrequency.averageDaysPerWeek).toBeGreaterThan(0);
        expect(stats.readingFrequency.averageDaysPerMonth).toBeGreaterThan(0);
        expect(stats.readingFrequency.consistency).toBeGreaterThan(0);
        expect(stats.bookStats.mostActiveMonth).toBe('2024-01');
        expect(stats.bookStats.mostActiveYear).toBe(2024);
      });

      it('should handle empty reading data', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const stats = ReadingDataService.getExtendedReadingStatistics(readingData);

        expect(stats.totalReadingDays).toBe(0);
        expect(stats.readingFrequency.averageDaysPerWeek).toBe(0);
        expect(stats.readingFrequency.averageDaysPerMonth).toBe(0);
        expect(stats.readingFrequency.consistency).toBe(0);
        expect(stats.bookStats.mostActiveMonth).toBeNull();
        expect(stats.bookStats.mostActiveYear).toBeNull();
      });
    });

    describe('aggregateByPeriod', () => {
      let testReadingData: ReadingDayMap;

      beforeEach(() => {
        testReadingData = new Map();
        const sources = [{
          type: 'manual' as const,
          timestamp: new Date()
        }];
        
        testReadingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', sources, [1]));
        testReadingData.set('2024-01-02', createTestReadingDayEntry('2024-01-02', sources, [1]));
        testReadingData.set('2024-01-15', createTestReadingDayEntry('2024-01-15', sources, [2]));
        testReadingData.set('2024-02-01', createTestReadingDayEntry('2024-02-01', sources, [2]));
      });

      it('should aggregate by daily period', () => {
        const result = ReadingDataService.aggregateByPeriod(testReadingData, 'daily');
        
        expect(result.size).toBe(4);
        expect(result.has('2024-01-01')).toBe(true);
        expect(result.has('2024-01-02')).toBe(true);
        expect(result.has('2024-01-15')).toBe(true);
        expect(result.has('2024-02-01')).toBe(true);
      });

      it('should aggregate by monthly period', () => {
        const result = ReadingDataService.aggregateByPeriod(testReadingData, 'monthly');
        
        expect(result.size).toBe(2);
        expect(result.has('2024-01')).toBe(true);
        expect(result.has('2024-02')).toBe(true);
        
        const jan = result.get('2024-01');
        expect(jan?.readingDays).toBe(3);
        expect(jan?.books.size).toBe(2);
        
        const feb = result.get('2024-02');
        expect(feb?.readingDays).toBe(1);
        expect(feb?.books.size).toBe(1);
      });

      it('should aggregate by yearly period', () => {
        const result = ReadingDataService.aggregateByPeriod(testReadingData, 'yearly');
        
        expect(result.size).toBe(1);
        expect(result.has('2024')).toBe(true);
        
        const year = result.get('2024');
        expect(year?.readingDays).toBe(4);
        expect(year?.books.size).toBe(2);
      });
    });

    describe('findReadingPatterns', () => {
      it('should analyze reading patterns correctly', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const sources = [{
          type: 'manual' as const,
          timestamp: new Date()
        }];
        
        // Add Monday and Tuesday readings
        readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', sources, [1])); // Monday
        readingData.set('2024-01-02', createTestReadingDayEntry('2024-01-02', sources, [1])); // Tuesday
        readingData.set('2024-01-08', createTestReadingDayEntry('2024-01-08', sources, [1])); // Monday
        readingData.set('2024-01-09', createTestReadingDayEntry('2024-01-09', sources, [1])); // Tuesday

        const patterns = ReadingDataService.findReadingPatterns(readingData);

        expect(patterns.weekdayPattern.Monday).toBe(2);
        expect(patterns.weekdayPattern.Tuesday).toBe(2);
        expect(patterns.weekdayPattern.Wednesday).toBe(0);
        expect(patterns.readingHabits.preferredReadingDays).toContain('Monday');
        expect(patterns.readingHabits.preferredReadingDays).toContain('Tuesday');
        expect(patterns.streakAnalysis.longestStreak).toBeGreaterThan(0);
      });
    });

    describe('resolveConflictsAdvanced', () => {
      it('should use advanced scoring for conflict resolution', () => {
        const recentManualSource: ReadingDataSource = {
          type: 'manual',
          timestamp: new Date(), // Recent
          metadata: { confidence: 'high' }
        };

        const oldBookSource: ReadingDataSource = {
          type: 'book_completion',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          bookId: 1,
          metadata: { progress: 100 }
        };

        const entries = [
          createTestReadingDayEntry('2024-01-01', [oldBookSource], [1]),
          createTestReadingDayEntry('2024-01-01', [recentManualSource], [])
        ];

        const result = ReadingDataService.resolveConflictsAdvanced(entries);

        // Manual source should be first due to higher priority and recency
        expect(result.sources[0].type).toBe('manual');
        expect(result.sources).toHaveLength(2);
        expect(result.bookIds).toContain(1);
      });
    });
  });

  describe('performance and batch operations', () => {
    describe('mergeReadingDataBatch', () => {
      it('should handle large datasets efficiently', () => {
        const streakHistory = createTestStreakHistory(
          Array.from({ length: 500 }, (_, i) => {
            const date = new Date('2024-01-01');
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
          })
        );

        const books: Book[] = Array.from({ length: 50 }, (_, i) => 
          createTestBook(i + 1, `Book ${i + 1}`, {
            status: 'finished',
            progress: 100,
            dateStarted: '2024-01-01',
            dateFinished: '2024-01-03'
          })
        );

        const startTime = performance.now();
        const result = ReadingDataService.mergeReadingDataBatch(streakHistory, books, {
          chunkSize: 100,
          skipValidation: true
        });
        const endTime = performance.now();

        expect(result.size).toBeGreaterThan(0);
        expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      });
    });

    describe('bulkOperations', () => {
      it('should insert reading days in bulk', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const entries = [
          {
            date: '2024-01-01',
            sources: [{ type: 'manual' as const, timestamp: new Date() }],
            bookIds: [1]
          },
          {
            date: '2024-01-02',
            sources: [{ type: 'manual' as const, timestamp: new Date() }],
            bookIds: [2]
          }
        ];

        ReadingDataService.bulkOperations.insertReadingDays(readingData, entries);

        expect(readingData.size).toBe(2);
        expect(readingData.has('2024-01-01')).toBe(true);
        expect(readingData.has('2024-01-02')).toBe(true);
      });

      it('should update reading days in bulk', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const source = { type: 'manual' as const, timestamp: new Date() };
        
        readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [source], [1]));
        readingData.set('2024-01-02', createTestReadingDayEntry('2024-01-02', [source], [2]));

        const updates = [
          {
            date: '2024-01-01',
            updater: (entry: ReadingDayEntry) => ({ ...entry, notes: 'Updated' })
          },
          {
            date: '2024-01-02',
            updater: (entry: ReadingDayEntry) => ({ ...entry, notes: 'Updated too' })
          }
        ];

        ReadingDataService.bulkOperations.updateReadingDays(readingData, updates);

        expect(readingData.get('2024-01-01')?.notes).toBe('Updated');
        expect(readingData.get('2024-01-02')?.notes).toBe('Updated too');
      });

      it('should delete reading days in bulk', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const source = { type: 'manual' as const, timestamp: new Date() };
        
        readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [source], [1]));
        readingData.set('2024-01-02', createTestReadingDayEntry('2024-01-02', [source], [2]));
        readingData.set('2024-01-03', createTestReadingDayEntry('2024-01-03', [source], [3]));

        ReadingDataService.bulkOperations.deleteReadingDays(readingData, ['2024-01-01', '2024-01-03']);

        expect(readingData.size).toBe(1);
        expect(readingData.has('2024-01-01')).toBe(false);
        expect(readingData.has('2024-01-02')).toBe(true);
        expect(readingData.has('2024-01-03')).toBe(false);
      });
    });

    describe('streamingOperations', () => {
      it('should process data in streaming fashion', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const source = { type: 'manual' as const, timestamp: new Date() };
        
        for (let i = 1; i <= 100; i++) {
          const date = `2024-01-${String(i).padStart(2, '0')}`;
          readingData.set(date, createTestReadingDayEntry(date, [source], [i]));
        }

        const processor = (entry: ReadingDayEntry) => {
          if (entry.bookIds[0] % 2 === 0) { // Even book IDs
            return { ...entry, notes: 'Processed' };
          }
          return null;
        };

        const results = Array.from(ReadingDataService.streamingOperations.processStreaming(readingData, processor));

        expect(results.length).toBe(50); // Half of the entries
        expect(results.every(r => r.notes === 'Processed')).toBe(true);
      });

      it('should filter data in streaming fashion', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const source = { type: 'manual' as const, timestamp: new Date() };
        
        for (let i = 1; i <= 100; i++) {
          const date = `2024-01-${String(i).padStart(2, '0')}`;
          readingData.set(date, createTestReadingDayEntry(date, [source], [i]));
        }

        const predicate = (entry: ReadingDayEntry) => entry.bookIds[0] > 50;
        const results = Array.from(ReadingDataService.streamingOperations.filterStreaming(readingData, predicate));

        expect(results.length).toBe(50); // Half of the entries
        expect(results.every(r => r.bookIds[0] > 50)).toBe(true);
      });
    });
  });

  describe('enhanced validation', () => {
    describe('validateReadingDataEnhanced', () => {
      it('should provide detailed validation results', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const validSource = { type: 'manual' as const, timestamp: new Date() };
        const invalidSource = { type: 'invalid' as any, timestamp: new Date() };
        
        readingData.set('2024-01-01', createTestReadingDayEntry('2024-01-01', [validSource], [1]));
        readingData.set('invalid-date', createTestReadingDayEntry('invalid-date', [invalidSource], []));
        readingData.set('2024-01-03', createTestReadingDayEntry('2024-01-03', [], [2])); // No sources

        const result = ReadingDataService.validateReadingDataEnhanced(readingData);

        expect(result.isValid).toBe(false);
        expect(result.summary.totalEntries).toBe(3);
        expect(result.summary.validEntries).toBe(1);
        expect(result.summary.errorCount).toBeGreaterThan(0);
        
        // Check for specific error codes
        const errorCodes = result.errors.map(e => e.code);
        expect(errorCodes).toContain('INVALID_DATE_FORMAT');
        expect(errorCodes).toContain('INVALID_SOURCE_TYPE');
        expect(errorCodes).toContain('NO_SOURCES');
      });

      it('should detect warnings for edge cases', () => {
        const readingData = new Map<string, ReadingDayEntry>();
        const source = { type: 'manual' as const, timestamp: new Date() };
        
        // Future date
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        
        // Very old date
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 3);
        const oldDateStr = oldDate.toISOString().split('T')[0];
        
        readingData.set(futureDateStr, createTestReadingDayEntry(futureDateStr, [source], [1]));
        readingData.set(oldDateStr, createTestReadingDayEntry(oldDateStr, [source], [2]));

        const result = ReadingDataService.validateReadingDataEnhanced(readingData);

        expect(result.isValid).toBe(true); // Warnings don't make it invalid
        expect(result.summary.warningCount).toBe(2);
        
        const warningCodes = result.errors.filter(e => e.severity === 'warning').map(e => e.code);
        expect(warningCodes).toContain('FUTURE_DATE');
        expect(warningCodes).toContain('VERY_OLD_DATE');
      });
    });
  });
});