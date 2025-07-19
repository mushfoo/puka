import { describe, it, expect } from 'vitest';
import { EnhancedStreakMigration, LegacyStreakData } from '../enhancedStreakMigration';
import { DataIntegrityValidator } from '../dataIntegrityValidator';
import { EnhancedStreakHistory } from '@/types';

describe('EnhancedStreakMigration', () => {
  describe('detectLegacyFormat', () => {
    it('should detect basic legacy format', () => {
      const legacyData = {
        currentStreak: 5,
        longestStreak: 10,
        lastReadDate: '2024-01-15',
        readingDays: ['2024-01-10', '2024-01-11', '2024-01-12'],
        totalDaysRead: 3
      };

      const result = EnhancedStreakMigration.detectLegacyFormat(legacyData);

      expect(result.format).toBe('basic_legacy');
      expect(result.version).toBe(0);
      expect(result.dataPoints).toBe(3);
      expect(result.estimatedMigrationTime).toBe('< 1 second');
      expect(result.issues).toEqual([]);
    });

    it('should detect enhanced legacy format', () => {
      const legacyData = {
        readingDayEntries: [
          {
            date: '2024-01-10',
            bookIds: [1, 2],
            notes: 'Great reading day',
            sources: [{ type: 'book_completion', timestamp: new Date('2024-01-10') }]
          },
          {
            date: '2024-01-11',
            bookIds: [2],
            notes: 'Continued reading',
            sources: [{ type: 'progress_update', timestamp: new Date('2024-01-11') }]
          }
        ],
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-15'),
            totalDays: 5
          }
        ],
        lastCalculated: new Date('2024-01-15')
      };

      const result = EnhancedStreakMigration.detectLegacyFormat(legacyData);

      expect(result.format).toBe('enhanced_legacy');
      expect(result.version).toBe(0);
      expect(result.dataPoints).toBe(2);
      expect(result.estimatedMigrationTime).toBe('< 1 second');
      expect(result.issues).toEqual([]);
    });

    it('should detect unknown format for unsupported reading day map', () => {
      const legacyData = {
        readingDayMap: {
          '2024-01-10': {
            date: '2024-01-10',
            bookIds: [1],
            notes: 'Reading session',
            sources: [{ type: 'manual', timestamp: new Date('2024-01-10') }]
          },
          '2024-01-11': {
            date: '2024-01-11',
            bookIds: [1, 2],
            notes: 'Another session',
            sources: [{ type: 'book_completion', timestamp: new Date('2024-01-11') }]
          }
        }
      };

      const result = EnhancedStreakMigration.detectLegacyFormat(legacyData);

      expect(result.format).toBe('unknown');
      expect(result.version).toBe(0);
      expect(result.dataPoints).toBe(0);
      expect(result.issues).toContain('Unknown or unsupported data format');
    });

    it('should detect enhanced current format', () => {
      const enhancedData = {
        version: 1,
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'book' as const,
            bookIds: [1],
            notes: 'Reading session',
            createdAt: new Date('2024-01-10'),
            modifiedAt: new Date('2024-01-10')
          }
        ],
        readingDays: new Set(['2024-01-10']),
        bookPeriods: [],
        lastCalculated: new Date('2024-01-15'),
        lastSyncDate: new Date('2024-01-15')
      };

      const result = EnhancedStreakMigration.detectLegacyFormat(enhancedData);

      expect(result.format).toBe('enhanced_current');
      expect(result.version).toBe(1);
      expect(result.dataPoints).toBe(1);
      expect(result.estimatedMigrationTime).toBe('No migration needed');
      expect(result.issues).toEqual([]);
    });

    it('should detect unknown format', () => {
      const unknownData = {
        randomField: 'value',
        anotherField: 123
      };

      const result = EnhancedStreakMigration.detectLegacyFormat(unknownData);

      expect(result.format).toBe('unknown');
      expect(result.version).toBe(0);
      expect(result.dataPoints).toBe(0);
      expect(result.issues).toContain('Unknown or unsupported data format');
    });
  });

  describe('migrateLegacyStreakData', () => {
    it('should migrate basic legacy format successfully', async () => {
      const legacyData = {
        currentStreak: 5,
        longestStreak: 10,
        lastReadDate: '2024-01-15',
        readingDays: ['2024-01-10', '2024-01-11', '2024-01-12'],
        totalDaysRead: 3,
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-12'),
            totalDays: 3
          }
        ],
        lastCalculated: new Date('2024-01-15')
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(legacyData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();
      expect(result.dataPointsMigrated).toBe(3);
      expect(result.migratedHistory!.readingDayEntries).toHaveLength(3);
      expect(result.migratedHistory!.readingDays.size).toBe(3);
      expect(result.migratedHistory!.version).toBe(1);
      expect(result.preservedMetadata).toHaveProperty('legacyCurrentStreak', 5);
      expect(result.preservedMetadata).toHaveProperty('legacyLongestStreak', 10);
    });

    it('should migrate enhanced legacy format successfully', async () => {
      const legacyData = {
        readingDayEntries: [
          {
            date: '2024-01-10',
            bookIds: [1, 2],
            notes: 'Great reading day',
            sources: [
              { type: 'book_completion' as const, timestamp: new Date('2024-01-10T10:00:00') },
              { type: 'progress_update' as const, timestamp: new Date('2024-01-10T14:00:00') }
            ]
          },
          {
            date: '2024-01-11',
            bookIds: [2],
            notes: 'Continued reading',
            sources: [{ type: 'progress_update' as const, timestamp: new Date('2024-01-11T15:00:00') }]
          }
        ],
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book 1',
            author: 'Test Author 1',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-15'),
            totalDays: 5
          },
          {
            bookId: 2,
            title: 'Test Book 2',
            author: 'Test Author 2',
            startDate: new Date('2024-01-08'),
            endDate: new Date('2024-01-12'),
            totalDays: 4
          }
        ],
        lastCalculated: new Date('2024-01-15')
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(legacyData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();
      expect(result.dataPointsMigrated).toBe(2);
      expect(result.migratedHistory!.readingDayEntries).toHaveLength(2);
      expect(result.migratedHistory!.readingDays.size).toBe(2);
      expect(result.migratedHistory!.version).toBe(1);
      expect(result.migratedHistory!.bookPeriods).toHaveLength(2);

      // Check that metadata is preserved
      const firstEntry = result.migratedHistory!.readingDayEntries.find(e => e.date === '2024-01-10');
      expect(firstEntry!.source).toBe('book'); // Should infer from book IDs
      expect(firstEntry!.bookIds).toEqual([1, 2]);
      expect(firstEntry!.notes).toBe('Great reading day');
      expect(firstEntry!.createdAt).toEqual(new Date('2024-01-10T10:00:00'));
      expect(firstEntry!.modifiedAt).toEqual(new Date('2024-01-10T14:00:00'));
    });

    it('should fail to migrate unsupported reading day map format', async () => {
      const legacyData = {
        readingDayMap: {
          '2024-01-10': {
            date: '2024-01-10',
            bookIds: [1],
            notes: 'Reading session',
            sources: [{ type: 'manual' as const, timestamp: new Date('2024-01-10T09:00:00') }]
          },
          '2024-01-11': {
            date: '2024-01-11',
            bookIds: [1, 2],
            notes: 'Another session',
            sources: [{ type: 'book_completion' as const, timestamp: new Date('2024-01-11T16:00:00') }]
          }
        }
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(legacyData);

      expect(result.success).toBe(false);
      expect(result.migratedHistory).toBeNull();
      expect(result.issues).toContain('Cannot migrate unknown data format');
      expect(result.dataPointsMigrated).toBe(0);
    });

    it('should handle serialized Set readingDays', async () => {
      const legacyData = {
        readingDays: {
          '0': '2024-01-10',
          '1': '2024-01-11',
          '2': '2024-01-12'
        },
        currentStreak: 3,
        longestStreak: 5
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(legacyData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();
      expect(result.dataPointsMigrated).toBe(3);
      expect(result.migratedHistory!.readingDays.size).toBe(3);
      expect(result.migratedHistory!.readingDays.has('2024-01-10')).toBe(true);
      expect(result.migratedHistory!.readingDays.has('2024-01-11')).toBe(true);
      expect(result.migratedHistory!.readingDays.has('2024-01-12')).toBe(true);
    });

    it('should handle already migrated data', async () => {
      const enhancedData = {
        version: 1,
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'book' as const,
            bookIds: [1],
            notes: 'Reading session',
            createdAt: new Date('2024-01-10'),
            modifiedAt: new Date('2024-01-10')
          }
        ],
        readingDays: new Set(['2024-01-10']),
        bookPeriods: [],
        lastCalculated: new Date('2024-01-15'),
        lastSyncDate: new Date('2024-01-15')
      };

      // This test uses enhanced format data that should be detected as already migrated
      const result = await EnhancedStreakMigration.migrateLegacyStreakData(enhancedData as unknown as LegacyStreakData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();
      expect(result.dataPointsMigrated).toBe(1);
      expect(result.warnings).toContain('Data already in enhanced format');
    });

    it('should handle unknown format gracefully', async () => {
      const unknownData = {
        randomField: 'value',
        anotherField: 123
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(unknownData);

      expect(result.success).toBe(false);
      expect(result.migratedHistory).toBeNull();
      expect(result.issues).toContain('Cannot migrate unknown data format');
    });
  });

  describe('getMigrationStats', () => {
    it('should calculate migration statistics correctly', () => {
      const originalData = {
        readingDays: ['2024-01-10', '2024-01-11', '2024-01-12'],
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-12'),
            totalDays: 3
          }
        ],
        customField: 'custom value'
      };

      const migratedData: EnhancedStreakHistory = {
        readingDays: new Set(['2024-01-10', '2024-01-11', '2024-01-12']),
        bookPeriods: [
          {
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-12'),
            totalDays: 3
          }
        ],
        lastCalculated: new Date('2024-01-15'),
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'book',
            bookIds: [1],
            createdAt: new Date('2024-01-10'),
            modifiedAt: new Date('2024-01-10')
          },
          {
            date: '2024-01-11',
            source: 'book',
            bookIds: [1],
            createdAt: new Date('2024-01-11'),
            modifiedAt: new Date('2024-01-11')
          },
          {
            date: '2024-01-12',
            source: 'book',
            bookIds: [1],
            createdAt: new Date('2024-01-12'),
            modifiedAt: new Date('2024-01-12')
          }
        ],
        lastSyncDate: new Date('2024-01-15'),
        version: 1
      };

      const stats = EnhancedStreakMigration.getMigrationStats(originalData, migratedData);

      expect(stats.totalReadingDays).toBe(3);
      expect(stats.preservedBookPeriods).toBe(1);
      expect(stats.migratedReadingDayEntries).toBe(3);
      expect(stats.recoveredMetadata).toBe(1); // customField
      expect(stats.dataIntegrityScore).toBe(100); // Perfect migration
    });
  });

  describe('data integrity validation', () => {
    it('should validate migrated data and detect issues', async () => {
      const legacyData = {
        readingDays: ['2024-01-10', '2024-01-11', '2024-01-12'],
        currentStreak: 3,
        longestStreak: 5
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(legacyData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();

      // Validate the migrated data
      const validation = DataIntegrityValidator.validateEnhancedStreakHistory(result.migratedHistory!);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(90); // Should be high quality
      expect(validation.issues.filter(i => i.type === 'critical')).toHaveLength(0);
    });

    it('should handle and fix data integrity issues', async () => {
      // Create data with intentional issues
      const problematicData = {
        readingDays: ['2024-01-10', '2024-01-11', '2024-01-12'],
        // Missing some required fields to trigger auto-fix
        currentStreak: 3
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(problematicData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();

      // The migration should have auto-fixed basic issues
      expect(result.migratedHistory!.version).toBe(1);
      expect(result.migratedHistory!.lastSyncDate).toBeDefined();
      expect(result.migratedHistory!.readingDays).toBeDefined();
      expect(result.migratedHistory!.readingDayEntries).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', async () => {
      const emptyData = {};

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(emptyData);

      expect(result.success).toBe(false);
      expect(result.issues).toContain('Cannot migrate unknown data format');
    });

    it('should handle null/undefined data', async () => {
      const result1 = await EnhancedStreakMigration.migrateLegacyStreakData(null as any);
      expect(result1.success).toBe(false);

      const result2 = await EnhancedStreakMigration.migrateLegacyStreakData(undefined as any);
      expect(result2.success).toBe(false);
    });

    it('should handle malformed dates', async () => {
      const malformedData = {
        readingDays: ['invalid-date', '2024-01-11', 'another-bad-date'],
        currentStreak: 1
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(malformedData);

      // Debug what's happening
      console.log('Migration result:', {
        success: result.success,
        issues: result.issues,
        warnings: result.warnings,
        dataPointsMigrated: result.dataPointsMigrated
      });

      // The simplified migration should succeed and filter out malformed dates
      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();
      
      // Should only include valid dates (filters out malformed ones)
      expect(result.migratedHistory!.readingDayEntries).toHaveLength(1);
      expect(result.migratedHistory!.readingDays.size).toBe(1);
      expect(result.dataPointsMigrated).toBe(1);
      
      // Should have migrated the valid date
      expect(result.migratedHistory!.readingDays.has('2024-01-11')).toBe(true);
    });

    it('should handle very large datasets', async () => {
      // Create a large dataset
      const largeReadingDays = Array.from({ length: 1000 }, (_, i) => {
        const date = new Date('2020-01-01');
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const largeData = {
        readingDays: largeReadingDays,
        currentStreak: 100,
        longestStreak: 200
      };

      const result = await EnhancedStreakMigration.migrateLegacyStreakData(largeData);

      expect(result.success).toBe(true);
      expect(result.migratedHistory).toBeDefined();
      expect(result.dataPointsMigrated).toBe(1000);
      expect(result.migratedHistory!.readingDays.size).toBe(1000);
      expect(result.migratedHistory!.readingDayEntries).toHaveLength(1000);
    });
  });
});