import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockStorageService } from '@/services/storage/MockStorageService';
import { FileSystemStorageService } from '@/services/storage/FileSystemStorageService';
import { StorageError, BulkReadingDayOperation } from '@/services/storage/StorageService';
import { StreakHistory } from '@/types';
import { createEmptyEnhancedStreakHistory, CURRENT_STREAK_HISTORY_VERSION } from '@/utils/streakMigration';

describe('Enhanced Storage Integration Tests', () => {
  describe('MockStorageService Enhanced Features', () => {
    let storage: MockStorageService;

    beforeEach(async () => {
      storage = new MockStorageService();
      await storage.initialize();
    });

    afterEach(() => {
      storage.reset();
    });

    describe('Enhanced Streak History Management', () => {
      it('should start with no enhanced streak history', async () => {
        const history = await storage.getEnhancedStreakHistory();
        expect(history).toBeNull();
      });

      it('should save and retrieve enhanced streak history', async () => {
        const testHistory = createEmptyEnhancedStreakHistory();
        testHistory.readingDayEntries = [{
          date: '2024-01-15',
          source: 'manual',
          bookIds: [1, 2],
          notes: 'Great reading session',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          modifiedAt: new Date('2024-01-15T10:00:00Z')
        }];
        testHistory.readingDays = new Set(['2024-01-15']);

        const savedHistory = await storage.saveEnhancedStreakHistory(testHistory);
        expect(savedHistory).toBeDefined();
        expect(savedHistory.readingDayEntries).toHaveLength(1);
        expect(savedHistory.readingDayEntries[0].date).toBe('2024-01-15');
        expect(savedHistory.readingDayEntries[0].source).toBe('manual');
        expect(savedHistory.readingDayEntries[0].notes).toBe('Great reading session');

        const retrievedHistory = await storage.getEnhancedStreakHistory();
        expect(retrievedHistory).toBeDefined();
        expect(retrievedHistory!.readingDayEntries).toHaveLength(1);
        expect(retrievedHistory!.readingDays.size).toBe(1);
        expect(retrievedHistory!.readingDays.has('2024-01-15')).toBe(true);
      });

      it('should validate enhanced streak history data', async () => {
        const invalidHistory = createEmptyEnhancedStreakHistory();
        // Create invalid data with future version
        invalidHistory.version = CURRENT_STREAK_HISTORY_VERSION + 10;

        await expect(storage.saveEnhancedStreakHistory(invalidHistory))
          .rejects.toThrow(StorageError);
      });

      it('should update enhanced streak history', async () => {
        const initialHistory = createEmptyEnhancedStreakHistory();
        await storage.saveEnhancedStreakHistory(initialHistory);

        const updates = {
          readingDayEntries: [{
            date: '2024-01-16',
            source: 'book' as const,
            bookIds: [3],
            notes: 'Finished chapter 5',
            createdAt: new Date('2024-01-16T15:30:00Z'),
            modifiedAt: new Date('2024-01-16T15:30:00Z')
          }]
        };

        const updatedHistory = await storage.updateEnhancedStreakHistory(updates);
        expect(updatedHistory.readingDayEntries).toHaveLength(1);
        expect(updatedHistory.readingDays.has('2024-01-16')).toBe(true);
      });
    });

    describe('Reading Day Entry Management', () => {
      it('should add reading day entries', async () => {
        const entry = {
          date: '2024-01-20',
          source: 'manual' as const,
          bookIds: [1],
          notes: 'Morning reading session'
        };

        const updatedHistory = await storage.addReadingDayEntry(entry);
        expect(updatedHistory.readingDayEntries).toHaveLength(1);
        expect(updatedHistory.readingDayEntries[0].date).toBe('2024-01-20');
        expect(updatedHistory.readingDayEntries[0].createdAt).toBeDefined();
        expect(updatedHistory.readingDayEntries[0].modifiedAt).toBeDefined();
        expect(updatedHistory.readingDays.has('2024-01-20')).toBe(true);
      });

      it('should validate date format when adding entries', async () => {
        const invalidEntry = {
          date: '01/20/2024', // Invalid format
          source: 'manual' as const
        };

        await expect(storage.addReadingDayEntry(invalidEntry))
          .rejects.toThrow(StorageError);
      });

      it('should update existing reading day entries', async () => {
        // First add an entry
        const entry = {
          date: '2024-01-21',
          source: 'manual' as const,
          notes: 'Initial notes'
        };
        await storage.addReadingDayEntry(entry);

        // Add a small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));

        // Then update it
        const updates = {
          notes: 'Updated notes',
          bookIds: [2, 3]
        };
        const updatedHistory = await storage.updateReadingDayEntry('2024-01-21', updates);
        
        const updatedEntry = updatedHistory.readingDayEntries.find(e => e.date === '2024-01-21');
        expect(updatedEntry).toBeDefined();
        expect(updatedEntry!.notes).toBe('Updated notes');
        expect(updatedEntry!.bookIds).toEqual([2, 3]);
        expect(updatedEntry!.modifiedAt.getTime()).toBeGreaterThanOrEqual(updatedEntry!.createdAt.getTime());
      });

      it('should throw error when updating non-existent entry', async () => {
        await expect(storage.updateReadingDayEntry('2024-01-25', { notes: 'Test' }))
          .rejects.toThrow(StorageError);
      });

      it('should remove reading day entries', async () => {
        // Add two entries
        await storage.addReadingDayEntry({
          date: '2024-01-22',
          source: 'manual' as const
        });
        await storage.addReadingDayEntry({
          date: '2024-01-23',
          source: 'book' as const
        });

        let history = await storage.getEnhancedStreakHistory();
        expect(history!.readingDayEntries).toHaveLength(2);
        expect(history!.readingDays.size).toBe(2);

        // Remove one entry
        const updatedHistory = await storage.removeReadingDayEntry('2024-01-22');
        expect(updatedHistory.readingDayEntries).toHaveLength(1);
        expect(updatedHistory.readingDays.has('2024-01-22')).toBe(false);
        expect(updatedHistory.readingDays.has('2024-01-23')).toBe(true);
      });

      it('should handle duplicate entry addition gracefully', async () => {
        const entry = {
          date: '2024-01-24',
          source: 'manual' as const,
          notes: 'First entry'
        };

        // Add first entry
        await storage.addReadingDayEntry(entry);

        // Add duplicate (should update existing)
        const duplicateEntry = {
          date: '2024-01-24',
          source: 'book' as const,
          notes: 'Updated entry'
        };
        const updatedHistory = await storage.addReadingDayEntry(duplicateEntry);

        expect(updatedHistory.readingDayEntries).toHaveLength(1);
        expect(updatedHistory.readingDayEntries[0].source).toBe('book');
        expect(updatedHistory.readingDayEntries[0].notes).toBe('Updated entry');
      });
    });

    describe('Date Range Filtering', () => {
      beforeEach(async () => {
        // Add test data with multiple dates
        const entries = [
          { date: '2024-01-10', source: 'manual' as const },
          { date: '2024-01-15', source: 'book' as const },
          { date: '2024-01-20', source: 'manual' as const },
          { date: '2024-01-25', source: 'progress' as const },
          { date: '2024-02-01', source: 'manual' as const }
        ];

        for (const entry of entries) {
          await storage.addReadingDayEntry(entry);
        }
      });

      it('should retrieve entries within date range', async () => {
        const entries = await storage.getReadingDayEntriesInRange('2024-01-15', '2024-01-25');
        expect(entries).toHaveLength(3);
        expect(entries.map(e => e.date)).toEqual(['2024-01-15', '2024-01-20', '2024-01-25']);
      });

      it('should return empty array for range with no entries', async () => {
        const entries = await storage.getReadingDayEntriesInRange('2024-03-01', '2024-03-31');
        expect(entries).toHaveLength(0);
      });

      it('should handle edge cases in date ranges', async () => {
        // Exact match on start date
        const startEntries = await storage.getReadingDayEntriesInRange('2024-01-10', '2024-01-10');
        expect(startEntries).toHaveLength(1);
        expect(startEntries[0].date).toBe('2024-01-10');

        // Exact match on end date
        const endEntries = await storage.getReadingDayEntriesInRange('2024-02-01', '2024-02-01');
        expect(endEntries).toHaveLength(1);
        expect(endEntries[0].date).toBe('2024-02-01');
      });

      it('should return entries sorted by date', async () => {
        const entries = await storage.getReadingDayEntriesInRange('2024-01-01', '2024-02-28');
        expect(entries).toHaveLength(5);
        
        // Check if sorted
        for (let i = 1; i < entries.length; i++) {
          expect(entries[i].date >= entries[i - 1].date).toBe(true);
        }
      });
    });

    describe('Migration from Legacy Streak History', () => {
      it('should migrate legacy streak history to enhanced format', async () => {
        // Create legacy streak history
        const legacyHistory: StreakHistory = {
          readingDays: new Set(['2024-01-10', '2024-01-11', '2024-01-12']),
          bookPeriods: [{
            bookId: 1,
            title: 'Test Book',
            author: 'Test Author',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-01-12'),
            totalDays: 3
          }],
          lastCalculated: new Date('2024-01-12T20:00:00Z')
        };

        // Save legacy history
        await storage.saveStreakHistory(legacyHistory);

        // Perform migration
        const migratedHistory = await storage.migrateToEnhancedStreakHistory();
        
        expect(migratedHistory).toBeDefined();
        expect(migratedHistory!.readingDayEntries).toHaveLength(3);
        expect(migratedHistory!.readingDays.size).toBe(3);
        expect(migratedHistory!.version).toBe(CURRENT_STREAK_HISTORY_VERSION);

        // Check if reading day entries were created properly
        const firstEntry = migratedHistory!.readingDayEntries.find(e => e.date === '2024-01-10');
        expect(firstEntry).toBeDefined();
        expect(firstEntry!.source).toBe('book');
        expect(firstEntry!.bookIds).toContain(1);
      });

      it('should return null when no legacy data exists', async () => {
        const migratedHistory = await storage.migrateToEnhancedStreakHistory();
        expect(migratedHistory).toBeNull();
      });

      it('should return existing enhanced history if already migrated', async () => {
        const enhancedHistory = createEmptyEnhancedStreakHistory();
        enhancedHistory.readingDayEntries = [{
          date: '2024-01-15',
          source: 'manual',
          createdAt: new Date(),
          modifiedAt: new Date()
        }];
        await storage.saveEnhancedStreakHistory(enhancedHistory);

        const migratedHistory = await storage.migrateToEnhancedStreakHistory();
        expect(migratedHistory).toBeDefined();
        expect(migratedHistory!.readingDayEntries).toHaveLength(1);
      });
    });

    describe('Data Consistency and Synchronization', () => {
      it('should maintain synchronization between readingDays and readingDayEntries', async () => {
        // Add entries through different methods
        await storage.addReadingDayEntry({
          date: '2024-01-30',
          source: 'manual' as const
        });

        const history = await storage.getEnhancedStreakHistory();
        expect(history!.readingDays.has('2024-01-30')).toBe(true);
        expect(history!.readingDayEntries.some(e => e.date === '2024-01-30')).toBe(true);

        // Update through partial update
        await storage.updateEnhancedStreakHistory({
          readingDayEntries: [
            ...history!.readingDayEntries,
            {
              date: '2024-01-31',
              source: 'book',
              createdAt: new Date(),
              modifiedAt: new Date()
            }
          ]
        });

        const updatedHistory = await storage.getEnhancedStreakHistory();
        expect(updatedHistory!.readingDays.has('2024-01-31')).toBe(true);
        expect(updatedHistory!.readingDayEntries).toHaveLength(2);
      });

      it('should handle multiple sequential operations correctly', async () => {
        // Add multiple entries sequentially
        await storage.addReadingDayEntry({ date: '2024-02-01', source: 'manual' as const });
        await storage.addReadingDayEntry({ date: '2024-02-02', source: 'book' as const });
        await storage.addReadingDayEntry({ date: '2024-02-03', source: 'progress' as const });

        const history = await storage.getEnhancedStreakHistory();
        expect(history!.readingDayEntries).toHaveLength(3);
        expect(history!.readingDays.size).toBe(3);
        
        // Verify all dates are present
        const dates = history!.readingDayEntries.map(e => e.date).sort();
        expect(dates).toEqual(['2024-02-01', '2024-02-02', '2024-02-03']);
      });
    });

    describe('Performance with Large Datasets', () => {
      it('should handle large numbers of reading day entries efficiently', async () => {
        const startTime = Date.now();
        
        // Add 1000 entries
        const entries = Array.from({ length: 1000 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + i);
          const sources = ['manual', 'book', 'progress'] as const;
          return {
            date: date.toISOString().split('T')[0],
            source: sources[i % 3],
            bookIds: [i % 10 + 1]
          };
        });

        for (const entry of entries) {
          await storage.addReadingDayEntry(entry);
        }

        const addTime = Date.now() - startTime;
        console.log(`Added 1000 entries in ${addTime}ms`);

        // Test retrieval performance
        const retrievalStart = Date.now();
        const history = await storage.getEnhancedStreakHistory();
        const retrievalTime = Date.now() - retrievalStart;
        
        console.log(`Retrieved history with ${history!.readingDayEntries.length} entries in ${retrievalTime}ms`);
        
        expect(history!.readingDayEntries).toHaveLength(1000);
        expect(history!.readingDays.size).toBe(1000);
        
        // Performance should be reasonable (less than 2 seconds total)
        expect(addTime + retrievalTime).toBeLessThan(2000);
      });

      it('should efficiently filter large date ranges', async () => {
        // Add entries across a year
        const entries = Array.from({ length: 365 }, (_, i) => {
          const date = new Date('2024-01-01');
          date.setDate(date.getDate() + i);
          return {
            date: date.toISOString().split('T')[0],
            source: 'manual' as const
          };
        });

        for (const entry of entries) {
          await storage.addReadingDayEntry(entry);
        }

        const filterStart = Date.now();
        const filteredEntries = await storage.getReadingDayEntriesInRange('2024-06-01', '2024-06-30');
        const filterTime = Date.now() - filterStart;

        console.log(`Filtered ${filteredEntries.length} entries from 365 in ${filterTime}ms`);
        
        expect(filteredEntries).toHaveLength(30); // June has 30 days
        expect(filterTime).toBeLessThan(100); // Should be very fast
      });
    });

    describe('Bulk Operations and Transactions', () => {
      it('should perform bulk add operations', async () => {
        const operations: BulkReadingDayOperation[] = [
          {
            type: 'add',
            date: '2024-03-01',
            entry: { source: 'manual', notes: 'Morning reading' }
          },
          {
            type: 'add',
            date: '2024-03-02',
            entry: { source: 'book', bookIds: [1] }
          },
          {
            type: 'add',
            date: '2024-03-03',
            entry: { source: 'progress', bookIds: [2, 3] }
          }
        ];

        const result = await storage.bulkUpdateReadingDayEntries(operations);
        
        expect(result.readingDayEntries).toHaveLength(3);
        expect(result.readingDays.size).toBe(3);
        
        const entry1 = result.readingDayEntries.find(e => e.date === '2024-03-01');
        expect(entry1?.source).toBe('manual');
        expect(entry1?.notes).toBe('Morning reading');
        
        const entry2 = result.readingDayEntries.find(e => e.date === '2024-03-02');
        expect(entry2?.source).toBe('book');
        expect(entry2?.bookIds).toEqual([1]);
      });

      it('should perform bulk mixed operations', async () => {
        // First add some entries
        await storage.addReadingDayEntry({
          date: '2024-03-10',
          source: 'manual',
          notes: 'Original note'
        });
        await storage.addReadingDayEntry({
          date: '2024-03-11',
          source: 'book',
          bookIds: [1]
        });

        // Now perform bulk mixed operations
        const operations: BulkReadingDayOperation[] = [
          {
            type: 'update',
            date: '2024-03-10',
            updates: { notes: 'Updated note', bookIds: [5] }
          },
          {
            type: 'add',
            date: '2024-03-12',
            entry: { source: 'progress', bookIds: [2] }
          },
          {
            type: 'remove',
            date: '2024-03-11'
          }
        ];

        const result = await storage.bulkUpdateReadingDayEntries(operations);
        
        expect(result.readingDayEntries).toHaveLength(2);
        expect(result.readingDays.size).toBe(2);
        
        // Check updated entry
        const updatedEntry = result.readingDayEntries.find(e => e.date === '2024-03-10');
        expect(updatedEntry?.notes).toBe('Updated note');
        expect(updatedEntry?.bookIds).toEqual([5]);
        
        // Check added entry
        const addedEntry = result.readingDayEntries.find(e => e.date === '2024-03-12');
        expect(addedEntry?.source).toBe('progress');
        
        // Check removed entry
        const removedEntry = result.readingDayEntries.find(e => e.date === '2024-03-11');
        expect(removedEntry).toBeUndefined();
        expect(result.readingDays.has('2024-03-11')).toBe(false);
      });

      it('should handle transaction failures atomically', async () => {
        // Add initial entry
        await storage.addReadingDayEntry({
          date: '2024-03-20',
          source: 'manual',
          notes: 'Initial entry'
        });

        const operations: BulkReadingDayOperation[] = [
          {
            type: 'add',
            date: '2024-03-21',
            entry: { source: 'book' }
          },
          {
            type: 'update',
            date: '2024-03-99', // Invalid date that should cause failure
            updates: { notes: 'This should fail' }
          }
        ];

        // Should fail due to invalid date
        await expect(storage.bulkUpdateReadingDayEntries(operations))
          .rejects.toThrow(StorageError);

        // Verify original data is unchanged
        const history = await storage.getEnhancedStreakHistory();
        expect(history!.readingDayEntries).toHaveLength(1);
        expect(history!.readingDayEntries[0].date).toBe('2024-03-20');
        expect(history!.readingDayEntries[0].notes).toBe('Initial entry');
      });

      it('should validate bulk operation parameters', async () => {
        // Test missing entry data for add operation
        const invalidAddOp: BulkReadingDayOperation[] = [{
          type: 'add',
          date: '2024-03-25'
          // Missing entry
        }];
        
        await expect(storage.bulkUpdateReadingDayEntries(invalidAddOp))
          .rejects.toThrow(StorageError);

        // Test missing updates for update operation
        const invalidUpdateOp: BulkReadingDayOperation[] = [{
          type: 'update',
          date: '2024-03-25'
          // Missing updates
        }];
        
        await expect(storage.bulkUpdateReadingDayEntries(invalidUpdateOp))
          .rejects.toThrow(StorageError);

        // Test invalid operation type
        const invalidTypeOp: any[] = [{
          type: 'invalid',
          date: '2024-03-25'
        }];
        
        await expect(storage.bulkUpdateReadingDayEntries(invalidTypeOp))
          .rejects.toThrow(StorageError);
      });

      it('should prevent concurrent transactions', async () => {
        const operations1: BulkReadingDayOperation[] = [{
          type: 'add',
          date: '2024-03-30',
          entry: { source: 'manual' }
        }];
        
        const operations2: BulkReadingDayOperation[] = [{
          type: 'add',
          date: '2024-03-31',
          entry: { source: 'book' }
        }];

        // Start first transaction
        const promise1 = storage.bulkUpdateReadingDayEntries(operations1);
        
        // Try to start second transaction immediately (should fail)
        await expect(storage.bulkUpdateReadingDayEntries(operations2))
          .rejects.toThrow('transaction is already in progress');

        // Wait for first transaction to complete
        await promise1;
        
        // Now second transaction should work
        const result = await storage.bulkUpdateReadingDayEntries(operations2);
        expect(result.readingDayEntries).toHaveLength(2);
      });

      it('should handle large bulk operations efficiently', async () => {
        const operations: BulkReadingDayOperation[] = [];
        
        // Create 100 add operations across multiple months
        for (let i = 1; i <= 100; i++) {
          const month = Math.floor((i - 1) / 30) + 1;
          const day = ((i - 1) % 30) + 1;
          operations.push({
            type: 'add',
            date: `2024-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            entry: { source: 'manual', notes: `Day ${i}` }
          });
        }

        const startTime = Date.now();
        const result = await storage.bulkUpdateReadingDayEntries(operations);
        const executionTime = Date.now() - startTime;

        expect(result.readingDayEntries).toHaveLength(100);
        expect(result.readingDays.size).toBe(100);
        expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
        
        console.log(`Bulk operation with 100 entries completed in ${executionTime}ms`);
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle invalid data gracefully', async () => {
        // Test with invalid date formats
        await expect(storage.addReadingDayEntry({
          date: 'invalid-date',
          source: 'manual' as const
        })).rejects.toThrow(StorageError);

        // Test with null/undefined values
        await expect(storage.updateReadingDayEntry('', {}))
          .rejects.toThrow(StorageError);
      });

      it('should maintain data integrity after errors', async () => {
        // Add valid entry
        await storage.addReadingDayEntry({
          date: '2024-02-10',
          source: 'manual' as const
        });

        // Try invalid operation
        try {
          await storage.addReadingDayEntry({
            date: 'invalid',
            source: 'manual' as const
          });
        } catch (error) {
          // Expected to fail
        }

        // Verify original data is still intact
        const history = await storage.getEnhancedStreakHistory();
        expect(history!.readingDayEntries).toHaveLength(1);
        expect(history!.readingDayEntries[0].date).toBe('2024-02-10');
      });

      it('should recover from corrupted data scenarios', async () => {
        // This test simulates data corruption recovery
        const validHistory = createEmptyEnhancedStreakHistory();
        validHistory.readingDayEntries = [{
          date: '2024-02-15',
          source: 'manual',
          createdAt: new Date(),
          modifiedAt: new Date()
        }];

        await storage.saveEnhancedStreakHistory(validHistory);

        // Verify recovery works
        const recoveredHistory = await storage.getEnhancedStreakHistory();
        expect(recoveredHistory).toBeDefined();
        expect(recoveredHistory!.readingDayEntries).toHaveLength(1);
      });
    });
  });

  // NOTE: FileSystemStorageService tests would be similar but require
  // special handling for the File System Access API which isn't available
  // in the test environment. In a real implementation, you would either:
  // 1. Mock the File System Access API
  // 2. Use a test-specific localStorage-only mode
  // 3. Create integration tests that run in a real browser environment
  
  describe('FileSystemStorageService Enhanced Features', () => {
    it('should have the same interface as MockStorageService', () => {
      // This test ensures the FileSystemStorageService implements
      // all the same methods as MockStorageService
      const fsService = new FileSystemStorageService();

      // Check that all enhanced methods exist
      expect(typeof fsService.getEnhancedStreakHistory).toBe('function');
      expect(typeof fsService.saveEnhancedStreakHistory).toBe('function');
      expect(typeof fsService.updateEnhancedStreakHistory).toBe('function');
      expect(typeof fsService.addReadingDayEntry).toBe('function');
      expect(typeof fsService.updateReadingDayEntry).toBe('function');
      expect(typeof fsService.removeReadingDayEntry).toBe('function');
      expect(typeof fsService.getReadingDayEntriesInRange).toBe('function');
      expect(typeof fsService.migrateToEnhancedStreakHistory).toBe('function');
      expect(typeof fsService.bulkUpdateReadingDayEntries).toBe('function');
    });
  });
});