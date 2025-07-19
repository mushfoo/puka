import { test, expect, Page } from '@playwright/test';

/**
 * Phase 4: DatabaseStorageService Integration Testing
 * 
 * Tests all DatabaseStorageService interface methods to ensure:
 * - All 20+ StorageService methods work correctly
 * - Data mapping accuracy between frontend and database
 * - Error handling and recovery mechanisms
 * - Concurrent operations safety
 * - Integration with authentication system
 */

// Test user credentials
const TEST_USER = {
  email: 'dbservice@example.com',
  password: 'testpassword123',
  name: 'DB Service Test User'
};

// Helper to authenticate and set up storage service
async function setupStorageService(page: Page) {
  await page.goto('/');
  
  // Trigger authentication
  const signInButton = page.locator('button:has-text("Sign In")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
  }

  // Ensure we're using DatabaseStorageService
  const storageServiceType = await page.evaluate(() => {
    return window.localStorage.getItem('storage_service_type');
  });
  
  console.log('Storage service type:', storageServiceType);
}

// Helper to access storage service in browser context
async function callStorageMethod(page: Page, methodName: string, ...args: any[]) {
  return await page.evaluate(async ({ methodName, args }) => {
    // Get the storage service from the app context
    const { createStorageService } = await import('/src/services/storage/index.ts');
    const storageService = await createStorageService();
    
    try {
      const result = await (storageService as any)[methodName](...args);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }, { methodName, args });
}

test.describe('DatabaseStorageService - Core CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupStorageService(page);
  });

  test('should implement all required StorageService interface methods', async ({ page }) => {
    const requiredMethods = [
      'initialize',
      'getBooks',
      'getBook',
      'saveBook',
      'updateBook',
      'deleteBook',
      'getSettings',
      'updateSettings',
      'exportData',
      'importData',
      'searchBooks',
      'getFilteredBooks',
      'createBackup',
      'restoreBackup',
      'getStreakHistory',
      'saveStreakHistory',
      'updateStreakHistory',
      'clearStreakHistory',
      'markReadingDay',
      'getEnhancedStreakHistory',
      'saveEnhancedStreakHistory',
      'updateEnhancedStreakHistory',
      'addReadingDayEntry',
      'updateReadingDayEntry',
      'removeReadingDayEntry',
      'getReadingDayEntriesInRange',
      'migrateToEnhancedStreakHistory',
      'bulkUpdateReadingDayEntries'
    ];

    // Check that all methods are available
    const availableMethods = await page.evaluate(async () => {
      const { createStorageService } = await import('/src/services/storage/index.ts');
      const storageService = await createStorageService();
      return Object.getOwnPropertyNames(Object.getPrototypeOf(storageService))
        .filter(name => typeof (storageService as any)[name] === 'function');
    });

    for (const method of requiredMethods) {
      expect(availableMethods).toContain(method);
    }
  });

  test('should handle book CRUD operations correctly', async ({ page }) => {
    const testBook = {
      title: 'Integration Test Book',
      author: 'Integration Test Author',
      progress: 25,
      status: 'reading',
      notes: 'Test notes for integration',
      genre: 'Fiction',
      totalPages: 300,
      currentPage: 75
    };

    // CREATE - Save a new book
    const saveResult = await callStorageMethod(page, 'saveBook', testBook);
    expect(saveResult.success).toBe(true);
    expect(saveResult.data).toHaveProperty('id');
    expect(saveResult.data.title).toBe(testBook.title);

    const bookId = saveResult.data.id;

    // READ - Get the saved book
    const getResult = await callStorageMethod(page, 'getBook', bookId);
    expect(getResult.success).toBe(true);
    expect(getResult.data.id).toBe(bookId);
    expect(getResult.data.title).toBe(testBook.title);
    expect(getResult.data.author).toBe(testBook.author);

    // UPDATE - Modify the book
    const updates = {
      progress: 50,
      currentPage: 150,
      notes: 'Updated notes'
    };

    const updateResult = await callStorageMethod(page, 'updateBook', bookId, updates);
    expect(updateResult.success).toBe(true);
    expect(updateResult.data.progress).toBe(updates.progress);
    expect(updateResult.data.currentPage).toBe(updates.currentPage);
    expect(updateResult.data.notes).toBe(updates.notes);

    // LIST - Get all books
    const listResult = await callStorageMethod(page, 'getBooks');
    expect(listResult.success).toBe(true);
    expect(Array.isArray(listResult.data)).toBe(true);
    expect(listResult.data.some((book: any) => book.id === bookId)).toBe(true);

    // DELETE - Remove the book
    const deleteResult = await callStorageMethod(page, 'deleteBook', bookId);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data).toBe(true);

    // VERIFY DELETION
    const verifyResult = await callStorageMethod(page, 'getBook', bookId);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data).toBeNull();
  });

  test('should handle search and filtering operations', async ({ page }) => {
    // Create test books
    const testBooks = [
      { title: 'JavaScript Guide', author: 'Tech Author', genre: 'Technology', status: 'reading' },
      { title: 'Python Cookbook', author: 'Tech Author', genre: 'Technology', status: 'completed' },
      { title: 'Fantasy Novel', author: 'Fiction Writer', genre: 'Fantasy', status: 'unread' }
    ];

    // Save test books
    const savedBooks = [];
    for (const book of testBooks) {
      const result = await callStorageMethod(page, 'saveBook', book);
      expect(result.success).toBe(true);
      savedBooks.push(result.data);
    }

    // Test search functionality
    const searchResult = await callStorageMethod(page, 'searchBooks', 'JavaScript');
    expect(searchResult.success).toBe(true);
    expect(searchResult.data.some((book: any) => book.title.includes('JavaScript'))).toBe(true);

    // Test filtering by status
    const filterResult = await callStorageMethod(page, 'getFilteredBooks', { status: 'reading' });
    expect(filterResult.success).toBe(true);
    expect(filterResult.data.every((book: any) => book.status === 'reading')).toBe(true);

    // Test filtering by genre
    const genreFilterResult = await callStorageMethod(page, 'getFilteredBooks', { 
      search: 'Technology' 
    });
    expect(genreFilterResult.success).toBe(true);

    // Cleanup
    for (const book of savedBooks) {
      await callStorageMethod(page, 'deleteBook', book.id);
    }
  });
});

