import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageService } from '@/services/storage/MockStorageService';
import { StreakHistory, EnhancedStreakHistory } from '@/types';
import { 
  migrateStreakHistory, 
  isEnhancedStreakHistory,
  ensureEnhancedStreakHistory,
  createEmptyEnhancedStreakHistory,
  validateEnhancedStreakHistory,
  CURRENT_STREAK_HISTORY_VERSION
} from '@/utils/streakMigration';

describe('Streak History Migration Tests', () => {
  describe('Migration Utility Functions', () => {
    it('should identify legacy vs enhanced streak history', () => {
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-01', '2024-01-02']),
        bookPeriods: [],
        lastCalculated: new Date()
      };

      const enhancedHistory: EnhancedStreakHistory = {
        ...legacyHistory,
        readingDayEntries: [],
        lastSyncDate: new Date(),
        version: CURRENT_STREAK_HISTORY_VERSION
      };

      expect(isEnhancedStreakHistory(legacyHistory)).toBe(false);
      expect(isEnhancedStreakHistory(enhancedHistory)).toBe(true);
    });

    it('should migrate legacy history correctly', () => {
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-10', '2024-01-15', '2024-01-20']),
        bookPeriods: [
          {
            bookId: 1,
            title: 'Book One',
            author: 'Author One',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-15'),
            totalDays: 6
          },
          {
            bookId: 2,
            title: 'Book Two',
            author: 'Author Two',
            startDate: new Date('2024-01-18'),
            endDate: new Date('2024-01-25'),
            totalDays: 8
          }
        ],
        lastCalculated: new Date('2024-01-25T10:00:00Z')
      };

      const migratedHistory = migrateStreakHistory(legacyHistory);

      // Check basic structure
      expect(migratedHistory.version).toBe(CURRENT_STREAK_HISTORY_VERSION);
      expect(migratedHistory.readingDayEntries).toHaveLength(3);
      expect(migratedHistory.readingDays.size).toBe(3);
      expect(migratedHistory.lastSyncDate).toBeDefined();

      // Check preserved legacy fields
      expect(migratedHistory.bookPeriods).toHaveLength(2);
      expect(migratedHistory.lastCalculated).toEqual(legacyHistory.lastCalculated);

      // Check migrated reading day entries
      const entry1 = migratedHistory.readingDayEntries.find(e => e.date === '2024-01-10');
      expect(entry1).toBeDefined();
      expect(entry1!.source).toBe('book');
      expect(entry1!.bookIds).toContain(1);

      const entry2 = migratedHistory.readingDayEntries.find(e => e.date === '2024-01-15');
      expect(entry2).toBeDefined();
      expect(entry2!.bookIds).toContain(1);

      const entry3 = migratedHistory.readingDayEntries.find(e => e.date === '2024-01-20');
      expect(entry3).toBeDefined();
      expect(entry3!.bookIds).toContain(2); // Book Two covers this date (2024-01-18 to 2024-01-25)
    });

    it('should ensure enhanced format with migration when needed', () => {
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-01']),
        bookPeriods: [],
        lastCalculated: new Date()
      };

      const ensuredHistory = ensureEnhancedStreakHistory(legacyHistory);
      expect(isEnhancedStreakHistory(ensuredHistory)).toBe(true);
      expect(ensuredHistory.version).toBe(CURRENT_STREAK_HISTORY_VERSION);
    });

    it('should return enhanced history as-is if already enhanced', () => {
      const enhancedHistory: EnhancedStreakHistory = {
        readingDays: new Set(['2024-01-01']),
        bookPeriods: [],
        lastCalculated: new Date(),
        readingDayEntries: [],
        lastSyncDate: new Date(),
        version: CURRENT_STREAK_HISTORY_VERSION
      };

      const ensuredHistory = ensureEnhancedStreakHistory(enhancedHistory);
      expect(ensuredHistory).toBe(enhancedHistory); // Same reference
    });

    it('should create empty enhanced history', () => {
      const emptyHistory = createEmptyEnhancedStreakHistory();
      
      expect(emptyHistory.readingDays.size).toBe(0);
      expect(emptyHistory.readingDayEntries).toHaveLength(0);
      expect(emptyHistory.bookPeriods).toHaveLength(0);
      expect(emptyHistory.version).toBe(CURRENT_STREAK_HISTORY_VERSION);
      expect(emptyHistory.lastCalculated).toBeDefined();
      expect(emptyHistory.lastSyncDate).toBeDefined();
    });

    it('should validate enhanced streak history', () => {
      const validHistory = createEmptyEnhancedStreakHistory();
      validHistory.readingDayEntries = [{
        date: '2024-01-01',
        source: 'manual',
        createdAt: new Date(),
        modifiedAt: new Date()
      }];
      validHistory.readingDays = new Set(['2024-01-01']);

      const validation = validateEnhancedStreakHistory(validHistory);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect validation issues', () => {
      const invalidHistory = createEmptyEnhancedStreakHistory();
      invalidHistory.version = CURRENT_STREAK_HISTORY_VERSION + 10; // Future version
      invalidHistory.readingDayEntries = [
        {
          date: '2024-01-01',
          source: 'manual',
          createdAt: new Date(),
          modifiedAt: new Date()
        },
        {
          date: '2024-01-01', // Duplicate
          source: 'book',
          createdAt: new Date(),
          modifiedAt: new Date()
        },
        {
          date: 'invalid-date', // Invalid format
          source: 'manual',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ];

      const validation = validateEnhancedStreakHistory(invalidHistory);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues.some(issue => issue.includes('version'))).toBe(true);
      expect(validation.issues.some(issue => issue.includes('Duplicate'))).toBe(true);
      expect(validation.issues.some(issue => issue.includes('invalid date format'))).toBe(true);
    });
  });

  describe('Storage Service Migration Integration', () => {
    let storage: MockStorageService;

    beforeEach(async () => {
      storage = new MockStorageService();
      await storage.initialize();
    });

    it('should migrate legacy data through storage service', async () => {
      // Create and save legacy streak history
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-01', '2024-01-02', '2024-01-03']),
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-03'),
            totalDays: 3
          }
        ],
        lastCalculated: new Date('2024-01-03T12:00:00Z')
      };

      await storage.saveStreakHistory(legacyHistory);

      // Perform migration
      const migratedHistory = await storage.migrateToEnhancedStreakHistory();
      
      expect(migratedHistory).toBeDefined();
      expect(migratedHistory!.readingDayEntries).toHaveLength(3);
      expect(migratedHistory!.version).toBe(CURRENT_STREAK_HISTORY_VERSION);

      // Verify the enhanced history is now available
      const retrievedHistory = await storage.getEnhancedStreakHistory();
      expect(retrievedHistory).toBeDefined();
      expect(retrievedHistory!.readingDayEntries).toHaveLength(3);
    });

    it('should handle migration with complex book periods', async () => {
      // Create legacy history with overlapping book periods
      const legacyHistory: StreakHistory = {
        readingDays: new Set([
          '2024-01-01', '2024-01-02', '2024-01-03', 
          '2024-01-04', '2024-01-05', '2024-01-06'
        ]),
        bookPeriods: [
          {
            bookId: 1,
            title: 'Book One',
            author: 'Author One',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-03'),
            totalDays: 3
          },
          {
            bookId: 2,
            title: 'Book Two',
            author: 'Author Two',
            startDate: new Date('2024-01-02'), // Overlaps with Book One
            endDate: new Date('2024-01-05'),
            totalDays: 4
          },
          {
            bookId: 3,
            title: 'Book Three',
            author: 'Author Three',
            startDate: new Date('2024-01-06'),
            endDate: new Date('2024-01-08'),
            totalDays: 3
          }
        ],
        lastCalculated: new Date('2024-01-08T15:00:00Z')
      };

      await storage.saveStreakHistory(legacyHistory);
      const migratedHistory = await storage.migrateToEnhancedStreakHistory();

      expect(migratedHistory).toBeDefined();
      expect(migratedHistory!.readingDayEntries).toHaveLength(6);

      // Check overlapping period handling
      const overlappingEntry = migratedHistory!.readingDayEntries.find(e => e.date === '2024-01-02');
      expect(overlappingEntry).toBeDefined();
      expect(overlappingEntry!.bookIds).toEqual(expect.arrayContaining([1, 2]));

      // Check non-overlapping entries
      const singleBookEntry = migratedHistory!.readingDayEntries.find(e => e.date === '2024-01-06');
      expect(singleBookEntry).toBeDefined();
      expect(singleBookEntry!.bookIds).toEqual([3]);
    });

    it('should handle edge cases in migration', async () => {
      // Test with empty reading days
      const emptyHistory: StreakHistory = {
        readingDays: new Set(),
        bookPeriods: [],
        lastCalculated: new Date()
      };

      await storage.saveStreakHistory(emptyHistory);
      const migratedHistory = await storage.migrateToEnhancedStreakHistory();

      expect(migratedHistory).toBeDefined();
      expect(migratedHistory!.readingDayEntries).toHaveLength(0);
      expect(migratedHistory!.readingDays.size).toBe(0);
    });

    it('should preserve all legacy data during migration', async () => {
      const originalDate = new Date('2024-01-15T10:30:00Z');
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-15']),
        bookPeriods: [
          {
            bookId: 42,
            title: 'Important Book',
            author: 'Famous Author',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-20'),
            totalDays: 11
          }
        ],
        lastCalculated: originalDate
      };

      await storage.saveStreakHistory(legacyHistory);
      const migratedHistory = await storage.migrateToEnhancedStreakHistory();

      // Verify all legacy data is preserved
      expect(migratedHistory!.readingDays).toEqual(legacyHistory.readingDays);
      expect(migratedHistory!.bookPeriods).toEqual(legacyHistory.bookPeriods);
      expect(migratedHistory!.lastCalculated).toEqual(originalDate);

      // Verify new fields are added
      expect(migratedHistory!.version).toBe(CURRENT_STREAK_HISTORY_VERSION);
      expect(migratedHistory!.lastSyncDate).toBeDefined();
      expect(migratedHistory!.readingDayEntries).toHaveLength(1);
      expect(migratedHistory!.readingDayEntries[0].date).toBe('2024-01-15');
      expect(migratedHistory!.readingDayEntries[0].bookIds).toEqual([42]);
    });

    it('should handle multiple migrations gracefully', async () => {
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-01']),
        bookPeriods: [],
        lastCalculated: new Date()
      };

      await storage.saveStreakHistory(legacyHistory);

      // First migration
      const firstMigration = await storage.migrateToEnhancedStreakHistory();
      expect(firstMigration).toBeDefined();

      // Second migration should return the same enhanced data
      const secondMigration = await storage.migrateToEnhancedStreakHistory();
      expect(secondMigration).toBeDefined();
      expect(secondMigration!.readingDayEntries).toHaveLength(1);
      expect(secondMigration!.version).toBe(CURRENT_STREAK_HISTORY_VERSION);
    });

    it('should validate migrated data integrity', async () => {
      const legacyHistory: StreakHistory = {
        readingDays: new Set(['2024-01-01', '2024-01-02']),
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-02'),
            totalDays: 2
          }
        ],
        lastCalculated: new Date()
      };

      await storage.saveStreakHistory(legacyHistory);
      const migratedHistory = await storage.migrateToEnhancedStreakHistory();

      // Validate the migrated data
      const validation = validateEnhancedStreakHistory(migratedHistory!);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);

      // Verify synchronization between data structures
      expect(migratedHistory!.readingDays.size).toBe(migratedHistory!.readingDayEntries.length);
      
      for (const entry of migratedHistory!.readingDayEntries) {
        expect(migratedHistory!.readingDays.has(entry.date)).toBe(true);
      }
    });
  });

  describe('Performance and Memory Management', () => {
    let storage: MockStorageService;

    beforeEach(async () => {
      storage = new MockStorageService();
      await storage.initialize();
    });

    it('should handle large dataset migration efficiently', async () => {
      // Create large legacy dataset
      const readingDays = new Set<string>();
      const bookPeriods = [];

      // Generate 365 days of reading data
      for (let i = 0; i < 365; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        readingDays.add(date.toISOString().split('T')[0]);

        // Add book periods every 30 days
        if (i % 30 === 0) {
          const endDate = new Date(date);
          endDate.setDate(endDate.getDate() + 29);
          bookPeriods.push({
            bookId: Math.floor(i / 30) + 1,
            title: `Book ${Math.floor(i / 30) + 1}`,
            author: `Author ${Math.floor(i / 30) + 1}`,
            startDate: new Date(date),
            endDate: endDate,
            totalDays: 30
          });
        }
      }

      const largeLegacyHistory: StreakHistory = {
        readingDays,
        bookPeriods,
        lastCalculated: new Date()
      };

      await storage.saveStreakHistory(largeLegacyHistory);

      const migrationStart = Date.now();
      const migratedHistory = await storage.migrateToEnhancedStreakHistory();
      const migrationTime = Date.now() - migrationStart;

      console.log(`Migrated ${readingDays.size} reading days in ${migrationTime}ms`);

      expect(migratedHistory).toBeDefined();
      expect(migratedHistory!.readingDayEntries).toHaveLength(365);
      expect(migrationTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain memory efficiency during migration', async () => {
      // Test memory usage doesn't grow excessively during migration
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const legacyHistory: StreakHistory = {
        readingDays: new Set(Array.from({ length: 1000 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        })),
        bookPeriods: [],
        lastCalculated: new Date()
      };

      await storage.saveStreakHistory(legacyHistory);
      await storage.migrateToEnhancedStreakHistory();

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory increase during migration: ${memoryIncrease} bytes`);
      
      // Memory increase should be reasonable (less than 10MB)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });
});