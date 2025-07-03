import { Book, StreakHistory, EnhancedStreakHistory, EnhancedReadingDayEntry } from '@/types';
import {
  StorageService,
  ExportData,
  ImportData,
  UserSettings,
  ImportOptions,
  ImportResult,
  BookFilter,
  StorageError,
  StorageErrorCode,
  BulkReadingDayOperation
} from './StorageService';
import {
  migrateStreakHistory,
  createEmptyEnhancedStreakHistory,
  addReadingDayEntry,
  removeReadingDayEntry,
  synchronizeReadingDays,
  validateEnhancedStreakHistory
} from '@/utils/streakMigration';

export class MockStorageService implements StorageService {
  private books: Book[] = [];
  private settings: UserSettings = {
    theme: 'system',
    dailyReadingGoal: 30,
    defaultView: 'grid',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    notificationsEnabled: true,
    autoBackup: false,
    backupFrequency: 'weekly'
  };
  private streakHistory: StreakHistory | null = null;
  private enhancedStreakHistory: EnhancedStreakHistory | null = null;
  private nextId = 1;
  private initialized = false;
  private transactionInProgress = false;

  async initialize(): Promise<void> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.initialized = true;
    this.seedTestData();
  }

  private seedTestData(): void {
    const testBooks: Omit<Book, 'id' | 'dateAdded'>[] = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        status: 'currently_reading',
        progress: 45,
        notes: 'Beautiful prose about the American Dream',
        totalPages: 180,
        currentPage: 81,
        genre: 'Classic Literature',
        isbn: '9780743273565',
        dateStarted: new Date('2024-01-15'),
        dateFinished: undefined,
        coverUrl: undefined,
        tags: ['classic', 'american-literature'],
        rating: undefined,
        publishedDate: '1925'
      },
      {
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'finished',
        progress: 100,
        notes: 'Epic science fiction masterpiece',
        totalPages: 688,
        currentPage: 688,
        genre: 'Science Fiction',
        isbn: '9780441172719',
        dateStarted: new Date('2023-12-01'),
        dateFinished: new Date('2024-01-10'),
        coverUrl: undefined,
        tags: ['sci-fi', 'space-opera'],
        rating: 5,
        publishedDate: '1965'
      },
      {
        title: 'The Midnight Library',
        author: 'Matt Haig',
        status: 'want_to_read',
        progress: 0,
        notes: 'Recommended by book club',
        totalPages: 288,
        currentPage: 0,
        genre: 'Contemporary Fiction',
        isbn: '9780525559474',
        dateStarted: undefined,
        dateFinished: undefined,
        coverUrl: undefined,
        tags: ['philosophy', 'contemporary'],
        rating: undefined,
        publishedDate: '2020'
      }
    ];

    // Add test books
    testBooks.forEach(book => {
      this.books.push({
        ...book,
        id: this.nextId++,
        dateAdded: new Date()
      });
    });
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage service not initialized',
        StorageErrorCode.INITIALIZATION_FAILED
      );
    }
  }

  async getBooks(): Promise<Book[]> {
    this.ensureInitialized();
    return [...this.books];
  }

  async getBook(id: number): Promise<Book | null> {
    this.ensureInitialized();
    return this.books.find(book => book.id === id) || null;
  }

  async saveBook(bookData: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
    this.ensureInitialized();
    const book: Book = {
      ...bookData,
      id: this.nextId++,
      dateAdded: new Date()
    };
    this.books.push(book);
    return book;
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    this.ensureInitialized();
    const bookIndex = this.books.findIndex(book => book.id === id);
    if (bookIndex === -1) {
      throw new StorageError(
        `Book with ID ${id} not found`,
        StorageErrorCode.FILE_NOT_FOUND
      );
    }

    const updatedBook = { ...this.books[bookIndex], ...updates };
    this.books[bookIndex] = updatedBook;
    return updatedBook;
  }

  async deleteBook(id: number): Promise<boolean> {
    this.ensureInitialized();
    const bookIndex = this.books.findIndex(book => book.id === id);
    if (bookIndex === -1) {
      return false;
    }
    this.books.splice(bookIndex, 1);
    return true;
  }

  async getSettings(): Promise<UserSettings> {
    this.ensureInitialized();
    return { ...this.settings };
  }

  async updateSettings(settingsUpdate: Partial<UserSettings>): Promise<UserSettings> {
    this.ensureInitialized();
    this.settings = { ...this.settings, ...settingsUpdate };
    return { ...this.settings };
  }

  async exportData(): Promise<ExportData> {
    this.ensureInitialized();
    return {
      books: [...this.books],
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalBooks: this.books.length
      },
      settings: { ...this.settings }
    };
  }

  async importData(data: ImportData, options: ImportOptions = {
    mergeDuplicates: false,
    overwriteExisting: false,
    validateData: true,
    skipInvalid: true
  }): Promise<ImportResult> {
    this.ensureInitialized();

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    };

    for (const book of data.books) {
      try {
        // Check for duplicates
        const existingBook = this.books.find(b => 
          b.title === book.title && b.author === book.author
        );

        if (existingBook) {
          result.duplicates++;
          if (!options.mergeDuplicates && !options.overwriteExisting) {
            result.skipped++;
            continue;
          }
        }

        if (existingBook && options.overwriteExisting) {
          await this.updateBook(existingBook.id, book);
        } else {
          await this.saveBook(book);
        }
        
        result.imported++;
      } catch (error) {
        result.errors.push({
          row: result.imported + result.skipped + 1,
          field: 'book',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: book
        });
        result.skipped++;
      }
    }

    if (data.settings) {
      await this.updateSettings(data.settings);
    }

    return result;
  }

  async searchBooks(query: string): Promise<Book[]> {
    this.ensureInitialized();
    const lowercaseQuery = query.toLowerCase();
    return this.books.filter(book =>
      book.title.toLowerCase().includes(lowercaseQuery) ||
      book.author.toLowerCase().includes(lowercaseQuery) ||
      book.notes?.toLowerCase().includes(lowercaseQuery) ||
      book.genre?.toLowerCase().includes(lowercaseQuery) ||
      book.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  async getFilteredBooks(filter: BookFilter): Promise<Book[]> {
    this.ensureInitialized();
    let filtered = [...this.books];

    // Apply status filter
    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter(book => book.status === filter.status);
    }

    // Apply search filter
    if (filter.search) {
      const query = filter.search.toLowerCase();
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.notes?.toLowerCase().includes(query) ||
        book.genre?.toLowerCase().includes(query)
      );
    }

    // Apply genre filter
    if (filter.genre) {
      filtered = filtered.filter(book => book.genre === filter.genre);
    }

    // Apply rating filter
    if (filter.rating !== undefined) {
      filtered = filtered.filter(book => book.rating === filter.rating);
    }

    // Apply date range filter
    if (filter.dateRange) {
      filtered = filtered.filter(book => {
        const bookDate = book.dateAdded;
        return bookDate >= filter.dateRange!.start && bookDate <= filter.dateRange!.end;
      });
    }

    // Apply sorting
    if (filter.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filter.sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'author':
            aValue = a.author.toLowerCase();
            bValue = b.author.toLowerCase();
            break;
          case 'progress':
            aValue = a.progress;
            bValue = b.progress;
            break;
          case 'dateFinished':
            aValue = a.dateFinished || new Date(0);
            bValue = b.dateFinished || new Date(0);
            break;
          default:
            aValue = a.dateAdded;
            bValue = b.dateAdded;
        }

        if (aValue < bValue) return filter.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return filter.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    if (filter.offset || filter.limit) {
      const start = filter.offset || 0;
      const end = filter.limit ? start + filter.limit : undefined;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async createBackup(): Promise<string> {
    this.ensureInitialized();
    const exportData = await this.exportData();
    return JSON.stringify(exportData, null, 2);
  }

  async restoreBackup(backupData: string): Promise<void> {
    this.ensureInitialized();
    try {
      const data: ExportData = JSON.parse(backupData);
      
      // Clear existing data
      this.books = [];
      this.nextId = 1;

      // Import backup data
      await this.importData(data, {
        mergeDuplicates: false,
        overwriteExisting: true,
        validateData: true,
        skipInvalid: false
      });

      if (data.settings) {
        await this.updateSettings(data.settings);
      }
    } catch (error) {
      throw new StorageError(
        'Failed to restore backup',
        StorageErrorCode.RESTORE_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Helper methods for testing
  reset(): void {
    this.books = [];
    this.nextId = 1;
    this.initialized = false;
    this.streakHistory = null;
    this.enhancedStreakHistory = null;
    this.transactionInProgress = false;
    this.settings = {
      theme: 'system',
      dailyReadingGoal: 30,
      defaultView: 'grid',
      sortBy: 'dateAdded',
      sortOrder: 'desc',
      notificationsEnabled: true,
      autoBackup: false,
      backupFrequency: 'weekly'
    };
  }

  getBookCount(): number {
    return this.books.length;
  }

  // Streak History methods
  async getStreakHistory(): Promise<StreakHistory | null> {
    this.ensureInitialized();
    return this.streakHistory ? {
      ...this.streakHistory,
      readingDays: new Set(this.streakHistory.readingDays)
    } : null;
  }

  async saveStreakHistory(streakHistory: StreakHistory): Promise<StreakHistory> {
    this.ensureInitialized();
    this.streakHistory = {
      ...streakHistory,
      readingDays: new Set(streakHistory.readingDays)
    };
    return {
      ...this.streakHistory,
      readingDays: new Set(this.streakHistory.readingDays)
    };
  }

  async updateStreakHistory(updates: Partial<StreakHistory>): Promise<StreakHistory> {
    this.ensureInitialized();
    if (!this.streakHistory) {
      this.streakHistory = {
        readingDays: new Set(),
        bookPeriods: [],
        lastCalculated: new Date()
      };
    }
    this.streakHistory = {
      ...this.streakHistory,
      ...updates,
      readingDays: updates.readingDays ? new Set(updates.readingDays) : this.streakHistory.readingDays,
      lastCalculated: new Date()
    };
    return {
      ...this.streakHistory,
      readingDays: new Set(this.streakHistory.readingDays)
    };
  }

  async clearStreakHistory(): Promise<void> {
    this.ensureInitialized();
    this.streakHistory = null;
  }

  async markReadingDay(): Promise<StreakHistory> {
    this.ensureInitialized();
    
    // Get or create streak history
    if (!this.streakHistory) {
      this.streakHistory = {
        readingDays: new Set<string>(),
        bookPeriods: [],
        lastCalculated: new Date()
      };
    }
    
    // Add today to reading days
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    this.streakHistory.readingDays.add(todayISO);
    this.streakHistory.lastCalculated = new Date();
    
    return {
      ...this.streakHistory,
      readingDays: new Set(this.streakHistory.readingDays)
    };
  }

  // Enhanced streak history methods - Phase 1.3 implementation
  
  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    this.ensureInitialized();
    
    if (this.enhancedStreakHistory) {
      return { ...this.enhancedStreakHistory };
    }
    
    // Try migration from legacy data if available
    if (this.streakHistory) {
      return await this.migrateToEnhancedStreakHistory();
    }
    
    return null;
  }

  async saveEnhancedStreakHistory(enhancedHistory: EnhancedStreakHistory): Promise<EnhancedStreakHistory> {
    this.ensureInitialized();
    
    // Validate data integrity
    const validation = validateEnhancedStreakHistory(enhancedHistory);
    if (!validation.isValid) {
      throw new StorageError(
        `Invalid enhanced streak history: ${validation.issues.join(', ')}`,
        StorageErrorCode.VALIDATION_ERROR
      );
    }
    
    const now = new Date();
    this.enhancedStreakHistory = {
      ...enhancedHistory,
      lastSyncDate: now
    };
    
    return { ...this.enhancedStreakHistory };
  }

  async updateEnhancedStreakHistory(updates: Partial<EnhancedStreakHistory>): Promise<EnhancedStreakHistory> {
    this.ensureInitialized();
    
    // Get current history or create empty if none exists
    let currentHistory = await this.getEnhancedStreakHistory();
    if (!currentHistory) {
      currentHistory = createEmptyEnhancedStreakHistory();
    }
    
    // Merge updates
    const updatedHistory: EnhancedStreakHistory = {
      ...currentHistory,
      ...updates,
      lastSyncDate: new Date()
    };
    
    // Synchronize reading days if readingDayEntries were updated
    const finalHistory = synchronizeReadingDays(updatedHistory);
    
    return await this.saveEnhancedStreakHistory(finalHistory);
  }

  async addReadingDayEntry(entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>): Promise<EnhancedStreakHistory> {
    this.ensureInitialized();
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(entry.date)) {
      throw new StorageError(
        'Invalid date format. Expected YYYY-MM-DD format.',
        StorageErrorCode.VALIDATION_ERROR
      );
    }
    
    // Get current history or create empty if none exists
    let currentHistory = await this.getEnhancedStreakHistory();
    if (!currentHistory) {
      currentHistory = createEmptyEnhancedStreakHistory();
    }
    
    // Add the entry using migration utility
    const updatedHistory = addReadingDayEntry(currentHistory, entry);
    
    return await this.saveEnhancedStreakHistory(updatedHistory);
  }

  async updateReadingDayEntry(date: string, updates: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>): Promise<EnhancedStreakHistory> {
    this.ensureInitialized();
    
    const currentHistory = await this.getEnhancedStreakHistory();
    if (!currentHistory) {
      throw new StorageError(
        'No enhanced streak history found',
        StorageErrorCode.FILE_NOT_FOUND
      );
    }
    
    // Find existing entry
    const existingIndex = currentHistory.readingDayEntries.findIndex(entry => entry.date === date);
    if (existingIndex === -1) {
      throw new StorageError(
        `Reading day entry for ${date} not found`,
        StorageErrorCode.FILE_NOT_FOUND
      );
    }
    
    // Update the entry
    const updatedEntries = [...currentHistory.readingDayEntries];
    updatedEntries[existingIndex] = {
      ...updatedEntries[existingIndex],
      ...updates,
      modifiedAt: new Date()
    };
    
    const updatedHistory: EnhancedStreakHistory = {
      ...currentHistory,
      readingDayEntries: updatedEntries,
      lastSyncDate: new Date()
    };
    
    // Synchronize reading days
    const finalHistory = synchronizeReadingDays(updatedHistory);
    
    return await this.saveEnhancedStreakHistory(finalHistory);
  }

  async removeReadingDayEntry(date: string): Promise<EnhancedStreakHistory> {
    this.ensureInitialized();
    
    const currentHistory = await this.getEnhancedStreakHistory();
    if (!currentHistory) {
      throw new StorageError(
        'No enhanced streak history found',
        StorageErrorCode.FILE_NOT_FOUND
      );
    }
    
    // Remove the entry using migration utility
    const updatedHistory = removeReadingDayEntry(currentHistory, date);
    
    return await this.saveEnhancedStreakHistory(updatedHistory);
  }

  async getReadingDayEntriesInRange(startDate: string, endDate: string): Promise<EnhancedReadingDayEntry[]> {
    this.ensureInitialized();
    
    const currentHistory = await this.getEnhancedStreakHistory();
    if (!currentHistory) {
      return [];
    }
    
    return currentHistory.readingDayEntries.filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  async migrateToEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    this.ensureInitialized();
    
    // Check if we already have enhanced history
    if (this.enhancedStreakHistory) {
      return { ...this.enhancedStreakHistory };
    }
    
    // Check if we have legacy history to migrate
    if (!this.streakHistory) {
      return null;
    }
    
    try {
      // Perform migration
      const migratedHistory = migrateStreakHistory(this.streakHistory);
      
      // Save the migrated data
      await this.saveEnhancedStreakHistory(migratedHistory);
      
      return { ...migratedHistory };
    } catch (error) {
      throw new StorageError(
        'Failed to migrate streak history to enhanced format',
        StorageErrorCode.VALIDATION_ERROR,
        error as Error
      );
    }
  }

  async bulkUpdateReadingDayEntries(operations: BulkReadingDayOperation[]): Promise<EnhancedStreakHistory> {
    this.ensureInitialized();
    
    // Begin transaction-like operation
    if (this.transactionInProgress) {
      throw new StorageError(
        'Another transaction is already in progress',
        StorageErrorCode.UNKNOWN_ERROR
      );
    }
    
    this.transactionInProgress = true;
    
    try {
      // Get current history or create empty if none exists
      let currentHistory = await this.getEnhancedStreakHistory();
      if (!currentHistory) {
        currentHistory = createEmptyEnhancedStreakHistory();
      }
      
      // Create a working copy for transaction
      let workingHistory = { ...currentHistory };
      
      // Process all operations
      for (const operation of operations) {
        switch (operation.type) {
          case 'add':
            if (!operation.entry) {
              throw new StorageError(
                `Add operation for ${operation.date} missing entry data`,
                StorageErrorCode.VALIDATION_ERROR
              );
            }
            workingHistory = addReadingDayEntry(workingHistory, {
              date: operation.date,
              ...operation.entry
            });
            break;
            
          case 'update': {
            if (!operation.updates) {
              throw new StorageError(
                `Update operation for ${operation.date} missing update data`,
                StorageErrorCode.VALIDATION_ERROR
              );
            }
            
            // Find existing entry
            const existingIndex = workingHistory.readingDayEntries.findIndex(
              entry => entry.date === operation.date
            );
            if (existingIndex === -1) {
              throw new StorageError(
                `Reading day entry for ${operation.date} not found`,
                StorageErrorCode.FILE_NOT_FOUND
              );
            }
            
            // Update the entry
            const updatedEntries = [...workingHistory.readingDayEntries];
            updatedEntries[existingIndex] = {
              ...updatedEntries[existingIndex],
              ...operation.updates,
              modifiedAt: new Date()
            };
            
            workingHistory = {
              ...workingHistory,
              readingDayEntries: updatedEntries,
              lastSyncDate: new Date()
            };
            break;
          }
            
          case 'remove':
            workingHistory = removeReadingDayEntry(workingHistory, operation.date);
            break;
            
          default:
            throw new StorageError(
              `Unknown bulk operation type: ${(operation as any).type}`,
              StorageErrorCode.VALIDATION_ERROR
            );
        }
      }
      
      // Synchronize and validate final result
      workingHistory = synchronizeReadingDays(workingHistory);
      const validation = validateEnhancedStreakHistory(workingHistory);
      if (!validation.isValid) {
        throw new StorageError(
          `Bulk operation resulted in invalid data: ${validation.issues.join(', ')}`,
          StorageErrorCode.VALIDATION_ERROR
        );
      }
      
      // Commit the transaction
      const finalHistory = await this.saveEnhancedStreakHistory(workingHistory);
      return finalHistory;
      
    } finally {
      this.transactionInProgress = false;
    }
  }
}