import { Book, StreakHistory, EnhancedStreakHistory, EnhancedReadingDayEntry } from '@/types';
import {
  type StorageService,
  type ExportData,
  type ImportData,
  type UserSettings,
  type ImportOptions,
  type ImportResult,
  type BookFilter,
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

/**
 * File System Access API Storage Service
 * Provides persistent storage using the File System Access API for local file storage
 * Falls back to localStorage if File System Access API is not available
 */
export class FileSystemStorageService implements StorageService {
  private fileHandle: any | null = null;
  private settingsFileHandle: any | null = null;
  private streakFileHandle: any | null = null;
  private enhancedStreakFileHandle: any | null = null;
  private initialized = false;
  private useLocalStorage = false;
  private books: Book[] = [];
  private settings: UserSettings = this.getDefaultSettings();
  private streakHistory: StreakHistory | null = null;
  private enhancedStreakHistory: EnhancedStreakHistory | null = null;
  private nextId = 1;
  private transactionInProgress = false;

  /**
   * Check if File System Access API is supported
   */
  static isSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  /**
   * Initialize the storage service
   * Tries File System Access API first, falls back to localStorage if it fails
   */
  async initialize(): Promise<void> {
    try {
      // First try File System Access API if supported
      if (FileSystemStorageService.isSupported()) {
        try {
          await this.initializeFileSystem();
          this.useLocalStorage = false;
          this.initialized = true;
          return;
        } catch (error) {
          // File System Access API failed (user denied, no interaction, etc.)
          // Fall back to localStorage
          console.warn('File System Access API initialization failed, falling back to localStorage:', error);
        }
      }
      
      // Fallback to localStorage (either FSAPI not supported or failed)
      this.useLocalStorage = true;
      await this.initializeLocalStorage();
      this.initialized = true;
    } catch (error) {
      throw new StorageError(
        'Failed to initialize storage service',
        StorageErrorCode.INITIALIZATION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Initialize using localStorage as fallback
   */
  private async initializeLocalStorage(): Promise<void> {
    try {
      // Load books from localStorage
      const booksData = localStorage.getItem('puka-books');
      if (booksData) {
        const parsedBooks = JSON.parse(booksData);
        // Convert date strings back to Date objects
        this.books = parsedBooks.map((book: any) => ({
          ...book,
          dateAdded: new Date(book.dateAdded),
          dateModified: book.dateModified ? new Date(book.dateModified) : undefined,
          dateStarted: book.dateStarted ? new Date(book.dateStarted) : undefined,
          dateFinished: book.dateFinished ? new Date(book.dateFinished) : undefined
        }));
        this.nextId = this.books.length > 0 ? Math.max(...this.books.map(b => b.id || 0)) + 1 : 1;
      } else {
        this.books = [];
        this.nextId = 1;
      }

      // Load settings from localStorage
      const settingsData = localStorage.getItem('puka-settings');
      if (settingsData) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(settingsData) };
      } else {
        this.settings = this.getDefaultSettings();
      }

      // Load streak history from localStorage
      const streakData = localStorage.getItem('puka-streak-history');
      if (streakData) {
        const parsedStreak = JSON.parse(streakData);
        this.streakHistory = {
          ...parsedStreak,
          readingDays: new Set(parsedStreak.readingDays || []),
          lastCalculated: new Date(parsedStreak.lastCalculated),
          bookPeriods: (parsedStreak.bookPeriods || []).map((period: any) => ({
            ...period,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate)
          }))
        };
      }

      // Load enhanced streak history from localStorage
      await this.loadEnhancedStreakHistory();
    } catch (error) {
      console.warn('Failed to load data from localStorage, starting fresh', error);
      this.books = [];
      this.settings = this.getDefaultSettings();
      this.nextId = 1;
    }
  }

  /**
   * Initialize using File System Access API
   */
  private async initializeFileSystem(): Promise<void> {
    try {
      // Check if we have a saved file handle from previous session
      const savedHandles = localStorage.getItem('puka-file-handles');
      if (savedHandles) {
        const handles = JSON.parse(savedHandles);
        if (handles.dataFile && handles.settingsFile) {
          try {
            // Verify the handles are still valid
            this.fileHandle = handles.dataFile;
            this.settingsFileHandle = handles.settingsFile;
            this.streakFileHandle = handles.streakFile;
            this.enhancedStreakFileHandle = handles.enhancedStreakFile;
            
            // Try to read the files to verify access
            await this.loadBooksFromFile();
            await this.loadSettingsFromFile();
            await this.loadStreakHistoryFromFile();
            await this.loadEnhancedStreakHistory();
            return;
          } catch (error) {
            // Handles are stale, need to re-select
            console.warn('Saved file handles are stale, prompting user to re-select');
          }
        }
      }

      // First time setup or handles are stale - prompt user
      await this.promptForDataDirectory();
      
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new StorageError(
          'User cancelled file selection. Storage initialization aborted.',
          StorageErrorCode.PERMISSION_DENIED,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Prompt user to select or create data directory
   */
  private async promptForDataDirectory(): Promise<void> {
    try {
      // Try to open existing files
      const fileTypes = [{
        description: 'Puka Data Files',
        accept: { 'application/json': ['.json'] }
      }];

      try {
        // Try to open existing data file
        const [dataHandle] = await (window as any).showOpenFilePicker({
          types: fileTypes,
          excludeAcceptAllOption: true,
          multiple: false
        });

        this.fileHandle = dataHandle;
        await this.loadBooksFromFile();

        // Look for settings file in the same directory
        try {
          const [settingsHandle] = await (window as any).showOpenFilePicker({
            types: fileTypes,
            excludeAcceptAllOption: true,
            multiple: false,
            suggestedName: 'puka-settings.json'
          });
          
          this.settingsFileHandle = settingsHandle;
          await this.loadSettingsFromFile();
        } catch {
          // Settings file doesn't exist, create it
          await this.createSettingsFile();
        }

        // Look for streak history file
        try {
          const [streakHandle] = await (window as any).showOpenFilePicker({
            types: fileTypes,
            excludeAcceptAllOption: true,
            multiple: false,
            suggestedName: 'puka-streak-history.json'
          });
          
          this.streakFileHandle = streakHandle;
          await this.loadStreakHistoryFromFile();
        } catch {
          // Streak history file doesn't exist, initialize empty
          this.streakHistory = null;
        }

      } catch (openError) {
        // No existing file, create new ones
        await this.createNewDataFiles();
      }

      // Save handles for next session
      this.saveFileHandles();

    } catch (error) {
      throw new StorageError(
        'Failed to set up data directory',
        StorageErrorCode.PERMISSION_DENIED,
        error as Error
      );
    }
  }

  /**
   * Create new data files
   */
  private async createNewDataFiles(): Promise<void> {
    // Create data file
    this.fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: 'puka-books.json',
      types: [{
        description: 'Puka Data Files',
        accept: { 'application/json': ['.json'] }
      }]
    });

    // Create settings file
    this.settingsFileHandle = await (window as any).showSaveFilePicker({
      suggestedName: 'puka-settings.json',
      types: [{
        description: 'Puka Settings Files',
        accept: { 'application/json': ['.json'] }
      }]
    });

    // Initialize with empty data
    this.books = [];
    this.settings = this.getDefaultSettings();
    this.streakHistory = null;
    
    await this.saveBooksToFile();
    await this.saveSettingsToFile();
  }

  /**
   * Create settings file
   */
  private async createSettingsFile(): Promise<void> {
    this.settingsFileHandle = await (window as any).showSaveFilePicker({
      suggestedName: 'puka-settings.json',
      types: [{
        description: 'Puka Settings Files',
        accept: { 'application/json': ['.json'] }
      }]
    });

    this.settings = this.getDefaultSettings();
    await this.saveSettingsToFile();
  }

  /**
   * Save file handles to localStorage for next session
   */
  private saveFileHandles(): void {
    if (this.fileHandle && this.settingsFileHandle) {
      localStorage.setItem('puka-file-handles', JSON.stringify({
        dataFile: this.fileHandle,
        settingsFile: this.settingsFileHandle,
        streakFile: this.streakFileHandle,
        enhancedStreakFile: this.enhancedStreakFileHandle
      }));
    }
  }

  /**
   * Load books from file
   */
  private async loadBooksFromFile(): Promise<void> {
    if (!this.fileHandle) {
      throw new StorageError('No file handle available', StorageErrorCode.FILE_NOT_FOUND);
    }

    try {
      const file = await this.fileHandle.getFile();
      const content = await file.text();
      
      if (content.trim()) {
        const data = JSON.parse(content);
        // Convert date strings back to Date objects (same as localStorage initialization)
        this.books = (data.books || []).map((book: any) => ({
          ...book,
          dateAdded: new Date(book.dateAdded),
          dateModified: book.dateModified ? new Date(book.dateModified) : undefined,
          dateStarted: book.dateStarted ? new Date(book.dateStarted) : undefined,
          dateFinished: book.dateFinished ? new Date(book.dateFinished) : undefined
        }));
        this.nextId = this.books.length > 0 ? Math.max(...this.books.map(b => b.id || 0)) + 1 : 1;
      } else {
        this.books = [];
        this.nextId = 1;
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageError(
          'Invalid JSON in data file',
          StorageErrorCode.INVALID_DATA,
          error
        );
      }
      throw new StorageError(
        'Failed to load books from file',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Save books to file
   */
  private async saveBooksToFile(): Promise<void> {
    if (this.useLocalStorage) {
      localStorage.setItem('puka-books', JSON.stringify(this.books));
      return;
    }

    if (!this.fileHandle) {
      throw new StorageError('No file handle available', StorageErrorCode.FILE_NOT_FOUND);
    }

    try {
      const writable = await this.fileHandle.createWritable();
      const data = {
        books: this.books,
        metadata: {
          lastModified: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (error) {
      throw new StorageError(
        'Failed to save books to file',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Load settings from file
   */
  private async loadSettingsFromFile(): Promise<void> {
    if (!this.settingsFileHandle) {
      this.settings = this.getDefaultSettings();
      return;
    }

    try {
      const file = await this.settingsFileHandle.getFile();
      const content = await file.text();
      
      if (content.trim()) {
        const data = JSON.parse(content);
        this.settings = { ...this.getDefaultSettings(), ...data };
      } else {
        this.settings = this.getDefaultSettings();
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults');
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * Save settings to file
   */
  private async saveSettingsToFile(): Promise<void> {
    if (this.useLocalStorage) {
      localStorage.setItem('puka-settings', JSON.stringify(this.settings));
      return;
    }

    if (!this.settingsFileHandle) {
      return; // No settings file handle, skip saving
    }

    try {
      const writable = await this.settingsFileHandle.createWritable();
      await writable.write(JSON.stringify(this.settings, null, 2));
      await writable.close();
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  /**
   * Load streak history from file
   */
  private async loadStreakHistoryFromFile(): Promise<void> {
    if (!this.streakFileHandle) {
      this.streakHistory = null;
      return;
    }

    try {
      const file = await this.streakFileHandle.getFile();
      const content = await file.text();
      
      if (content.trim()) {
        const data = JSON.parse(content);
        this.streakHistory = {
          ...data,
          readingDays: new Set(data.readingDays || []),
          lastCalculated: new Date(data.lastCalculated),
          bookPeriods: (data.bookPeriods || []).map((period: any) => ({
            ...period,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate)
          }))
        };
      } else {
        this.streakHistory = null;
      }
    } catch (error) {
      console.warn('Failed to load streak history, initializing empty');
      this.streakHistory = null;
    }
  }

  /**
   * Save streak history to file
   */
  private async saveStreakHistoryToFile(): Promise<void> {
    if (this.useLocalStorage) {
      if (this.streakHistory) {
        const serializable = {
          ...this.streakHistory,
          readingDays: Array.from(this.streakHistory.readingDays)
        };
        localStorage.setItem('puka-streak-history', JSON.stringify(serializable));
      } else {
        localStorage.removeItem('puka-streak-history');
      }
      return;
    }

    if (!this.streakFileHandle) {
      return; // No streak file handle, skip saving
    }

    try {
      const writable = await this.streakFileHandle.createWritable();
      if (this.streakHistory) {
        const serializable = {
          ...this.streakHistory,
          readingDays: Array.from(this.streakHistory.readingDays)
        };
        await writable.write(JSON.stringify(serializable, null, 2));
      } else {
        await writable.write('{}');
      }
      await writable.close();
    } catch (error) {
      console.warn('Failed to save streak history:', error);
    }
  }

  /**
   * Load enhanced streak history from file/localStorage
   */
  private async loadEnhancedStreakHistory(): Promise<void> {
    if (this.useLocalStorage) {
      const data = localStorage.getItem('puka-enhanced-streak-history');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          this.enhancedStreakHistory = {
            ...parsed,
            readingDays: new Set(parsed.readingDays || []),
            lastCalculated: new Date(parsed.lastCalculated),
            lastSyncDate: new Date(parsed.lastSyncDate),
            bookPeriods: (parsed.bookPeriods || []).map((period: any) => ({
              ...period,
              startDate: new Date(period.startDate),
              endDate: new Date(period.endDate)
            })),
            readingDayEntries: (parsed.readingDayEntries || []).map((entry: any) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              modifiedAt: new Date(entry.modifiedAt)
            }))
          };
        } catch (error) {
          console.warn('Failed to parse enhanced streak history from localStorage:', error);
          this.enhancedStreakHistory = null;
        }
      }
      return;
    }

    if (!this.enhancedStreakFileHandle) {
      return; // No enhanced streak file handle
    }

    try {
      const file = await this.enhancedStreakFileHandle.getFile();
      const content = await file.text();
      
      if (content.trim()) {
        const data = JSON.parse(content);
        this.enhancedStreakHistory = {
          ...data,
          readingDays: new Set(data.readingDays || []),
          lastCalculated: new Date(data.lastCalculated),
          lastSyncDate: new Date(data.lastSyncDate),
          bookPeriods: (data.bookPeriods || []).map((period: any) => ({
            ...period,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate)
          })),
          readingDayEntries: (data.readingDayEntries || []).map((entry: any) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            modifiedAt: new Date(entry.modifiedAt)
          }))
        };
      } else {
        this.enhancedStreakHistory = null;
      }
    } catch (error) {
      console.warn('Failed to load enhanced streak history, initializing empty');
      this.enhancedStreakHistory = null;
    }
  }

  /**
   * Save enhanced streak history to file/localStorage
   */
  private async saveEnhancedStreakHistoryToFile(): Promise<void> {
    if (this.useLocalStorage) {
      if (this.enhancedStreakHistory) {
        const serializable = {
          ...this.enhancedStreakHistory,
          readingDays: Array.from(this.enhancedStreakHistory.readingDays)
        };
        localStorage.setItem('puka-enhanced-streak-history', JSON.stringify(serializable));
      } else {
        localStorage.removeItem('puka-enhanced-streak-history');
      }
      return;
    }

    if (!this.enhancedStreakFileHandle) {
      // Try to create the file handle
      try {
        this.enhancedStreakFileHandle = await (window as any).showSaveFilePicker({
          suggestedName: 'puka-enhanced-streak-history.json',
          types: [{
            description: 'Puka Enhanced Streak History Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        this.saveFileHandles();
      } catch (error) {
        console.warn('Could not create enhanced streak history file:', error);
        return;
      }
    }

    try {
      const writable = await this.enhancedStreakFileHandle.createWritable();
      if (this.enhancedStreakHistory) {
        const serializable = {
          ...this.enhancedStreakHistory,
          readingDays: Array.from(this.enhancedStreakHistory.readingDays)
        };
        await writable.write(JSON.stringify(serializable, null, 2));
      } else {
        await writable.write('{}');
      }
      await writable.close();
    } catch (error) {
      console.warn('Failed to save enhanced streak history:', error);
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): UserSettings {
    return {
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

  /**
   * Ensure storage is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage service not initialized',
        StorageErrorCode.INITIALIZATION_FAILED
      );
    }
  }

  // StorageService implementation

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
      dateAdded: new Date(),
      dateModified: new Date()
    };

    this.books.push(book);
    await this.saveBooksToFile();
    
    return book;
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    this.ensureInitialized();
    
    const index = this.books.findIndex(book => book.id === id);
    if (index === -1) {
      throw new StorageError(
        `Book with ID ${id} not found`,
        StorageErrorCode.FILE_NOT_FOUND
      );
    }

    const updatedBook = {
      ...this.books[index],
      ...updates,
      id, // Ensure ID doesn't change
      dateModified: new Date()
    };

    this.books[index] = updatedBook;
    await this.saveBooksToFile();
    
    return updatedBook;
  }

  async deleteBook(id: number): Promise<boolean> {
    this.ensureInitialized();
    
    const index = this.books.findIndex(book => book.id === id);
    if (index === -1) {
      return false;
    }

    this.books.splice(index, 1);
    await this.saveBooksToFile();
    
    return true;
  }

  async getSettings(): Promise<UserSettings> {
    this.ensureInitialized();
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    this.ensureInitialized();
    
    this.settings = { ...this.settings, ...updates };
    await this.saveSettingsToFile();
    
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
      settings: { ...this.settings },
      streakHistory: this.streakHistory ? {
        ...this.streakHistory,
        readingDays: new Set(this.streakHistory.readingDays)
      } : undefined
    };
  }

  async importData(data: ImportData, options: ImportOptions = {
    mergeDuplicates: true,
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

    for (let i = 0; i < data.books.length; i++) {
      const bookData = data.books[i];
      
      try {
        if (options.validateData) {
          this.validateBookData(bookData);
        }

        // Check for duplicates
        const existing = this.books.find(b => 
          b.title.toLowerCase() === bookData.title.toLowerCase() &&
          b.author.toLowerCase() === bookData.author.toLowerCase()
        );

        if (existing) {
          result.duplicates++;
          if (!options.overwriteExisting) {
            result.skipped++;
            continue;
          }
        }

        // Import the book
        if ('id' in bookData && bookData.id) {
          // Update existing book
          if (existing) {
            await this.updateBook(existing.id!, bookData);
          } else {
            const newBook = { ...bookData, id: this.nextId++, dateAdded: new Date() };
            this.books.push(newBook as Book);
          }
        } else {
          // Create new book
          await this.saveBook(bookData);
        }
        
        result.imported++;
      } catch (error) {
        result.errors.push({
          row: i,
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: bookData
        });
        
        if (!options.skipInvalid) {
          result.success = false;
          break;
        }
        
        result.skipped++;
      }
    }

    if (data.settings) {
      await this.updateSettings(data.settings);
    }

    if (data.streakHistory) {
      await this.saveStreakHistory({
        ...data.streakHistory,
        readingDays: new Set(Array.from(data.streakHistory.readingDays || [])),
        lastCalculated: new Date()
      });
    }

    await this.saveBooksToFile();
    return result;
  }

  /**
   * Validate book data for import
   */
  private validateBookData(book: any): void {
    if (!book.title || typeof book.title !== 'string') {
      throw new StorageError('Invalid or missing title', StorageErrorCode.VALIDATION_ERROR);
    }
    
    if (!book.author || typeof book.author !== 'string') {
      throw new StorageError('Invalid or missing author', StorageErrorCode.VALIDATION_ERROR);
    }

    if (book.progress !== undefined && (typeof book.progress !== 'number' || book.progress < 0 || book.progress > 100)) {
      throw new StorageError('Invalid progress value', StorageErrorCode.VALIDATION_ERROR);
    }
  }

  async searchBooks(query: string): Promise<Book[]> {
    this.ensureInitialized();
    
    if (!query.trim()) {
      return [...this.books];
    }

    const searchTerm = query.toLowerCase();
    return this.books.filter(book =>
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      (book.notes && book.notes.toLowerCase().includes(searchTerm))
    );
  }

  async getFilteredBooks(filter: BookFilter): Promise<Book[]> {
    this.ensureInitialized();
    
    let filtered = [...this.books];

    // Filter by status
    if (filter.status && filter.status !== 'all') {
      filtered = filtered.filter(book => book.status === filter.status);
    }

    // Filter by search
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        (book.notes && book.notes.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by date range
    if (filter.dateRange) {
      filtered = filtered.filter(book => {
        const bookDate = new Date(book.dateAdded);
        return bookDate >= filter.dateRange!.start && bookDate <= filter.dateRange!.end;
      });
    }

    // Sort
    if (filter.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (filter.sortBy) {
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'author':
            aVal = a.author.toLowerCase();
            bVal = b.author.toLowerCase();
            break;
          case 'progress':
            aVal = a.progress || 0;
            bVal = b.progress || 0;
            break;
          case 'dateFinished':
            aVal = a.dateFinished ? new Date(a.dateFinished).getTime() : 0;
            bVal = b.dateFinished ? new Date(b.dateFinished).getTime() : 0;
            break;
          default: // dateAdded
            aVal = new Date(a.dateAdded).getTime();
            bVal = new Date(b.dateAdded).getTime();
        }

        if (aVal < bVal) return filter.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return filter.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Pagination
    if (filter.offset !== undefined) {
      const start = filter.offset;
      const end = filter.limit ? start + filter.limit : undefined;
      filtered = filtered.slice(start, end);
    } else if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
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
      const data = JSON.parse(backupData);
      await this.importData(data, {
        mergeDuplicates: false,
        overwriteExisting: true,
        validateData: true,
        skipInvalid: false
      });
    } catch (error) {
      throw new StorageError(
        'Failed to restore from backup',
        StorageErrorCode.RESTORE_FAILED,
        error as Error
      );
    }
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
      readingDays: new Set(streakHistory.readingDays),
      lastCalculated: new Date()
    };
    
    await this.saveStreakHistoryToFile();
    
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
    
    await this.saveStreakHistoryToFile();
    
    return {
      ...this.streakHistory,
      readingDays: new Set(this.streakHistory.readingDays)
    };
  }

  async clearStreakHistory(): Promise<void> {
    this.ensureInitialized();
    
    this.streakHistory = null;
    await this.saveStreakHistoryToFile();
  }

  async markReadingDay(): Promise<StreakHistory> {
    this.ensureInitialized();
    
    // Get or create streak history
    let currentHistory = this.streakHistory;
    if (!currentHistory) {
      // Auto-create from existing books if no history exists
      const booksWithReadingPeriods = this.books.filter(book => 
        book.dateStarted && book.dateFinished
      );
      
      if (booksWithReadingPeriods.length > 0) {
        const { createStreakHistoryFromBooks } = await import('../../utils/streakCalculator');
        currentHistory = createStreakHistoryFromBooks(this.books);
      } else {
        currentHistory = {
          readingDays: new Set<string>(),
          bookPeriods: [],
          lastCalculated: new Date()
        };
      }
    }
    
    // Add today to reading days
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    currentHistory.readingDays.add(todayISO);
    currentHistory.lastCalculated = new Date();
    
    // Save updated history
    this.streakHistory = currentHistory;
    await this.saveStreakHistoryToFile();
    
    return {
      ...currentHistory,
      readingDays: new Set(currentHistory.readingDays)
    };
  }

  // Enhanced streak history methods - Phase 1.3 implementation
  
  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    this.ensureInitialized();
    
    if (this.enhancedStreakHistory) {
      return JSON.parse(JSON.stringify(this.enhancedStreakHistory));
    }
    
    // Try to load from file/storage
    await this.loadEnhancedStreakHistory();
    
    // If still null, try migration from legacy data
    if (!this.enhancedStreakHistory && this.streakHistory) {
      return await this.migrateToEnhancedStreakHistory();
    }
    
    if (this.enhancedStreakHistory && typeof this.enhancedStreakHistory === 'object') {
      return JSON.parse(JSON.stringify(this.enhancedStreakHistory));
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
    
    await this.saveEnhancedStreakHistoryToFile();
    
    return JSON.parse(JSON.stringify(this.enhancedStreakHistory));
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
      return JSON.parse(JSON.stringify(this.enhancedStreakHistory));
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
      
      return JSON.parse(JSON.stringify(migratedHistory));
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
            
          case 'update':
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
      
    } catch (error) {
      // Rollback - in this case, we don't need to do anything since we
      // never saved the intermediate state
      throw error;
    } finally {
      this.transactionInProgress = false;
    }
  }
}