import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataMigrationService, MigrationStatus, LegacyStreakHistory } from '../DataMigrationService';
import { MockStorageService } from '../storage/MockStorageService';
import { Book } from '@/types';

describe('DataMigrationService', () => {
  let mockStorage: MockStorageService;
  let migrationService: DataMigrationService;
  let localStorageMock: { [key: string]: string };

  beforeEach(async () => {
    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      key: vi.fn(),
      length: 0
    };

    // Create mock storage and migration service
    mockStorage = new MockStorageService();
    await mockStorage.initialize();
    migrationService = new DataMigrationService(mockStorage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectLocalData', () => {
    it('should detect books in localStorage', async () => {
      const testBooks: Book[] = [
        {
          id: 1,
          title: 'Test Book',
          author: 'Test Author',
          status: 'want_to_read',
          progress: 0,
          dateAdded: new Date(),
          dateModified: new Date(),
          tags: []
        }
      ];

      localStorageMock['puka_books'] = JSON.stringify(testBooks);

      const result = await migrationService.detectLocalData();

      expect(result).not.toBeNull();
      expect(result?.books).toHaveLength(1);
      expect(result?.books?.[0].title).toBe('Test Book');
    });

    it('should detect streak history in localStorage', async () => {
      const testStreakHistory: LegacyStreakHistory = {
        currentStreak: 5,
        longestStreak: 10,
        lastReadDate: '2024-01-01',
        readingDays: ['2024-01-01', '2024-01-02'],
        totalDaysRead: 15
      };

      localStorageMock['puka_streak_history'] = JSON.stringify(testStreakHistory);

      const result = await migrationService.detectLocalData();

      expect(result).not.toBeNull();
      expect(result?.streakHistory).toEqual(testStreakHistory);
    });

    it('should detect settings in localStorage', async () => {
      const testSettings = {
        theme: 'dark',
        dailyReadingGoal: 30
      };

      localStorageMock['puka_settings'] = JSON.stringify(testSettings);

      const result = await migrationService.detectLocalData();

      expect(result).not.toBeNull();
      expect(result?.settings).toEqual(testSettings);
    });

    it('should return null when no data is found', async () => {
      const result = await migrationService.detectLocalData();
      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      localStorageMock['puka_books'] = 'invalid json';

      const result = await migrationService.detectLocalData();

      expect(result).toBeNull();
    });
  });

  describe('validateData', () => {
    it('should validate and sanitize book data', async () => {
      const invalidBooks = [
        {
          title: 'Valid Book',
          author: 'Valid Author',
          progress: '50', // Should be converted to number
          tags: null // Should be converted to array
        },
        {
          // Missing required fields - should be filtered out
          author: 'Author Only'
        }
      ];

      const result = await migrationService.validateData({
        books: invalidBooks as any
      });

      expect(result.books).toHaveLength(1);
      expect(result.books?.[0].progress).toBe(0); // Default value for invalid number
      expect(Array.isArray(result.books?.[0].tags)).toBe(true);
      expect(result.books?.[0].tags).toHaveLength(0);
    });

    it('should validate streak history', async () => {
      const invalidStreakHistory = {
        currentStreak: '5', // Should be converted to number
        // Missing other fields
      };

      const result = await migrationService.validateData({
        streakHistory: invalidStreakHistory as any
      });

      expect(result.streakHistory?.currentStreak).toBe(0);
      expect(result.streakHistory?.readingDays).toEqual([]);
    });
  });

  describe('migrate', () => {
    beforeEach(async () => {
      await mockStorage.initialize();
    });

    it('should migrate books successfully', async () => {
      const testBooks: Book[] = [
        {
          id: 1,
          title: 'Book 1',
          author: 'Author 1',
          status: 'finished',
          progress: 100,
          dateAdded: new Date(),
          dateModified: new Date(),
          tags: ['fiction']
        },
        {
          id: 2,
          title: 'Book 2',
          author: 'Author 2',
          status: 'currently_reading',
          progress: 50,
          dateAdded: new Date(),
          dateModified: new Date(),
          tags: []
        }
      ];

      const result = await migrationService.migrate({
        books: testBooks
      });

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.migratedBooks).toHaveLength(2);

      // Verify books were added to storage
      const storedBooks = await mockStorage.getBooks();
      expect(storedBooks).toHaveLength(2);
    });

    it('should migrate streak history', async () => {
      const testStreakHistory: LegacyStreakHistory = {
        currentStreak: 3,
        longestStreak: 7,
        lastReadDate: '2024-01-01',
        readingDays: ['2024-01-01', '2023-12-31', '2023-12-30'],
        totalDaysRead: 10
      };

      const result = await migrationService.migrate({
        streakHistory: testStreakHistory
      });

      expect(result.migratedStreakHistory).not.toBeNull();
      expect(result.migratedStreakHistory?.readingDays.size).toBe(3);
      expect(result.migratedStreakHistory?.lastCalculated).toBeDefined();
    });

    it('should create backup before migration', async () => {
      const testData = {
        books: [{
          id: 1,
          title: 'Test Book',
          author: 'Test Author',
          status: 'want_to_read' as const,
          progress: 0,
          dateAdded: new Date(),
          dateModified: new Date(),
          tags: []
        }]
      };

      await migrationService.migrate(testData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'puka_migration_backup',
        expect.stringContaining('Test Book')
      );
    });

    it('should clear localStorage after successful migration if requested', async () => {
      localStorageMock['puka_books'] = JSON.stringify([{ title: 'Book' }]);
      localStorageMock['puka_streak_history'] = JSON.stringify({ currentStreak: 1 });

      const testData = {
        books: [{
          id: 1,
          title: 'Test Book',
          author: 'Test Author',
          status: 'finished' as const,
          progress: 100,
          dateAdded: new Date(),
          dateModified: new Date(),
          tags: []
        }]
      };

      await migrationService.migrate(testData, {
        clearLocalStorageAfter: true,
        validateData: true,
        skipInvalid: true
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('puka_books');
      expect(localStorage.removeItem).toHaveBeenCalledWith('puka_streak_history');
    });
  });

  describe('status tracking', () => {
    it('should track migration progress', async () => {
      const statusUpdates: MigrationStatus[] = [];
      
      migrationService.onStatusChange(status => {
        statusUpdates.push({ ...status });
      });

      const testBooks = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        author: `Author ${i + 1}`,
        status: 'want_to_read' as const,
        progress: 0,
        dateAdded: new Date(),
        dateModified: new Date(),
        tags: []
      }));

      await mockStorage.initialize();
      await migrationService.migrate({ books: testBooks });

      // Should have multiple status updates
      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates.some(s => s.phase === 'migrating')).toBe(true);
      expect(statusUpdates.some(s => s.phase === 'complete')).toBe(true);
      expect(statusUpdates[statusUpdates.length - 1].progress).toBe(100);
    });
  });

  describe('rollback', () => {
    it('should restore data from backup', async () => {
      const backupData = {
        timestamp: new Date().toISOString(),
        books: [{ title: 'Backed Up Book' }],
        streakHistory: { currentStreak: 5 }
      };

      localStorageMock['puka_migration_backup'] = JSON.stringify(backupData);

      const success = await migrationService.rollback();

      expect(success).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'puka_books',
        JSON.stringify(backupData.books)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'puka_streak_history',
        JSON.stringify(backupData.streakHistory)
      );
    });

    it('should return false when no backup exists', async () => {
      const success = await migrationService.rollback();
      expect(success).toBe(false);
    });
  });

  describe('migration status persistence', () => {
    it('should save migration status', () => {
      migrationService.setMigrationStatus('completed');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'puka_migration_status',
        expect.stringContaining('"status":"completed"')
      );
    });

    it('should retrieve migration status', () => {
      const status = { status: 'completed', timestamp: new Date().toISOString() };
      localStorageMock['puka_migration_status'] = JSON.stringify(status);

      const result = migrationService.getMigrationStatus();

      expect(result).toBe(JSON.stringify(status));
    });
  });
});