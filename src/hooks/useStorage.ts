import { useState, useEffect, useCallback } from 'react';
import { Book, StatusFilter, StreakHistory, EnhancedStreakHistory, EnhancedReadingDayEntry } from '@/types';
import { createStorageService, StorageService, ExportData } from '@/services/storage';

interface UseStorageResult {
  books: Book[];
  streakHistory: StreakHistory | null;
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
  markReadingDay: () => Promise<boolean>;
  refresh: () => Promise<void>;
  // Enhanced streak history methods
  getEnhancedStreakHistory: () => Promise<EnhancedStreakHistory>;
  updateEnhancedStreakHistory: (updates: Partial<EnhancedStreakHistory>) => Promise<void>;
  addReadingDayEntry: (entry: EnhancedReadingDayEntry) => Promise<void>;
  updateReadingDayEntry: (date: string, updates: Partial<EnhancedReadingDayEntry>) => Promise<void>;
  removeReadingDayEntry: (date: string) => Promise<void>;
}

export const useStorage = (): UseStorageResult => {
  const [books, setBooks] = useState<Book[]>([]);
  const [streakHistory, setStreakHistory] = useState<StreakHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageService] = useState<StorageService>(() => createStorageService());

  // Initialize storage and load books
  const initializeStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await storageService.initialize();
      const [loadedBooks, loadedStreakHistory] = await Promise.all([
        storageService.getBooks(),
        storageService.getStreakHistory()
      ]);
      setBooks(loadedBooks);
      
      // Auto-create streak history if it doesn't exist and we have books with reading periods
      if (!loadedStreakHistory && loadedBooks.length > 0) {
        const booksWithReadingPeriods = loadedBooks.filter(book => 
          book.dateStarted && book.dateFinished
        );
        
        if (booksWithReadingPeriods.length > 0) {
          console.log(`Auto-creating streak history from ${booksWithReadingPeriods.length} books with reading periods`);
          
          // Dynamically import the streak calculator to avoid circular dependencies
          const { createStreakHistoryFromBooks } = await import('../utils/streakCalculator');
          const newStreakHistory = createStreakHistoryFromBooks(loadedBooks);
          
          // Save the new streak history
          await storageService.saveStreakHistory(newStreakHistory);
          console.log('Auto-created streak history with', newStreakHistory.readingDays.size, 'reading days');
          
          setStreakHistory(newStreakHistory);
        } else {
          setStreakHistory(loadedStreakHistory);
        }
      } else {
        setStreakHistory(loadedStreakHistory);
      }
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

  // Mark today as a reading day
  const markReadingDay = useCallback(async (): Promise<boolean> => {
    try {
      const updatedHistory = await storageService.markReadingDay();
      setStreakHistory(updatedHistory);
      return true;
    } catch (err) {
      console.error('Failed to mark reading day:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark reading day');
      return false;
    }
  }, [storageService]);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    await initializeStorage();
  }, [initializeStorage]);

  // Enhanced streak history methods
  const getEnhancedStreakHistory = useCallback(async (): Promise<EnhancedStreakHistory> => {
    try {
      setError(null);
      const result = await storageService.getEnhancedStreakHistory();
      if (!result) {
        // Create empty history if none exists
        const { createEmptyEnhancedStreakHistory } = await import('../utils/streakMigration');
        return createEmptyEnhancedStreakHistory();
      }
      return result;
    } catch (err) {
      console.error('Failed to get enhanced streak history:', err);
      setError(err instanceof Error ? err.message : 'Failed to get streak history');
      throw err;
    }
  }, [storageService]);

  const updateEnhancedStreakHistory = useCallback(async (updates: Partial<EnhancedStreakHistory>): Promise<void> => {
    try {
      setError(null);
      await storageService.updateEnhancedStreakHistory(updates);
    } catch (err) {
      console.error('Failed to update enhanced streak history:', err);
      setError(err instanceof Error ? err.message : 'Failed to update streak history');
      throw err;
    }
  }, [storageService]);

  const addReadingDayEntry = useCallback(async (entry: EnhancedReadingDayEntry): Promise<void> => {
    try {
      setError(null);
      await storageService.addReadingDayEntry(entry);
    } catch (err) {
      console.error('Failed to add reading day entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add reading day');
      throw err;
    }
  }, [storageService]);

  const updateReadingDayEntry = useCallback(async (date: string, updates: Partial<EnhancedReadingDayEntry>): Promise<void> => {
    try {
      setError(null);
      await storageService.updateReadingDayEntry(date, updates);
    } catch (err) {
      console.error('Failed to update reading day entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to update reading day');
      throw err;
    }
  }, [storageService]);

  const removeReadingDayEntry = useCallback(async (date: string): Promise<void> => {
    try {
      setError(null);
      await storageService.removeReadingDayEntry(date);
    } catch (err) {
      console.error('Failed to remove reading day entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove reading day');
      throw err;
    }
  }, [storageService]);

  return {
    books,
    streakHistory,
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
    markReadingDay,
    refresh,
    getEnhancedStreakHistory,
    updateEnhancedStreakHistory,
    addReadingDayEntry,
    updateReadingDayEntry,
    removeReadingDayEntry
  };
};