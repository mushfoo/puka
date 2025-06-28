import { useState, useEffect, useCallback } from 'react';
import { Book, StatusFilter } from '@/types';
import { createStorageService, StorageService, ExportData } from '@/services/storage';

interface UseStorageResult {
  books: Book[];
  loading: boolean;
  error: string | null;
  addBook: (book: Omit<Book, 'id' | 'dateAdded'>) => Promise<Book | null>;
  updateBook: (id: number, updates: Partial<Book>) => Promise<boolean>;
  deleteBook: (id: number) => Promise<boolean>;
  updateProgress: (bookId: number, progress: number) => Promise<boolean>;
  markComplete: (bookId: number) => Promise<boolean>;
  changeStatus: (bookId: number, status: Book['status']) => Promise<boolean>;
  searchBooks: (query: string) => Promise<Book[]>;
  getFilteredBooks: (filter: StatusFilter) => Book[];
  getExportData: () => Promise<ExportData | null>;
  refresh: () => Promise<void>;
}

export const useStorage = (): UseStorageResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageService] = useState<StorageService>(() => createStorageService());

  // Initialize storage and load books
  const initializeStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await storageService.initialize();
      const loadedBooks = await storageService.getBooks();
      setBooks(loadedBooks);
    } catch (err) {
      console.error('Failed to initialize storage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [storageService]);

  // Load books on mount
  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  // Add a new book
  const addBook = useCallback(async (bookData: Omit<Book, 'id' | 'dateAdded'>): Promise<Book | null> => {
    try {
      setError(null);
      const newBook = await storageService.saveBook(bookData);
      setBooks(prevBooks => [...prevBooks, newBook]);
      return newBook;
    } catch (err) {
      console.error('Failed to add book:', err);
      setError(err instanceof Error ? err.message : 'Failed to add book');
      return null;
    }
  }, [storageService]);

  // Update an existing book
  const updateBook = useCallback(async (id: number, updates: Partial<Book>): Promise<boolean> => {
    try {
      setError(null);
      const updatedBook = await storageService.updateBook(id, updates);
      setBooks(prevBooks => 
        prevBooks.map(book => book.id === id ? updatedBook : book)
      );
      return true;
    } catch (err) {
      console.error('Failed to update book:', err);
      setError(err instanceof Error ? err.message : 'Failed to update book');
      return false;
    }
  }, [storageService]);

  // Delete a book
  const deleteBook = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);
      const success = await storageService.deleteBook(id);
      if (success) {
        setBooks(prevBooks => prevBooks.filter(book => book.id !== id));
      }
      return success;
    } catch (err) {
      console.error('Failed to delete book:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete book');
      return false;
    }
  }, [storageService]);

  // Update progress with automatic status changes
  const updateProgress = useCallback(async (bookId: number, progress: number): Promise<boolean> => {
    const updates: Partial<Book> = {
      progress,
      dateModified: new Date()
    };

    // Auto-update status based on progress
    if (progress === 0) {
      updates.status = 'want_to_read';
    } else if (progress === 100) {
      updates.status = 'finished';
      updates.dateFinished = new Date();
    } else {
      updates.status = 'currently_reading';
      if (!books.find(b => b.id === bookId)?.dateStarted) {
        updates.dateStarted = new Date();
      }
    }

    return await updateBook(bookId, updates);
  }, [updateBook, books]);

  // Mark book as complete
  const markComplete = useCallback(async (bookId: number): Promise<boolean> => {
    return await updateProgress(bookId, 100);
  }, [updateProgress]);

  // Change book status
  const changeStatus = useCallback(async (bookId: number, status: Book['status']): Promise<boolean> => {
    const updates: Partial<Book> = {
      status,
      dateModified: new Date()
    };

    if (status === 'finished' && !books.find(b => b.id === bookId)?.dateFinished) {
      updates.dateFinished = new Date();
      updates.progress = 100;
    } else if (status === 'currently_reading' && !books.find(b => b.id === bookId)?.dateStarted) {
      updates.dateStarted = new Date();
    }

    return await updateBook(bookId, updates);
  }, [updateBook, books]);

  // Search books
  const searchBooks = useCallback(async (query: string): Promise<Book[]> => {
    try {
      return await storageService.searchBooks(query);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    }
  }, [storageService]);

  // Get filtered books (client-side filtering)
  const getFilteredBooks = useCallback((filter: StatusFilter): Book[] => {
    if (filter === 'all') {
      return books;
    }
    return books.filter(book => book.status === filter);
  }, [books]);

  // Get export data
  const getExportData = useCallback(async (): Promise<ExportData | null> => {
    try {
      setError(null);
      return await storageService.exportData();
    } catch (err) {
      console.error('Failed to get export data:', err);
      setError(err instanceof Error ? err.message : 'Failed to get export data');
      return null;
    }
  }, [storageService]);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    await initializeStorage();
  }, [initializeStorage]);

  return {
    books,
    loading,
    error,
    addBook,
    updateBook,
    deleteBook,
    updateProgress,
    markComplete,
    changeStatus,
    searchBooks,
    getFilteredBooks,
    getExportData,
    refresh
  };
};