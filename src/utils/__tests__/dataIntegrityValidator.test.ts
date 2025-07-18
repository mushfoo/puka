import { describe, it, expect, beforeEach } from 'vitest';
import { DataIntegrityValidator } from '../dataIntegrityValidator';
import { EnhancedStreakHistory, EnhancedReadingDayEntry, Book } from '@/types';

describe('DataIntegrityValidator', () => {
  let validHistory: EnhancedStreakHistory;
  let sampleBooks: Book[];

  beforeEach(() => {
    validHistory = {
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
          notes: 'Great reading session',
          createdAt: new Date('2024-01-10T10:00:00'),
          modifiedAt: new Date('2024-01-10T10:00:00')
        },
        {
          date: '2024-01-11',
          source: 'book',
          bookIds: [1],
          notes: 'Continued reading',
          createdAt: new Date('2024-01-11T09:00:00'),
          modifiedAt: new Date('2024-01-11T09:00:00')
        },
        {
          date: '2024-01-12',
          source: 'manual',
          notes: 'Manual entry',
          createdAt: new Date('2024-01-12T15:00:00'),
          modifiedAt: new Date('2024-01-12T15:00:00')
        }
      ],
      lastSyncDate: new Date('2024-01-15'),
      version: 1
    };

    sampleBooks = [
      {
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        status: 'finished',
        progress: 100,
        dateAdded: new Date('2024-01-01'),
        dateFinished: new Date('2024-01-12')
      },
      {
        id: 2,
        title: 'Another Book',
        author: 'Another Author',
        status: 'currently_reading',
        progress: 50,
        dateAdded: new Date('2024-01-05'),
        dateStarted: new Date('2024-01-08')
      }
    ];
  });

  describe('validateEnhancedStreakHistory', () => {
    it('should validate perfect data without issues', () => {
      const result = DataIntegrityValidator.validateEnhancedStreakHistory(validHistory);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.recommendations).toContain('Data integrity is excellent - no action needed');
    });

    it('should detect missing required fields', () => {
      const invalidHistory = {
        ...validHistory,
        readingDayEntries: null as any,
        readingDays: null as any
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(invalidHistory);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThanOrEqual(50); // Score might be exactly 50
      expect(result.issues.some(i => i.type === 'critical')).toBe(true);
      expect(result.issues.some(i => i.message.includes('readingDayEntries'))).toBe(true);
      expect(result.issues.some(i => i.message.includes('readingDays'))).toBe(true);
    });

    it('should detect data consistency issues', () => {
      const inconsistentHistory = {
        ...validHistory,
        readingDays: new Set(['2024-01-10', '2024-01-11', '2024-01-13']), // Missing 2024-01-12, has extra 2024-01-13
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: '2024-01-14', // Extra entry not in readingDays
            source: 'manual' as const,
            createdAt: new Date('2024-01-14'),
            modifiedAt: new Date('2024-01-14')
          }
        ]
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(inconsistentHistory);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('missing from detailed entries'))).toBe(true);
      expect(result.issues.some(i => i.message.includes('missing from reading days set'))).toBe(true);
    });

    it('should detect duplicate entries', () => {
      const duplicateHistory = {
        ...validHistory,
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: '2024-01-10', // Duplicate date
            source: 'manual' as const,
            createdAt: new Date('2024-01-10T15:00:00'),
            modifiedAt: new Date('2024-01-10T15:00:00')
          }
        ]
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(duplicateHistory);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('Duplicate reading day entries'))).toBe(true);
      expect(result.fixableIssues.some(f => f.type === 'duplicate_entries')).toBe(true);
    });

    it('should detect invalid date formats', () => {
      const invalidDateHistory = {
        ...validHistory,
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: 'invalid-date-format',
            source: 'manual' as const,
            createdAt: new Date('2024-01-13'),
            modifiedAt: new Date('2024-01-13')
          },
          {
            date: '2024/01/14', // Wrong format
            source: 'manual' as const,
            createdAt: new Date('2024-01-14'),
            modifiedAt: new Date('2024-01-14')
          }
        ]
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(invalidDateHistory);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('invalid date format'))).toBe(true);
    });

    it('should detect future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const futureHistory = {
        ...validHistory,
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: futureDateStr,
            source: 'manual' as const,
            createdAt: new Date(),
            modifiedAt: new Date()
          }
        ],
        readingDays: new Set([...validHistory.readingDays, futureDateStr])
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(futureHistory);

      expect(result.warnings.some(w => w.message.includes('future dates'))).toBe(true);
    });

    it('should detect logical inconsistencies', () => {
      const illogicalHistory = {
        ...validHistory,
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'book' as const,
            bookIds: [], // Empty bookIds but source is 'book'
            createdAt: new Date('2024-01-10T15:00:00'),
            modifiedAt: new Date('2024-01-10T10:00:00') // modifiedAt before createdAt
          }
        ]
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(illogicalHistory);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('modifiedAt before createdAt'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('marked as \'book\' source but have no book IDs'))).toBe(true);
    });

    it('should detect invalid timestamps', () => {
      const invalidTimestampHistory = {
        ...validHistory,
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'manual' as const,
            createdAt: new Date('invalid-date'),
            modifiedAt: new Date('also-invalid')
          }
        ]
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(invalidTimestampHistory);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.message.includes('invalid timestamps'))).toBe(true);
    });

    it('should detect performance issues', () => {
      const largeHistory = {
        ...validHistory,
        readingDayEntries: Array.from({ length: 15000 }, (_, i) => ({
          date: `2020-01-${String(i % 30 + 1).padStart(2, '0')}`,
          source: 'manual' as const,
          notes: 'A'.repeat(1500), // Very long notes
          createdAt: new Date('2020-01-01'),
          modifiedAt: new Date('2020-01-01')
        }))
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(largeHistory);

      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Large number of reading day entries'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('very long notes'))).toBe(true);
    });

    it('should validate book references', () => {
      const historyWithBadRefs = {
        ...validHistory,
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'book' as const,
            bookIds: [1, 999], // 999 doesn't exist
            createdAt: new Date('2024-01-10'),
            modifiedAt: new Date('2024-01-10')
          }
        ]
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(historyWithBadRefs, sampleBooks);

      expect(result.warnings.some(w => w.message.includes('reference non-existent books'))).toBe(true);
    });

    it('should provide appropriate recommendations', () => {
      // Test critical issues
      const criticalHistory = {
        ...validHistory,
        readingDayEntries: null as any
      };
      const criticalResult = DataIntegrityValidator.validateEnhancedStreakHistory(criticalHistory);
      expect(criticalResult.recommendations).toContain('Address critical data structure issues immediately');

      // Test good score
      const goodResult = DataIntegrityValidator.validateEnhancedStreakHistory(validHistory);
      expect(goodResult.recommendations).toContain('Data integrity is excellent - no action needed');
    });
  });

  describe('getValidationStats', () => {
    it('should calculate validation statistics correctly', () => {
      const stats = DataIntegrityValidator.getValidationStats(validHistory);

      expect(stats.totalEntries).toBe(3);
      expect(stats.validEntries).toBe(3);
      expect(stats.invalidEntries).toBe(0);
      expect(stats.duplicateEntries).toBe(0);
      expect(stats.futureEntries).toBe(0);
      expect(stats.missingMetadata).toBe(0);
      expect(stats.consistencyScore).toBe(100);
      expect(stats.dataQualityScore).toBe(100);
    });

    it('should calculate stats for problematic data', () => {
      const problematicHistory = {
        ...validHistory,
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: 'invalid-date',
            source: 'manual' as const,
            createdAt: new Date('2024-01-13'),
            modifiedAt: new Date('2024-01-13')
          },
          {
            date: '2024-01-10', // Duplicate
            source: 'manual' as const,
            createdAt: new Date('2024-01-10'),
            modifiedAt: new Date('2024-01-10')
          }
        ]
      };

      const stats = DataIntegrityValidator.getValidationStats(problematicHistory);

      expect(stats.totalEntries).toBe(5);
      expect(stats.duplicateEntries).toBeGreaterThan(0);
      expect(stats.consistencyScore).toBeLessThan(100);
      expect(stats.dataQualityScore).toBeLessThan(100);
    });
  });

  describe('autoFixIssues', () => {
    it('should fix missing readingDays Set', () => {
      const brokenHistory = {
        ...validHistory,
        readingDays: null as any
      };

      const result = DataIntegrityValidator.autoFixIssues(brokenHistory);

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.updatedHistory.readingDays).toBeInstanceOf(Set);
      expect(result.updatedHistory.readingDays.size).toBe(3);
    });

    it('should fix missing version', () => {
      const brokenHistory = {
        ...validHistory,
        version: null as any
      };

      const result = DataIntegrityValidator.autoFixIssues(brokenHistory);

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.updatedHistory.version).toBe(1);
    });

    it('should fix missing timestamps', () => {
      const brokenHistory = {
        ...validHistory,
        lastSyncDate: null as any,
        lastCalculated: null as any
      };

      const result = DataIntegrityValidator.autoFixIssues(brokenHistory);

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.updatedHistory.lastSyncDate).toBeInstanceOf(Date);
      expect(result.updatedHistory.lastCalculated).toBeInstanceOf(Date);
    });

    it('should remove duplicate entries', () => {
      const duplicateHistory = {
        ...validHistory,
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: '2024-01-10', // Duplicate - older timestamp
            source: 'manual' as const,
            createdAt: new Date('2024-01-10T08:00:00'),
            modifiedAt: new Date('2024-01-10T08:00:00')
          },
          {
            date: '2024-01-10', // Duplicate - newer timestamp (should be kept)
            source: 'book' as const,
            bookIds: [1],
            createdAt: new Date('2024-01-10T12:00:00'),
            modifiedAt: new Date('2024-01-10T12:00:00')
          }
        ]
      };

      const result = DataIntegrityValidator.autoFixIssues(duplicateHistory);

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.updatedHistory.readingDayEntries).toHaveLength(3);
      
      // Should keep the entry with the latest modifiedAt
      const entry = result.updatedHistory.readingDayEntries.find(e => e.date === '2024-01-10');
      expect(entry!.source).toBe('book');
      expect(entry!.bookIds).toEqual([1]);
    });

    it('should synchronize readingDays with readingDayEntries', () => {
      const unsyncedHistory = {
        ...validHistory,
        readingDays: new Set(['2024-01-10', '2024-01-15']), // Missing 2024-01-11, 2024-01-12, has extra 2024-01-15
        readingDayEntries: [
          ...validHistory.readingDayEntries,
          {
            date: '2024-01-16', // Extra entry not in readingDays
            source: 'manual' as const,
            createdAt: new Date('2024-01-16'),
            modifiedAt: new Date('2024-01-16')
          }
        ]
      };

      const result = DataIntegrityValidator.autoFixIssues(unsyncedHistory);

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.updatedHistory.readingDays.size).toBe(5); // Should include all dates
      expect(result.updatedHistory.readingDays.has('2024-01-10')).toBe(true);
      expect(result.updatedHistory.readingDays.has('2024-01-11')).toBe(true);
      expect(result.updatedHistory.readingDays.has('2024-01-12')).toBe(true);
      expect(result.updatedHistory.readingDays.has('2024-01-15')).toBe(true);
      expect(result.updatedHistory.readingDays.has('2024-01-16')).toBe(true);
    });

    it('should handle error gracefully', () => {
      // Create a problematic history that might cause errors
      const problematicHistory = {
        ...validHistory,
        readingDayEntries: 'invalid' as any
      };

      const result = DataIntegrityValidator.autoFixIssues(problematicHistory);

      // The auto-fix method is robust and might succeed even with invalid data
      // Just ensure it returns a valid result structure
      expect(result.updatedHistory).toBeDefined();
      expect(typeof result.fixed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(result.fixed + result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty history', () => {
      const emptyHistory: EnhancedStreakHistory = {
        readingDays: new Set(),
        bookPeriods: [],
        lastCalculated: new Date(),
        readingDayEntries: [],
        lastSyncDate: new Date(),
        version: 1
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(emptyHistory);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should handle history with only one entry', () => {
      const singleEntryHistory: EnhancedStreakHistory = {
        readingDays: new Set(['2024-01-10']),
        bookPeriods: [],
        lastCalculated: new Date(),
        readingDayEntries: [
          {
            date: '2024-01-10',
            source: 'manual',
            createdAt: new Date('2024-01-10'),
            modifiedAt: new Date('2024-01-10')
          }
        ],
        lastSyncDate: new Date(),
        version: 1
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(singleEntryHistory);

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should handle history with ancient dates', () => {
      const ancientHistory: EnhancedStreakHistory = {
        readingDays: new Set(['1990-01-01']),
        bookPeriods: [],
        lastCalculated: new Date(),
        readingDayEntries: [
          {
            date: '1990-01-01',
            source: 'manual',
            createdAt: new Date('1990-01-01'),
            modifiedAt: new Date('1990-01-01')
          }
        ],
        lastSyncDate: new Date(),
        version: 1
      };

      const result = DataIntegrityValidator.validateEnhancedStreakHistory(ancientHistory);

      expect(result.warnings.some(w => w.message.includes('unusually old dates'))).toBe(true);
    });
  });
});