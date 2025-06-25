import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorageService } from '@/services/storage/MockStorageService';
import { StorageError, StorageErrorCode } from '@/services/storage/StorageService';
import type { Book } from '@/types';

describe('MockStorageService', () => {
  let storage: MockStorageService;

  beforeEach(async () => {
    storage = new MockStorageService();
    await storage.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newStorage = new MockStorageService();
      await expect(newStorage.initialize()).resolves.not.toThrow();
    });

    it('should throw error when not initialized', async () => {
      const newStorage = new MockStorageService();
      await expect(newStorage.getBooks()).rejects.toThrow(StorageError);
    });

    it('should seed test data after initialization', async () => {
      const books = await storage.getBooks();
      expect(books.length).toBeGreaterThan(0);
      expect(books[0]).toHaveProperty('id');
      expect(books[0]).toHaveProperty('title');
      expect(books[0]).toHaveProperty('author');
    });
  });

  describe('book CRUD operations', () => {
    it('should get all books', async () => {
      const books = await storage.getBooks();
      expect(Array.isArray(books)).toBe(true);
      expect(books.length).toBeGreaterThan(0);
    });

    it('should get a specific book by ID', async () => {
      const books = await storage.getBooks();
      const firstBook = books[0];
      const retrievedBook = await storage.getBook(firstBook.id);
      
      expect(retrievedBook).not.toBeNull();
      expect(retrievedBook?.id).toBe(firstBook.id);
      expect(retrievedBook?.title).toBe(firstBook.title);
    });

    it('should return null for non-existent book', async () => {
      const book = await storage.getBook(999999);
      expect(book).toBeNull();
    });

    it('should save a new book', async () => {
      const newBookData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'want_to_read' as const,
        progress: 0,
        notes: 'This is a test book'
      };

      const savedBook = await storage.saveBook(newBookData);
      
      expect(savedBook).toHaveProperty('id');
      expect(savedBook).toHaveProperty('dateAdded');
      expect(savedBook.title).toBe(newBookData.title);
      expect(savedBook.author).toBe(newBookData.author);
      expect(savedBook.status).toBe(newBookData.status);
    });

    it('should update an existing book', async () => {
      const books = await storage.getBooks();
      const bookToUpdate = books[0];
      const updates = {
        progress: 75,
        status: 'currently_reading' as const,
        notes: 'Updated notes'
      };

      const updatedBook = await storage.updateBook(bookToUpdate.id, updates);
      
      expect(updatedBook.id).toBe(bookToUpdate.id);
      expect(updatedBook.progress).toBe(updates.progress);
      expect(updatedBook.status).toBe(updates.status);
      expect(updatedBook.notes).toBe(updates.notes);
      expect(updatedBook.title).toBe(bookToUpdate.title); // Should preserve existing data
    });

    it('should throw error when updating non-existent book', async () => {
      const updates = { progress: 50 };
      await expect(storage.updateBook(999999, updates)).rejects.toThrow(StorageError);
    });

    it('should delete an existing book', async () => {
      const books = await storage.getBooks();
      const bookToDelete = books[0];
      const initialCount = books.length;

      const deleted = await storage.deleteBook(bookToDelete.id);
      expect(deleted).toBe(true);

      const remainingBooks = await storage.getBooks();
      expect(remainingBooks.length).toBe(initialCount - 1);
      expect(remainingBooks.find(b => b.id === bookToDelete.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent book', async () => {
      const deleted = await storage.deleteBook(999999);
      expect(deleted).toBe(false);
    });
  });

  describe('settings management', () => {
    it('should get default settings', async () => {
      const settings = await storage.getSettings();
      
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('dailyReadingGoal');
      expect(settings).toHaveProperty('defaultView');
      expect(settings.theme).toBe('system');
    });

    it('should update settings', async () => {
      const updates = {
        theme: 'dark' as const,
        dailyReadingGoal: 60,
        defaultView: 'list' as const
      };

      const updatedSettings = await storage.updateSettings(updates);
      
      expect(updatedSettings.theme).toBe(updates.theme);
      expect(updatedSettings.dailyReadingGoal).toBe(updates.dailyReadingGoal);
      expect(updatedSettings.defaultView).toBe(updates.defaultView);
    });
  });

  describe('search and filtering', () => {
    it('should search books by title', async () => {
      const results = await storage.searchBooks('Gatsby');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Gatsby');
    });

    it('should search books by author', async () => {
      const results = await storage.searchBooks('Herbert');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].author).toContain('Herbert');
    });

    it('should return empty array for no matches', async () => {
      const results = await storage.searchBooks('NonExistentBook');
      expect(results).toEqual([]);
    });

    it('should filter books by status', async () => {
      const results = await storage.getFilteredBooks({
        status: 'currently_reading'
      });
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(book => {
        expect(book.status).toBe('currently_reading');
      });
    });

    it('should sort books by title ascending', async () => {
      const results = await storage.getFilteredBooks({
        sortBy: 'title',
        sortOrder: 'asc'
      });
      
      expect(results.length).toBeGreaterThan(1);
      for (let i = 1; i < results.length; i++) {
        const current = results[i].title.toLowerCase();
        const previous = results[i - 1].title.toLowerCase();
        expect(current >= previous).toBe(true);
      }
    });

    it('should apply pagination', async () => {
      const allBooks = await storage.getBooks();
      const firstPage = await storage.getFilteredBooks({
        limit: 2,
        offset: 0
      });
      const secondPage = await storage.getFilteredBooks({
        limit: 2,
        offset: 2
      });
      
      expect(firstPage.length).toBeLessThanOrEqual(2);
      expect(secondPage.length).toBeLessThanOrEqual(2);
      expect(firstPage[0]?.id).not.toBe(secondPage[0]?.id);
    });
  });

  describe('import/export', () => {
    it('should export all data', async () => {
      const exportData = await storage.exportData();
      
      expect(exportData).toHaveProperty('books');
      expect(exportData).toHaveProperty('metadata');
      expect(exportData).toHaveProperty('settings');
      expect(exportData.metadata).toHaveProperty('exportDate');
      expect(exportData.metadata).toHaveProperty('version');
      expect(exportData.metadata).toHaveProperty('totalBooks');
    });

    it('should import data successfully', async () => {
      const testBooks: Omit<Book, 'id' | 'dateAdded'>[] = [
        {
          title: 'Imported Book 1',
          author: 'Import Author',
          status: 'want_to_read',
          progress: 0
        },
        {
          title: 'Imported Book 2',
          author: 'Import Author 2',
          status: 'finished',
          progress: 100
        }
      ];

      const importData = {
        books: testBooks,
        settings: {
          theme: 'light' as const,
          dailyReadingGoal: 45
        }
      };

      const result = await storage.importData(importData);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);

      const allBooks = await storage.getBooks();
      const importedBooks = allBooks.filter(book => book.author.includes('Import Author'));
      expect(importedBooks.length).toBe(2);
    });

    it('should handle duplicate books during import', async () => {
      const books = await storage.getBooks();
      const existingBook = books[0];
      
      const duplicateBook = {
        title: existingBook.title,
        author: existingBook.author,
        status: 'finished' as const,
        progress: 100
      };

      const importData = {
        books: [duplicateBook]
      };

      const result = await storage.importData(importData, {
        mergeDuplicates: false,
        overwriteExisting: false,
        validateData: true,
        skipInvalid: true
      });
      
      expect(result.duplicates).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });
  });

  describe('backup and restore', () => {
    it('should create backup string', async () => {
      const backup = await storage.createBackup();
      
      expect(typeof backup).toBe('string');
      expect(() => JSON.parse(backup)).not.toThrow();
      
      const parsedBackup = JSON.parse(backup);
      expect(parsedBackup).toHaveProperty('books');
      expect(parsedBackup).toHaveProperty('metadata');
    });

    it('should restore from backup', async () => {
      const originalBooks = await storage.getBooks();
      const backup = await storage.createBackup();
      
      // Add a new book to change state
      await storage.saveBook({
        title: 'New Book After Backup',
        author: 'New Author',
        status: 'want_to_read',
        progress: 0
      });

      // Restore from backup
      await storage.restoreBackup(backup);
      
      const restoredBooks = await storage.getBooks();
      expect(restoredBooks.length).toBe(originalBooks.length);
      
      // Should not contain the book added after backup
      const newBook = restoredBooks.find(book => book.title === 'New Book After Backup');
      expect(newBook).toBeUndefined();
    });

    it('should throw error for invalid backup data', async () => {
      const invalidBackup = 'invalid json data';
      
      await expect(storage.restoreBackup(invalidBackup)).rejects.toThrow(StorageError);
    });
  });

  describe('error handling', () => {
    it('should throw StorageError with correct error code', async () => {
      try {
        await storage.updateBook(999999, { progress: 50 });
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.FILE_NOT_FOUND);
      }
    });
  });
});