test.describe('DatabaseStorageService - Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupStorageService(page);
  });

  test('should manage user settings correctly', async ({ page }) => {
    // Get initial settings
    const getResult = await callStorageMethod(page, 'getSettings');
    expect(getResult.success).toBe(true);

    const newSettings = {
      theme: 'dark',
      dailyReadingGoal: 45,
      defaultView: 'list',
      sortBy: 'author',
      sortOrder: 'desc',
      notificationsEnabled: false,
      autoBackup: true,
      backupFrequency: 'daily'
    };

    // Update settings
    const updateResult = await callStorageMethod(page, 'updateSettings', newSettings);
    expect(updateResult.success).toBe(true);
    expect(updateResult.data.theme).toBe(newSettings.theme);
    expect(updateResult.data.dailyReadingGoal).toBe(newSettings.dailyReadingGoal);

    // Verify settings were saved
    const verifyResult = await callStorageMethod(page, 'getSettings');
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data.theme).toBe(newSettings.theme);
    expect(verifyResult.data.defaultView).toBe(newSettings.defaultView);
  });
});

test.describe('DatabaseStorageService - Streak Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupStorageService(page);
  });

  test('should manage basic streak history', async ({ page }) => {
    const streakData = {
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
      lastCalculated: new Date()
    };

    // Save streak history
    const saveResult = await callStorageMethod(page, 'saveStreakHistory', {
      ...streakData,
      readingDays: Array.from(streakData.readingDays) // Convert Set to Array for serialization
    });
    expect(saveResult.success).toBe(true);

    // Get streak history
    const getResult = await callStorageMethod(page, 'getStreakHistory');
    expect(getResult.success).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.bookPeriods).toHaveLength(1);

    // Update streak history
    const updateResult = await callStorageMethod(page, 'updateStreakHistory', {
      readingDays: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']
    });
    expect(updateResult.success).toBe(true);

    // Mark reading day
    const markResult = await callStorageMethod(page, 'markReadingDay');
    expect(markResult.success).toBe(true);

    // Clear streak history
    const clearResult = await callStorageMethod(page, 'clearStreakHistory');
    expect(clearResult.success).toBe(true);
  });

  test('should manage enhanced streak history', async ({ page }) => {
    const enhancedStreakData = {
      readingDayEntries: [
        {
          date: '2024-01-01',
          source: 'book',
          bookIds: [1],
          notes: 'Great reading session',
          createdAt: new Date(),
          modifiedAt: new Date()
        },
        {
          date: '2024-01-02',
          source: 'manual',
          bookIds: [],
          notes: 'Quick reading',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ],
      readingDays: new Set(['2024-01-01', '2024-01-02']),
      bookPeriods: [],
      lastCalculated: new Date(),
      lastSyncDate: new Date(),
      version: 1
    };

    // Save enhanced streak history
    const saveResult = await callStorageMethod(page, 'saveEnhancedStreakHistory', {
      ...enhancedStreakData,
      readingDays: Array.from(enhancedStreakData.readingDays)
    });
    expect(saveResult.success).toBe(true);

    // Get enhanced streak history
    const getResult = await callStorageMethod(page, 'getEnhancedStreakHistory');
    expect(getResult.success).toBe(true);
    expect(getResult.data.readingDayEntries).toHaveLength(2);

    // Add reading day entry
    const newEntry = {
      date: '2024-01-03',
      source: 'progress',
      bookIds: [1, 2],
      notes: 'Made good progress'
    };

    const addResult = await callStorageMethod(page, 'addReadingDayEntry', newEntry);
    expect(addResult.success).toBe(true);

    // Update reading day entry
    const updateResult = await callStorageMethod(page, 'updateReadingDayEntry', '2024-01-03', {
      notes: 'Updated notes'
    });
    expect(updateResult.success).toBe(true);

    // Get reading day entries in range
    const rangeResult = await callStorageMethod(page, 'getReadingDayEntriesInRange', '2024-01-01', '2024-01-03');
    expect(rangeResult.success).toBe(true);
    expect(rangeResult.data.length).toBeGreaterThanOrEqual(1);

    // Remove reading day entry
    const removeResult = await callStorageMethod(page, 'removeReadingDayEntry', '2024-01-03');
    expect(removeResult.success).toBe(true);
  });

  test('should handle bulk operations on reading day entries', async ({ page }) => {
    // Setup initial enhanced streak history
    const initialData = {
      readingDayEntries: [],
      readingDays: [],
      bookPeriods: [],
      lastCalculated: new Date(),
      lastSyncDate: new Date(),
      version: 1
    };

    await callStorageMethod(page, 'saveEnhancedStreakHistory', initialData);

    // Perform bulk operations
    const bulkOperations = [
      {
        type: 'add',
        date: '2024-01-01',
        entry: {
          source: 'book',
          bookIds: [1],
          notes: 'Bulk added entry 1'
        }
      },
      {
        type: 'add',
        date: '2024-01-02',
        entry: {
          source: 'manual',
          bookIds: [],
          notes: 'Bulk added entry 2'
        }
      },
      {
        type: 'update',
        date: '2024-01-01',
        updates: {
          notes: 'Updated bulk entry'
        }
      }
    ];

    const bulkResult = await callStorageMethod(page, 'bulkUpdateReadingDayEntries', bulkOperations);
    expect(bulkResult.success).toBe(true);
    expect(bulkResult.data.readingDayEntries.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe('DatabaseStorageService - Data Migration', () => {
  test.beforeEach(async ({ page }) => {
    await setupStorageService(page);
  });

  test('should migrate to enhanced streak history format', async ({ page }) => {
    // Create basic streak history first
    const basicStreakData = {
      readingDays: ['2024-01-01', '2024-01-02'],
      bookPeriods: [],
      lastCalculated: new Date()
    };

    await callStorageMethod(page, 'saveStreakHistory', basicStreakData);

    // Migrate to enhanced format
    const migrationResult = await callStorageMethod(page, 'migrateToEnhancedStreakHistory');
    expect(migrationResult.success).toBe(true);
    
    if (migrationResult.data) {
      expect(migrationResult.data.readingDayEntries).toBeDefined();
      expect(migrationResult.data.version).toBe(1);
    }
  });
});

test.describe('DatabaseStorageService - Import/Export Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupStorageService(page);
  });

  test('should export and import data correctly', async ({ page }) => {
    // Create test data
    const testBook = {
      title: 'Export Test Book',
      author: 'Export Author',
      progress: 75
    };

    const savedBook = await callStorageMethod(page, 'saveBook', testBook);
    expect(savedBook.success).toBe(true);

    // Export data
    const exportResult = await callStorageMethod(page, 'exportData');
    expect(exportResult.success).toBe(true);
    expect(exportResult.data.books).toHaveLength(1);
    expect(exportResult.data.metadata).toBeDefined();

    // Delete the book
    await callStorageMethod(page, 'deleteBook', savedBook.data.id);

    // Import data back
    const importResult = await callStorageMethod(page, 'importData', exportResult.data, {
      mergeDuplicates: false,
      overwriteExisting: true,
      validateData: true,
      skipInvalid: false
    });
    expect(importResult.success).toBe(true);

    // Verify book was restored
    const books = await callStorageMethod(page, 'getBooks');
    expect(books.success).toBe(true);
    expect(books.data.some((book: any) => book.title === testBook.title)).toBe(true);
  });

  test('should create and restore backups', async ({ page }) => {
    // Create test data
    const testBook = {
      title: 'Backup Test Book',
      author: 'Backup Author',
      progress: 100
    };

    await callStorageMethod(page, 'saveBook', testBook);

    // Create backup
    const backupResult = await callStorageMethod(page, 'createBackup');
    expect(backupResult.success).toBe(true);
    expect(typeof backupResult.data).toBe('string');

    // Clear data
    const books = await callStorageMethod(page, 'getBooks');
    for (const book of books.data) {
      await callStorageMethod(page, 'deleteBook', book.id);
    }

    // Restore from backup
    const restoreResult = await callStorageMethod(page, 'restoreBackup', backupResult.data);
    expect(restoreResult.success).toBe(true);

    // Verify data was restored
    const restoredBooks = await callStorageMethod(page, 'getBooks');
    expect(restoredBooks.success).toBe(true);
    expect(restoredBooks.data.some((book: any) => book.title === testBook.title)).toBe(true);
  });
});

test.describe('DatabaseStorageService - Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupStorageService(page);
  });

  test('should handle invalid book data gracefully', async ({ page }) => {
    const invalidBook = {
      // Missing required fields
      invalidField: 'invalid value'
    };

    const result = await callStorageMethod(page, 'saveBook', invalidBook);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should handle non-existent book operations', async ({ page }) => {
    const nonExistentId = 999999;

    // Try to get non-existent book
    const getResult = await callStorageMethod(page, 'getBook', nonExistentId);
    expect(getResult.success).toBe(true);
    expect(getResult.data).toBeNull();

    // Try to update non-existent book
    const updateResult = await callStorageMethod(page, 'updateBook', nonExistentId, { title: 'New Title' });
    expect(updateResult.success).toBe(false);

    // Try to delete non-existent book
    const deleteResult = await callStorageMethod(page, 'deleteBook', nonExistentId);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.data).toBe(false);
  });

  test('should handle concurrent operations safely', async ({ page }) => {
    const testBook = {
      title: 'Concurrent Test Book',
      author: 'Concurrent Author',
      progress: 0
    };

    const savedBook = await callStorageMethod(page, 'saveBook', testBook);
    expect(savedBook.success).toBe(true);

    // Perform multiple concurrent updates
    const concurrentUpdates = Array.from({ length: 5 }, (_, i) => 
      callStorageMethod(page, 'updateBook', savedBook.data.id, { progress: (i + 1) * 20 })
    );

    const results = await Promise.all(concurrentUpdates);
    
    // At least some operations should succeed
    const successfulOps = results.filter(r => r.success);
    expect(successfulOps.length).toBeGreaterThan(0);

    // Final state should be consistent
    const finalBook = await callStorageMethod(page, 'getBook', savedBook.data.id);
    expect(finalBook.success).toBe(true);
    expect(finalBook.data.progress).toBeGreaterThanOrEqual(0);
    expect(finalBook.data.progress).toBeLessThanOrEqual(100);

    // Cleanup
    await callStorageMethod(page, 'deleteBook', savedBook.data.id);
  });

  test('should handle network interruptions gracefully', async ({ page }) => {
    // Simulate network interruption by going offline
    await page.context().setOffline(true);

    const testBook = {
      title: 'Offline Test Book',
      author: 'Offline Author'
    };

    // Operation should fail gracefully
    const result = await callStorageMethod(page, 'saveBook', testBook);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Restore network
    await page.context().setOffline(false);

    // Operation should now succeed
    const onlineResult = await callStorageMethod(page, 'saveBook', testBook);
    expect(onlineResult.success).toBe(true);

    // Cleanup
    await callStorageMethod(page, 'deleteBook', onlineResult.data.id);
  });
});