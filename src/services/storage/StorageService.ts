import { Book } from '@/types';

export interface ExportData {
  books: Book[];
  metadata: {
    exportDate: string;
    version: string;
    totalBooks: number;
  };
  settings?: UserSettings;
}

export interface ImportData {
  books: Book[];
  settings?: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  dailyReadingGoal: number;
  defaultView: 'grid' | 'list';
  sortBy: 'dateAdded' | 'title' | 'author' | 'progress';
  sortOrder: 'asc' | 'desc';
  notificationsEnabled: boolean;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface StorageService {
  /**
   * Initialize the storage service
   * @throws {StorageError} When initialization fails
   */
  initialize(): Promise<void>;

  /**
   * Get all books from storage
   * @returns Promise resolving to array of books
   * @throws {StorageError} When books cannot be retrieved
   */
  getBooks(): Promise<Book[]>;

  /**
   * Get a specific book by ID
   * @param id - Book ID
   * @returns Promise resolving to book or null if not found
   * @throws {StorageError} When book cannot be retrieved
   */
  getBook(id: number): Promise<Book | null>;

  /**
   * Save a new book to storage
   * @param book - Book data to save
   * @returns Promise resolving to saved book with generated ID
   * @throws {StorageError} When book cannot be saved
   */
  saveBook(book: Omit<Book, 'id' | 'dateAdded'>): Promise<Book>;

  /**
   * Update an existing book
   * @param id - Book ID to update
   * @param updates - Partial book data to update
   * @returns Promise resolving to updated book
   * @throws {StorageError} When book cannot be updated
   */
  updateBook(id: number, updates: Partial<Book>): Promise<Book>;

  /**
   * Delete a book from storage
   * @param id - Book ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   * @throws {StorageError} When book cannot be deleted
   */
  deleteBook(id: number): Promise<boolean>;

  /**
   * Get user settings
   * @returns Promise resolving to user settings
   * @throws {StorageError} When settings cannot be retrieved
   */
  getSettings(): Promise<UserSettings>;

  /**
   * Update user settings
   * @param settings - Partial settings to update
   * @returns Promise resolving to updated settings
   * @throws {StorageError} When settings cannot be updated
   */
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>;

  /**
   * Export all data for backup/migration
   * @returns Promise resolving to export data
   * @throws {StorageError} When data cannot be exported
   */
  exportData(): Promise<ExportData>;

  /**
   * Import data from backup/migration
   * @param data - Import data
   * @param options - Import options
   * @returns Promise resolving to import result
   * @throws {StorageError} When data cannot be imported
   */
  importData(data: ImportData, options?: ImportOptions): Promise<ImportResult>;

  /**
   * Search books by query
   * @param query - Search query
   * @returns Promise resolving to matching books
   * @throws {StorageError} When search fails
   */
  searchBooks(query: string): Promise<Book[]>;

  /**
   * Get books with filtering and sorting
   * @param filter - Filter options
   * @returns Promise resolving to filtered books
   * @throws {StorageError} When filtering fails
   */
  getFilteredBooks(filter: BookFilter): Promise<Book[]>;

  /**
   * Backup data to file
   * @returns Promise resolving to backup success
   * @throws {StorageError} When backup fails
   */
  createBackup(): Promise<string>;

  /**
   * Restore data from backup file
   * @param backupData - Backup data to restore
   * @returns Promise resolving to restore success
   * @throws {StorageError} When restore fails
   */
  restoreBackup(backupData: string): Promise<void>;
}

export interface ImportOptions {
  mergeDuplicates: boolean;
  overwriteExisting: boolean;
  validateData: boolean;
  skipInvalid: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  duplicates: number;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export interface BookFilter {
  status?: Book['status'] | 'all';
  search?: string;
  genre?: string;
  rating?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'dateAdded' | 'title' | 'author' | 'progress' | 'dateFinished';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export enum StorageErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  BACKUP_FAILED = 'BACKUP_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED'
}

export interface StorageAdapter {
  name: string;
  isSupported(): boolean;
  initialize(): Promise<void>;
  read(key: string): Promise<string | null>;
  write(key: string, data: string): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
}