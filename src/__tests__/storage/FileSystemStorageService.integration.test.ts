import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileSystemStorageService } from '../../services/storage/FileSystemStorageService';
import { Book } from '../../types';

describe('FileSystemStorageService Date Serialization Integration', () => {
  let service: FileSystemStorageService;
  
  // Mock File System Access API
  const mockFileHandle = {
    getFile: vi.fn(),
    createWritable: vi.fn(),
  };

  const mockWritableStream = {
    write: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileSystemStorageService();
    
    // Mock File System Access API availability
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue({
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
    }));
    
    mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
  });

  it('should properly deserialize dates when loading books from file', async () => {
    // Arrange - Create test data with Date objects that will be serialized to JSON
    const testBooks: Book[] = [
      {
        id: 1,
        title: 'Test Book',
        author: 'Test Author',
        status: 'finished',
        progress: 100,
        dateAdded: new Date('2025-01-01T10:00:00.000Z'),
        dateStarted: new Date('2025-02-12T00:00:00.000Z'),
        dateFinished: new Date('2025-02-20T00:00:00.000Z'),
        dateModified: new Date('2025-02-21T00:00:00.000Z'),
      },
      {
        id: 2,
        title: 'Another Book',
        author: 'Another Author',
        status: 'currently_reading',
        progress: 50,
        dateAdded: new Date('2025-01-15T10:00:00.000Z'),
        dateStarted: new Date('2025-03-01T00:00:00.000Z'),
        // No dateFinished for currently reading book
        dateModified: new Date('2025-03-05T00:00:00.000Z'),
      }
    ];

    // Simulate what happens when dates are serialized to JSON and read back
    const serializedData = JSON.stringify({
      books: testBooks,
      metadata: {
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
    });

    // Mock file reading to return serialized data (dates as strings)
    mockFileHandle.getFile.mockResolvedValue({
      text: () => Promise.resolve(serializedData)
    });

    // Set up file handle to simulate File System Access API usage
    (service as any).fileHandle = mockFileHandle;

    // Act - Load books from file (this should convert date strings back to Date objects)
    await (service as any).loadBooksFromFile();

    // Assert - Verify that dates are properly converted back to Date objects
    const loadedBooks = (service as any).books;
    
    expect(loadedBooks).toHaveLength(2);
    
    // First book - all dates should be Date objects
    expect(loadedBooks[0].dateAdded).toBeInstanceOf(Date);
    expect(loadedBooks[0].dateStarted).toBeInstanceOf(Date);
    expect(loadedBooks[0].dateFinished).toBeInstanceOf(Date);
    expect(loadedBooks[0].dateModified).toBeInstanceOf(Date);
    
    // Verify the actual date values are correct
    expect(loadedBooks[0].dateAdded.toISOString()).toBe('2025-01-01T10:00:00.000Z');
    expect(loadedBooks[0].dateStarted.toISOString()).toBe('2025-02-12T00:00:00.000Z');
    expect(loadedBooks[0].dateFinished.toISOString()).toBe('2025-02-20T00:00:00.000Z');
    expect(loadedBooks[0].dateModified.toISOString()).toBe('2025-02-21T00:00:00.000Z');
    
    // Second book - check optional dates are handled correctly
    expect(loadedBooks[1].dateAdded).toBeInstanceOf(Date);
    expect(loadedBooks[1].dateStarted).toBeInstanceOf(Date);
    expect(loadedBooks[1].dateFinished).toBeUndefined(); // Currently reading book
    expect(loadedBooks[1].dateModified).toBeInstanceOf(Date);
    
    expect(loadedBooks[1].dateAdded.toISOString()).toBe('2025-01-15T10:00:00.000Z');
    expect(loadedBooks[1].dateStarted.toISOString()).toBe('2025-03-01T00:00:00.000Z');
    expect(loadedBooks[1].dateModified.toISOString()).toBe('2025-03-05T00:00:00.000Z');
  });

  it('should handle books with missing optional dates correctly', async () => {
    // Arrange - Create test data with minimal date information
    const testBooksWithMissingDates = [
      {
        id: 1,
        title: 'Minimal Book',
        author: 'Test Author',
        status: 'want_to_read',
        progress: 0,
        dateAdded: new Date('2025-01-01T10:00:00.000Z'),
        // No dateStarted, dateFinished, or dateModified
      }
    ];

    const serializedData = JSON.stringify({
      books: testBooksWithMissingDates,
      metadata: {
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      }
    });

    mockFileHandle.getFile.mockResolvedValue({
      text: () => Promise.resolve(serializedData)
    });

    (service as any).fileHandle = mockFileHandle;

    // Act
    await (service as any).loadBooksFromFile();

    // Assert
    const loadedBooks = (service as any).books;
    expect(loadedBooks).toHaveLength(1);
    
    expect(loadedBooks[0].dateAdded).toBeInstanceOf(Date);
    expect(loadedBooks[0].dateStarted).toBeUndefined();
    expect(loadedBooks[0].dateFinished).toBeUndefined();
    expect(loadedBooks[0].dateModified).toBeUndefined();
    
    expect(loadedBooks[0].dateAdded.toISOString()).toBe('2025-01-01T10:00:00.000Z');
  });

  it('should maintain date consistency between localStorage and File System Access API', async () => {
    // This test ensures both storage methods handle dates the same way
    const testBook: Book = {
      id: 1,
      title: 'Consistency Test',
      author: 'Test Author',
      status: 'finished',
      progress: 100,
      dateAdded: new Date('2025-01-01T10:00:00.000Z'),
      dateStarted: new Date('2025-02-12T00:00:00.000Z'),
      dateFinished: new Date('2025-02-20T00:00:00.000Z'),
    };

    // Test localStorage path
    const localStorageService = new FileSystemStorageService();
    localStorage.setItem('puka-books', JSON.stringify([testBook]));
    
    await (localStorageService as any).initializeLocalStorage();
    const localStorageBooks = (localStorageService as any).books;

    // Test File System Access API path
    const fileSystemService = new FileSystemStorageService();
    const serializedData = JSON.stringify({
      books: [testBook],
      metadata: { lastModified: new Date().toISOString(), version: '1.0.0' }
    });

    mockFileHandle.getFile.mockResolvedValue({
      text: () => Promise.resolve(serializedData)
    });

    (fileSystemService as any).fileHandle = mockFileHandle;
    await (fileSystemService as any).loadBooksFromFile();
    const fileSystemBooks = (fileSystemService as any).books;

    // Assert both methods produce identical results
    expect(localStorageBooks[0].dateAdded).toBeInstanceOf(Date);
    expect(fileSystemBooks[0].dateAdded).toBeInstanceOf(Date);
    expect(localStorageBooks[0].dateAdded.getTime()).toBe(fileSystemBooks[0].dateAdded.getTime());
    
    expect(localStorageBooks[0].dateStarted).toBeInstanceOf(Date);
    expect(fileSystemBooks[0].dateStarted).toBeInstanceOf(Date);
    expect(localStorageBooks[0].dateStarted.getTime()).toBe(fileSystemBooks[0].dateStarted.getTime());
    
    expect(localStorageBooks[0].dateFinished).toBeInstanceOf(Date);
    expect(fileSystemBooks[0].dateFinished).toBeInstanceOf(Date);
    expect(localStorageBooks[0].dateFinished.getTime()).toBe(fileSystemBooks[0].dateFinished.getTime());

    // Clean up
    localStorage.removeItem('puka-books');
  });
});