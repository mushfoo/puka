import { Book } from '@/types';
import {
  type StorageService,
  type ExportData,
  type ImportData,
  type UserSettings,
  type ImportOptions,
  type ImportResult,
  type BookFilter,
  StorageError,
  StorageErrorCode
} from './StorageService';

/**
 * File System Access API Storage Service
 * Provides persistent storage using the File System Access API for local file storage
 * Falls back to localStorage if File System Access API is not available
 */
export class FileSystemStorageService implements StorageService {
  private fileHandle: any | null = null;
  private settingsFileHandle: any | null = null;
  private initialized = false;
  private useLocalStorage = false;
  private books: Book[] = [];
  private settings: UserSettings = this.getDefaultSettings();
  private nextId = 1;

  /**
   * Check if File System Access API is supported
   */
  static isSupported(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  /**
   * Initialize the storage service
   * Prompts user to select data directory on first run
   */
  async initialize(): Promise<void> {
    try {
      this.useLocalStorage = !FileSystemStorageService.isSupported();
      
      if (this.useLocalStorage) {
        await this.initializeLocalStorage();
      } else {
        await this.initializeFileSystem();
      }
      
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
            
            // Try to read the files to verify access
            await this.loadBooksFromFile();
            await this.loadSettingsFromFile();
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
        settingsFile: this.settingsFileHandle
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
        this.books = data.books || [];
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
      settings: { ...this.settings }
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
}