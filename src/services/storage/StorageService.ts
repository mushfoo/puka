import { Book, StreakHistory, StreakImportResult, EnhancedStreakHistory, EnhancedReadingDayEntry } from '@/types';

export interface ExportData {
  books: Book[];
  metadata: {
    exportDate: string;
    version: string;
    totalBooks: number;
  };
  settings?: UserSettings;
  streakHistory?: StreakHistory;
  enhancedStreakHistory?: EnhancedStreakHistory;
}

export interface ImportData {
  books: (Omit<Book, 'id' | 'dateAdded'> | Book)[];
  settings?: Partial<UserSettings>;
  streakHistory?: StreakHistory;
  enhancedStreakHistory?: EnhancedStreakHistory;
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

  /**
   * Get streak history
   * @returns Promise resolving to streak history
   * @throws {StorageError} When streak history cannot be retrieved
   */
  getStreakHistory(): Promise<StreakHistory | null>;

  /**
   * Save streak history
   * @param streakHistory - Streak history to save
   * @returns Promise resolving to saved streak history
   * @throws {StorageError} When streak history cannot be saved
   */
  saveStreakHistory(streakHistory: StreakHistory): Promise<StreakHistory>;

  /**
   * Update streak history
   * @param updates - Partial streak history updates
   * @returns Promise resolving to updated streak history
   * @throws {StorageError} When streak history cannot be updated
   */
  updateStreakHistory(updates: Partial<StreakHistory>): Promise<StreakHistory>;

  /**
   * Clear streak history
   * @returns Promise resolving to success
   * @throws {StorageError} When streak history cannot be cleared
   */
  clearStreakHistory(): Promise<void>;

  /**
   * Manually mark today as a reading day
   * @returns Promise resolving to updated streak history
   * @throws {StorageError} When reading day cannot be added
   */
  markReadingDay(): Promise<StreakHistory>;

  /**
   * Get enhanced streak history with detailed reading day entries
   * Automatically migrates from legacy format if needed
   * @returns Promise resolving to enhanced streak history or null if none exists
   * @throws {StorageError} When enhanced streak history cannot be retrieved
   */
  getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null>;

  /**
   * Save enhanced streak history
   * @param enhancedHistory - Enhanced streak history to save
   * @returns Promise resolving to saved enhanced streak history
   * @throws {StorageError} When enhanced streak history cannot be saved
   */
  saveEnhancedStreakHistory(enhancedHistory: EnhancedStreakHistory): Promise<EnhancedStreakHistory>;

  /**
   * Update enhanced streak history
   * @param updates - Partial enhanced streak history updates
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When enhanced streak history cannot be updated
   */
  updateEnhancedStreakHistory(updates: Partial<EnhancedStreakHistory>): Promise<EnhancedStreakHistory>;

  /**
   * Add a reading day entry to the enhanced streak history
   * @param entry - Reading day entry to add (without timestamps)
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When reading day entry cannot be added
   */
  addReadingDayEntry(entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>): Promise<EnhancedStreakHistory>;

  /**
   * Update a reading day entry in the enhanced streak history
   * @param date - Date of the entry to update (YYYY-MM-DD format)
   * @param updates - Partial reading day entry updates
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When reading day entry cannot be updated
   */
  updateReadingDayEntry(date: string, updates: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>): Promise<EnhancedStreakHistory>;

  /**
   * Remove a reading day entry from the enhanced streak history
   * @param date - Date of the entry to remove (YYYY-MM-DD format)
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When reading day entry cannot be removed
   */
  removeReadingDayEntry(date: string): Promise<EnhancedStreakHistory>;

  /**
   * Get reading day entries within a date range
   * @param startDate - Start date (YYYY-MM-DD format)
   * @param endDate - End date (YYYY-MM-DD format)
   * @returns Promise resolving to reading day entries in the specified range
   * @throws {StorageError} When reading day entries cannot be retrieved
   */
  getReadingDayEntriesInRange(startDate: string, endDate: string): Promise<EnhancedReadingDayEntry[]>;

  /**
   * Migrate legacy streak history to enhanced format
   * This method handles the transition from old to new data models
   * @returns Promise resolving to migrated enhanced streak history or null if no legacy data exists
   * @throws {StorageError} When migration fails
   */
  migrateToEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null>;

  /**
   * Perform bulk operations on reading day entries
   * All operations are performed atomically - either all succeed or all fail
   * @param operations - Array of bulk operations to perform
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When any operation fails
   */
  bulkUpdateReadingDayEntries(operations: BulkReadingDayOperation[]): Promise<EnhancedStreakHistory>;
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
  streakResult?: StreakImportResult;
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

/**
 * Transaction context for database operations
 */
export interface TransactionContext {
  id: string;
  executeInTransaction: (endpoint: string, options?: globalThis.RequestInit) => Promise<Response>;
}

/**
 * Batch processing result
 */
export interface BatchResult<T> {
  batchIndex: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: T[];
  errors: Error[];
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
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  BATCH_PROCESSING_FAILED = 'BATCH_PROCESSING_FAILED',
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

export interface BulkReadingDayOperation {
  type: 'add' | 'update' | 'remove';
  date: string;
  entry?: Omit<EnhancedReadingDayEntry, 'date' | 'createdAt' | 'modifiedAt'>;
  updates?: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>;
}