import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSystemStorageService } from '@/services/storage/FileSystemStorageService';
import { StorageError } from '@/services/storage/StorageService';

// Mock File System Access API
const mockFileHandle = {
  getFile: vi.fn(),
  createWritable: vi.fn()
};

const mockWritable = {
  write: vi.fn(),
  close: vi.fn()
};

const mockFile = {
  text: vi.fn()
};

// Mock window methods
const mockShowOpenFilePicker = vi.fn();
const mockShowSaveFilePicker = vi.fn();

describe('FileSystemStorageService', () => {
  let service: FileSystemStorageService;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    service = new FileSystemStorageService();
    
    // Mock File System Access API
    vi.stubGlobal('showOpenFilePicker', mockShowOpenFilePicker);
    vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);
    
    // Reset mocks
    vi.clearAllMocks();
    mockFileHandle.createWritable.mockResolvedValue(mockWritable);
    mockFileHandle.getFile.mockResolvedValue(mockFile);
    mockWritable.write.mockResolvedValue(undefined);
    mockWritable.close.mockResolvedValue(undefined);
    
    // Mock localStorage
    originalLocalStorage = window.localStorage;
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
  });

  describe('isSupported', () => {
    it('returns true when File System Access API is available', () => {
      vi.stubGlobal('showOpenFilePicker', vi.fn());
      vi.stubGlobal('showSaveFilePicker', vi.fn());
      
      expect(FileSystemStorageService.isSupported()).toBe(true);
    });

    it('returns false when File System Access API is not available', () => {
      vi.unstubAllGlobals();
      
      expect(FileSystemStorageService.isSupported()).toBe(false);
    });
  });

  describe('localStorage fallback', () => {
    beforeEach(() => {
      // Make File System Access API unavailable
      vi.unstubAllGlobals();
    });

    it('initializes with localStorage when File System Access API is not supported', async () => {
      const booksData = JSON.stringify([{
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        status: 'want_to_read',
        progress: 0,
        dateAdded: new Date()
      }]);
      
      (window.localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'puka-books') return booksData;
        if (key === 'puka-settings') return '{}';
        return null;
      });

      await service.initialize();
      const books = await service.getBooks();
      
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Test Book');
    });

    it('saves to localStorage when File System Access API is not supported', async () => {
      await service.initialize();
      
      const newBook = {
        title: 'New Book',
        author: 'New Author',
        status: 'want_to_read' as const,
        progress: 0
      };

      const savedBook = await service.saveBook(newBook);
      
      expect(savedBook.id).toBeDefined();
      expect(savedBook.title).toBe('New Book');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'puka-books',
        expect.stringContaining('New Book')
      );
    });
  });

  describe('File System Access API', () => {
    beforeEach(() => {
      vi.stubGlobal('showOpenFilePicker', mockShowOpenFilePicker);
      vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);
    });

    it('creates new files when no existing files are found', async () => {
      mockShowOpenFilePicker.mockRejectedValue(new DOMException('No file selected', 'AbortError'));
      mockShowSaveFilePicker
        .mockResolvedValueOnce(mockFileHandle) // data file
        .mockResolvedValueOnce(mockFileHandle); // settings file

      await service.initialize();
      
      expect(mockShowSaveFilePicker).toHaveBeenCalledTimes(2);
      expect(mockShowSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'puka-books.json'
        })
      );
      expect(mockShowSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'puka-settings.json'
        })
      );
    });

    it('loads existing files when found', async () => {
      const booksData = JSON.stringify({
        books: [{
          id: 1,
          title: 'Existing Book',
          author: 'Existing Author',
          status: 'currently_reading',
          progress: 50,
          dateAdded: new Date()
        }]
      });
      
      mockFile.text.mockResolvedValueOnce(booksData).mockResolvedValueOnce('{}');
      mockShowOpenFilePicker
        .mockResolvedValueOnce([mockFileHandle]) // data file
        .mockResolvedValueOnce([mockFileHandle]); // settings file

      await service.initialize();
      const books = await service.getBooks();
      
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Existing Book');
    });

    it('handles user cancellation gracefully', async () => {
      mockShowOpenFilePicker.mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
      mockShowSaveFilePicker.mockRejectedValue(new DOMException('User cancelled', 'AbortError'));

      // Should fallback to localStorage gracefully, not throw error
      await expect(service.initialize()).resolves.toBeUndefined();
      expect(service.books).toEqual([]);
    });
  });

  describe('basic operations', () => {
    beforeEach(async () => {
      // Initialize with localStorage fallback for easier testing
      vi.unstubAllGlobals();
      (window.localStorage.getItem as any).mockReturnValue(null);
      await service.initialize();
    });

    it('saves and retrieves books', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'want_to_read' as const,
        progress: 0,
        notes: 'Test notes'
      };

      const savedBook = await service.saveBook(bookData);
      expect(savedBook.id).toBeDefined();
      expect(savedBook.title).toBe(bookData.title);
      expect(savedBook.dateAdded).toBeInstanceOf(Date);

      const retrievedBook = await service.getBook(savedBook.id!);
      expect(retrievedBook).toEqual(savedBook);
    });

    it('updates books', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'want_to_read' as const,
        progress: 0
      };

      const savedBook = await service.saveBook(bookData);
      const updatedBook = await service.updateBook(savedBook.id!, {
        progress: 50,
        status: 'currently_reading'
      });

      expect(updatedBook.progress).toBe(50);
      expect(updatedBook.status).toBe('currently_reading');
      expect(updatedBook.dateModified).toBeInstanceOf(Date);
    });

    it('deletes books', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'want_to_read' as const,
        progress: 0
      };

      const savedBook = await service.saveBook(bookData);
      const deleted = await service.deleteBook(savedBook.id!);
      
      expect(deleted).toBe(true);
      
      const retrievedBook = await service.getBook(savedBook.id!);
      expect(retrievedBook).toBeNull();
    });

    it('searches books by title and author', async () => {
      await service.saveBook({
        title: 'JavaScript: The Good Parts',
        author: 'Douglas Crockford',
        status: 'finished',
        progress: 100
      });

      await service.saveBook({
        title: 'Clean Code',
        author: 'Robert Martin',
        status: 'want_to_read',
        progress: 0
      });

      const results = await service.searchBooks('JavaScript');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript: The Good Parts');

      const authorResults = await service.searchBooks('Martin');
      expect(authorResults).toHaveLength(1);
      expect(authorResults[0].author).toBe('Robert Martin');
    });

    it('filters books by status', async () => {
      await service.saveBook({
        title: 'Book 1',
        author: 'Author 1',
        status: 'want_to_read',
        progress: 0
      });

      await service.saveBook({
        title: 'Book 2',
        author: 'Author 2',
        status: 'currently_reading',
        progress: 50
      });

      await service.saveBook({
        title: 'Book 3',
        author: 'Author 3',
        status: 'finished',
        progress: 100
      });

      const readingBooks = await service.getFilteredBooks({ status: 'currently_reading' });
      expect(readingBooks).toHaveLength(1);
      expect(readingBooks[0].title).toBe('Book 2');

      const finishedBooks = await service.getFilteredBooks({ status: 'finished' });
      expect(finishedBooks).toHaveLength(1);
      expect(finishedBooks[0].title).toBe('Book 3');
    });
  });

  describe('settings management', () => {
    beforeEach(async () => {
      vi.unstubAllGlobals();
      (window.localStorage.getItem as any).mockReturnValue(null);
      await service.initialize();
    });

    it('returns default settings initially', async () => {
      const settings = await service.getSettings();
      
      expect(settings.theme).toBe('system');
      expect(settings.dailyReadingGoal).toBe(30);
      expect(settings.defaultView).toBe('grid');
    });

    it('updates and persists settings', async () => {
      const updates = {
        theme: 'dark' as const,
        dailyReadingGoal: 60,
        defaultView: 'list' as const
      };

      const updatedSettings = await service.updateSettings(updates);
      
      expect(updatedSettings.theme).toBe('dark');
      expect(updatedSettings.dailyReadingGoal).toBe(60);
      expect(updatedSettings.defaultView).toBe('list');

      // Verify persistence
      const retrievedSettings = await service.getSettings();
      expect(retrievedSettings).toEqual(updatedSettings);
    });
  });

  describe('import/export', () => {
    beforeEach(async () => {
      vi.unstubAllGlobals();
      (window.localStorage.getItem as any).mockReturnValue(null);
      await service.initialize();
    });

    it('exports data correctly', async () => {
      await service.saveBook({
        title: 'Export Test',
        author: 'Test Author',
        status: 'want_to_read',
        progress: 0
      });

      const exportData = await service.exportData();
      
      expect(exportData.books).toHaveLength(1);
      expect(exportData.books[0].title).toBe('Export Test');
      expect(exportData.metadata.totalBooks).toBe(1);
      expect(exportData.metadata.exportDate).toBeDefined();
    });

    it('imports data with validation', async () => {
      const importData = {
        books: [
          {
            title: 'Imported Book 1',
            author: 'Imported Author 1',
            status: 'want_to_read' as const,
            progress: 0
          },
          {
            title: 'Imported Book 2',
            author: 'Imported Author 2',
            status: 'finished' as const,
            progress: 100
          }
        ]
      };

      const result = await service.importData(importData);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const books = await service.getBooks();
      expect(books).toHaveLength(2);
    });

    it('handles import validation errors', async () => {
      const invalidData = {
        books: [
          {
            title: '', // Invalid: empty title
            author: 'Author',
            status: 'want_to_read' as const,
            progress: 0
          },
          {
            title: 'Valid Book',
            author: 'Valid Author',
            status: 'want_to_read' as const,
            progress: 0
          }
        ]
      };

      const result = await service.importData(invalidData, {
        mergeDuplicates: true,
        overwriteExisting: false,
        validateData: true,
        skipInvalid: true
      });
      
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('title');
    });
  });

  describe('error handling', () => {
    it('throws initialization error when localStorage fails', async () => {
      vi.unstubAllGlobals();
      (window.localStorage.getItem as any).mockImplementation(() => {
        throw new Error('localStorage failed');
      });

      // Should not throw - should handle localStorage gracefully
      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('requires initialization before operations', async () => {
      const newService = new FileSystemStorageService();
      
      await expect(newService.getBooks()).rejects.toThrow(StorageError);
      await expect(newService.getBooks()).rejects.toThrow('not initialized');
    });

    it('handles file system errors gracefully', async () => {
      vi.stubGlobal('showOpenFilePicker', mockShowOpenFilePicker);
      vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);
      
      mockShowOpenFilePicker.mockRejectedValue(new Error('File system error'));
      mockShowSaveFilePicker.mockRejectedValue(new Error('File system error'));

      // Should fallback to localStorage gracefully, not throw error
      await expect(service.initialize()).resolves.toBeUndefined();
      expect(service.books).toEqual([]);
    });
  });
});