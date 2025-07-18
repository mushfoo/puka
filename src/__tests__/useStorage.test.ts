import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStorage } from '@/hooks/useStorage';
import { Book } from '@/types';

// Mock the storage service
const mockStorageService = {
  initialize: vi.fn(),
  getBooks: vi.fn(),
  getStreakHistory: vi.fn(),
  saveBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  searchBooks: vi.fn()
};

vi.mock('@/services/storage', () => ({
  createStorageService: () => mockStorageService
}));

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Test Book 1',
    author: 'Test Author 1',
    status: 'currently_reading',
    progress: 50,
    dateAdded: new Date('2024-01-01')
  },
  {
    id: 2,
    title: 'Test Book 2',
    author: 'Test Author 2',
    status: 'want_to_read',
    progress: 0,
    dateAdded: new Date('2024-01-02')
  },
  {
    id: 3,
    title: 'Test Book 3',
    author: 'Test Author 3',
    status: 'finished',
    progress: 100,
    dateAdded: new Date('2024-01-03'),
    dateFinished: new Date('2024-01-15')
  }
];

describe('useStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageService.initialize.mockResolvedValue(undefined);
    mockStorageService.getBooks.mockResolvedValue(mockBooks);
    mockStorageService.getStreakHistory.mockResolvedValue(null);
  });

  it('initializes storage and loads books on mount', async () => {
    const { result } = renderHook(() => useStorage());

    expect(result.current.loading).toBe(true);
    expect(mockStorageService.initialize).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.books).toEqual(mockBooks);
    expect(result.current.error).toBe(null);
    expect(mockStorageService.getBooks).toHaveBeenCalledTimes(1);
  });

  it('handles initialization error', async () => {
    const error = new Error('Initialization failed');
    mockStorageService.initialize.mockRejectedValue(error);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Initialization failed');
    expect(result.current.books).toEqual([]);
  });

  it('adds a new book successfully', async () => {
    const newBook: Book = {
      id: 4,
      title: 'New Book',
      author: 'New Author',
      status: 'want_to_read',
      progress: 0,
      dateAdded: new Date()
    };

    mockStorageService.saveBook.mockResolvedValue(newBook);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let addedBook: Book | null = null;
    await act(async () => {
      addedBook = await result.current.addBook({
        title: 'New Book',
        author: 'New Author',
        status: 'want_to_read',
        progress: 0
      });
    });

    expect(addedBook).toEqual(newBook);
    expect(result.current.books).toContain(newBook);
    expect(mockStorageService.saveBook).toHaveBeenCalledWith({
      title: 'New Book',
      author: 'New Author',
      status: 'want_to_read',
      progress: 0
    });
  });

  it('handles add book error', async () => {
    const error = new Error('Failed to add book');
    mockStorageService.saveBook.mockRejectedValue(error);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let addedBook: Book | null = null;
    await act(async () => {
      addedBook = await result.current.addBook({
        title: 'New Book',
        author: 'New Author',
        status: 'want_to_read',
        progress: 0
      });
    });

    expect(addedBook).toBe(null);
    expect(result.current.error).toBe('Failed to add book');
  });

  it('updates a book successfully', async () => {
    const updatedBook: Book = {
      ...mockBooks[0],
      title: 'Updated Title',
      dateModified: new Date()
    };

    mockStorageService.updateBook.mockResolvedValue(updatedBook);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.updateBook(1, { title: 'Updated Title' });
    });

    expect(success).toBe(true);
    expect(result.current.books.find(b => b.id === 1)?.title).toBe('Updated Title');
    expect(mockStorageService.updateBook).toHaveBeenCalledWith(1, { title: 'Updated Title' });
  });

  it('deletes a book successfully', async () => {
    mockStorageService.deleteBook.mockResolvedValue(true);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteBook(1);
    });

    expect(success).toBe(true);
    expect(result.current.books.find(b => b.id === 1)).toBeUndefined();
    expect(mockStorageService.deleteBook).toHaveBeenCalledWith(1);
  });

  it('updates progress with automatic status changes', async () => {
    const updatedBook: Book = {
      ...mockBooks[1],
      progress: 50,
      status: 'currently_reading',
      dateStarted: new Date(),
      dateModified: new Date()
    };

    mockStorageService.updateBook.mockResolvedValue(updatedBook);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProgress(2, 50);
    });

    expect(mockStorageService.updateBook).toHaveBeenCalledWith(2, expect.objectContaining({
      progress: 50,
      status: 'currently_reading',
      dateModified: expect.any(Date)
    }));
  });

  it('marks book as complete with 100% progress', async () => {
    const completedBook: Book = {
      ...mockBooks[1],
      progress: 100,
      status: 'finished',
      dateFinished: new Date(),
      dateModified: new Date()
    };

    mockStorageService.updateBook.mockResolvedValue(completedBook);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markComplete(2);
    });

    expect(mockStorageService.updateBook).toHaveBeenCalledWith(2, expect.objectContaining({
      progress: 100,
      status: 'finished',
      dateFinished: expect.any(Date)
    }));
  });

  it('changes book status correctly', async () => {
    const updatedBook: Book = {
      ...mockBooks[1],
      status: 'currently_reading',
      dateStarted: new Date(),
      dateModified: new Date()
    };

    mockStorageService.updateBook.mockResolvedValue(updatedBook);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.changeStatus(2, 'currently_reading');
    });

    expect(mockStorageService.updateBook).toHaveBeenCalledWith(2, expect.objectContaining({
      status: 'currently_reading',
      dateStarted: expect.any(Date),
      dateModified: expect.any(Date)
    }));
  });

  it('searches books successfully', async () => {
    const searchResults = [mockBooks[0]];
    mockStorageService.searchBooks.mockResolvedValue(searchResults);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let results: Book[] = [];
    await act(async () => {
      results = await result.current.searchBooks('Test Book 1');
    });

    expect(results).toEqual(searchResults);
    expect(mockStorageService.searchBooks).toHaveBeenCalledWith('Test Book 1');
  });

  it('filters books by status', async () => {
    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const currentlyReadingBooks = result.current.getFilteredBooks('currently_reading');
    expect(currentlyReadingBooks).toHaveLength(1);
    expect(currentlyReadingBooks[0].status).toBe('currently_reading');

    const allBooks = result.current.getFilteredBooks('all');
    expect(allBooks).toEqual(mockBooks);
  });

  it('refreshes data', async () => {
    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the mock call count
    vi.clearAllMocks();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockStorageService.initialize).toHaveBeenCalledTimes(1);
    expect(mockStorageService.getBooks).toHaveBeenCalledTimes(1);
  });

  it('handles search error', async () => {
    const error = new Error('Search failed');
    mockStorageService.searchBooks.mockRejectedValue(error);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let results: Book[] = [];
    await act(async () => {
      results = await result.current.searchBooks('test');
    });

    expect(results).toEqual([]);
    expect(result.current.error).toBe('Search failed');
  });

  it('handles update error', async () => {
    const error = new Error('Update failed');
    mockStorageService.updateBook.mockRejectedValue(error);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = true;
    await act(async () => {
      success = await result.current.updateBook(1, { title: 'New Title' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Update failed');
  });

  it('handles delete error', async () => {
    const error = new Error('Delete failed');
    mockStorageService.deleteBook.mockRejectedValue(error);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = true;
    await act(async () => {
      success = await result.current.deleteBook(1);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Delete failed');
  });

  it('auto-sets status to want_to_read when progress is 0', async () => {
    const updatedBook: Book = {
      ...mockBooks[0],
      progress: 0,
      status: 'want_to_read',
      dateModified: new Date()
    };

    mockStorageService.updateBook.mockResolvedValue(updatedBook);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProgress(1, 0);
    });

    expect(mockStorageService.updateBook).toHaveBeenCalledWith(1, expect.objectContaining({
      progress: 0,
      status: 'want_to_read'
    }));
  });
});