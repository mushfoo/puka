import { Book, StreakHistory, EnhancedStreakHistory } from '@/types';
import { StorageService, ExportData, ImportOptions } from '@/services/storage';
import { migrateStreakHistory } from '@/utils/streakMigration';

/**
 * Legacy streak history format from localStorage
 */
export interface LegacyStreakHistory {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
  readingDays: string[];
  totalDaysRead: number;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  phase: 'idle' | 'detecting' | 'validating' | 'migrating' | 'complete' | 'error';
  progress: number; // 0-100
  totalItems: number;
  processedItems: number;
  errors: string[];
}

/**
 * Local storage data structure
 */
export interface LocalStorageData {
  books?: Book[];
  streakHistory?: LegacyStreakHistory;
  settings?: Record<string, any>;
  version?: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  succeeded: number;
  failed: number;
  errors: string[];
  migratedBooks: Book[];
  migratedStreakHistory: EnhancedStreakHistory | null;
}

/**
 * Migration options
 */
export interface MigrationOptions extends Partial<ImportOptions> {
  preserveIds?: boolean;
  migrateStreaks?: boolean;
  clearLocalStorageAfter?: boolean;
}

/**
 * DataMigrationService - Handles migration of data from localStorage to database storage
 */
export class DataMigrationService {
  private static readonly LOCAL_STORAGE_KEYS = {
    BOOKS: 'puka_books',
    STREAK_HISTORY: 'puka_streak_history',
    SETTINGS: 'puka_settings',
    MIGRATION_STATUS: 'puka_migration_status',
    MIGRATION_BACKUP: 'puka_migration_backup'
  };

  private status: MigrationStatus = {
    phase: 'idle',
    progress: 0,
    totalItems: 0,
    processedItems: 0,
    errors: []
  };

  private statusCallbacks: ((status: MigrationStatus) => void)[] = [];

  constructor(private targetStorage: StorageService) {}

  /**
   * Subscribe to migration status updates
   */
  public onStatusChange(callback: (status: MigrationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Detect if local storage has data to migrate
   */
  public async detectLocalData(): Promise<LocalStorageData | null> {
    this.updateStatus({ phase: 'detecting', progress: 0 });

    try {
      const data: LocalStorageData = {};
      let hasData = false;

      // Check for books
      const booksJson = localStorage.getItem(DataMigrationService.LOCAL_STORAGE_KEYS.BOOKS);
      if (booksJson) {
        try {
          const books = JSON.parse(booksJson);
          if (Array.isArray(books) && books.length > 0) {
            data.books = books;
            hasData = true;
          }
        } catch (error) {
          console.error('Failed to parse books from localStorage:', error);
          this.addError('Failed to read books data from local storage');
        }
      }

      // Check for streak history
      const streakJson = localStorage.getItem(DataMigrationService.LOCAL_STORAGE_KEYS.STREAK_HISTORY);
      if (streakJson) {
        try {
          const streakHistory = JSON.parse(streakJson);
          if (streakHistory && typeof streakHistory === 'object') {
            data.streakHistory = streakHistory;
            hasData = true;
          }
        } catch (error) {
          console.error('Failed to parse streak history from localStorage:', error);
          this.addError('Failed to read streak history from local storage');
        }
      }

      // Check for settings
      const settingsJson = localStorage.getItem(DataMigrationService.LOCAL_STORAGE_KEYS.SETTINGS);
      if (settingsJson) {
        try {
          const settings = JSON.parse(settingsJson);
          if (settings && typeof settings === 'object') {
            data.settings = settings;
            hasData = true;
          }
        } catch (error) {
          console.error('Failed to parse settings from localStorage:', error);
          this.addError('Failed to read settings from local storage');
        }
      }

      this.updateStatus({ progress: 100 });
      return hasData ? data : null;
    } catch (error) {
      console.error('Error detecting local data:', error);
      this.updateStatus({ phase: 'error' });
      return null;
    }
  }

  /**
   * Validate and sanitize data before migration
   */
  public async validateData(data: LocalStorageData): Promise<LocalStorageData> {
    this.updateStatus({ phase: 'validating', progress: 0 });

    const validated: LocalStorageData = {};
    const totalSteps = 3;
    let currentStep = 0;

    // Validate books
    if (data.books) {
      validated.books = this.validateBooks(data.books);
      currentStep++;
      this.updateStatus({ progress: (currentStep / totalSteps) * 100 });
    }

    // Validate streak history
    if (data.streakHistory) {
      validated.streakHistory = this.validateStreakHistory(data.streakHistory);
      currentStep++;
      this.updateStatus({ progress: (currentStep / totalSteps) * 100 });
    }

    // Validate settings
    if (data.settings) {
      validated.settings = this.validateSettings(data.settings);
      currentStep++;
      this.updateStatus({ progress: (currentStep / totalSteps) * 100 });
    }

    return validated;
  }

  /**
   * Perform the migration
   */
  public async migrate(
    data: LocalStorageData,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    this.updateStatus({ 
      phase: 'migrating', 
      progress: 0,
      totalItems: (data.books?.length || 0) + (data.streakHistory ? 1 : 0),
      processedItems: 0
    });

    const result: MigrationResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
      migratedBooks: [],
      migratedStreakHistory: null
    };

    try {
      // Create backup before migration
      await this.createBackup(data);

      // Migrate books
      if (data.books && data.books.length > 0) {
        const bookResult = await this.migrateBooks(data.books, options);
        result.succeeded += bookResult.succeeded;
        result.failed += bookResult.failed;
        result.errors.push(...bookResult.errors);
        result.migratedBooks = bookResult.migratedBooks;
      }

      // Migrate streak history
      if (data.streakHistory && options.migrateStreaks !== false) {
        const streakResult = await this.migrateStreakHistory(data.streakHistory);
        if (streakResult) {
          result.migratedStreakHistory = streakResult;
          result.succeeded += 1;
        } else {
          result.failed += 1;
          result.errors.push('Failed to migrate streak history');
        }
      }

      // Clear local storage if requested and migration was successful
      if (options.clearLocalStorageAfter && result.failed === 0) {
        await this.clearLocalStorage();
      }

      this.updateStatus({ phase: 'complete', progress: 100 });
      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      this.updateStatus({ phase: 'error' });
      result.errors.push(error instanceof Error ? error.message : 'Migration failed');
      return result;
    }
  }

  /**
   * Get current migration status from localStorage
   */
  public getMigrationStatus(): string | null {
    return localStorage.getItem(DataMigrationService.LOCAL_STORAGE_KEYS.MIGRATION_STATUS);
  }

  /**
   * Set migration status in localStorage
   */
  public setMigrationStatus(status: 'pending' | 'completed' | 'failed'): void {
    localStorage.setItem(
      DataMigrationService.LOCAL_STORAGE_KEYS.MIGRATION_STATUS,
      JSON.stringify({
        status,
        timestamp: new Date().toISOString()
      })
    );
  }

  /**
   * Rollback migration using backup
   */
  public async rollback(): Promise<boolean> {
    try {
      const backupJson = localStorage.getItem(DataMigrationService.LOCAL_STORAGE_KEYS.MIGRATION_BACKUP);
      if (!backupJson) {
        console.error('No backup found for rollback');
        return false;
      }

      const backup = JSON.parse(backupJson);
      
      // Restore original data
      if (backup.books) {
        localStorage.setItem(
          DataMigrationService.LOCAL_STORAGE_KEYS.BOOKS,
          JSON.stringify(backup.books)
        );
      }
      
      if (backup.streakHistory) {
        localStorage.setItem(
          DataMigrationService.LOCAL_STORAGE_KEYS.STREAK_HISTORY,
          JSON.stringify(backup.streakHistory)
        );
      }
      
      if (backup.settings) {
        localStorage.setItem(
          DataMigrationService.LOCAL_STORAGE_KEYS.SETTINGS,
          JSON.stringify(backup.settings)
        );
      }

      // Clear migration status
      localStorage.removeItem(DataMigrationService.LOCAL_STORAGE_KEYS.MIGRATION_STATUS);
      
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  // Private helper methods

  private updateStatus(updates: Partial<MigrationStatus>): void {
    this.status = { ...this.status, ...updates };
    this.statusCallbacks.forEach(callback => callback(this.status));
  }

  private addError(error: string): void {
    this.status.errors.push(error);
    this.updateStatus({ errors: [...this.status.errors] });
  }

  private validateBooks(books: any[]): Book[] {
    const validated: Book[] = [];

    for (const book of books) {
      try {
        // Ensure required fields
        if (!book.title || !book.author) {
          continue;
        }

        // Parse dates
        const validatedBook: Book = {
          ...book,
          dateAdded: book.dateAdded ? new Date(book.dateAdded) : new Date(),
          dateModified: book.dateModified ? new Date(book.dateModified) : new Date(),
          dateStarted: book.dateStarted ? new Date(book.dateStarted) : undefined,
          dateFinished: book.dateFinished ? new Date(book.dateFinished) : undefined,
          // Ensure numeric fields
          progress: typeof book.progress === 'number' ? book.progress : 0,
          rating: typeof book.rating === 'number' ? book.rating : undefined,
          totalPages: typeof book.totalPages === 'number' ? book.totalPages : undefined,
          currentPage: typeof book.currentPage === 'number' ? book.currentPage : undefined,
          // Ensure arrays
          tags: Array.isArray(book.tags) ? book.tags : []
        };

        validated.push(validatedBook);
      } catch (error) {
        console.error('Failed to validate book:', book, error);
        this.addError(`Failed to validate book: ${book.title || 'Unknown'}`);
      }
    }

    return validated;
  }

  private validateStreakHistory(streakHistory: any): LegacyStreakHistory {
    // Basic validation - ensure required structure
    return {
      currentStreak: typeof streakHistory.currentStreak === 'number' ? streakHistory.currentStreak : 0,
      longestStreak: typeof streakHistory.longestStreak === 'number' ? streakHistory.longestStreak : 0,
      lastReadDate: streakHistory.lastReadDate || null,
      readingDays: Array.isArray(streakHistory.readingDays) ? streakHistory.readingDays : [],
      totalDaysRead: typeof streakHistory.totalDaysRead === 'number' ? streakHistory.totalDaysRead : 0
    };
  }

  private validateSettings(settings: any): Record<string, any> {
    // Basic validation - ensure it's an object
    return typeof settings === 'object' && settings !== null ? settings : {};
  }

  private async createBackup(data: LocalStorageData): Promise<void> {
    const backup = {
      timestamp: new Date().toISOString(),
      ...data
    };
    
    localStorage.setItem(
      DataMigrationService.LOCAL_STORAGE_KEYS.MIGRATION_BACKUP,
      JSON.stringify(backup)
    );
  }

  private async migrateBooks(
    books: Book[],
    options: MigrationOptions
  ): Promise<{ succeeded: number; failed: number; errors: string[]; migratedBooks: Book[] }> {
    const result = {
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
      migratedBooks: [] as Book[]
    };

    // Import books using the storage service's import functionality
    const importData: ExportData = {
      books,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '2.0',
        totalBooks: books.length
      },
      streakHistory: undefined
    };

    try {
      const importOptions: ImportOptions = {
        mergeDuplicates: options.mergeDuplicates ?? false,
        overwriteExisting: options.overwriteExisting ?? false,
        validateData: options.validateData ?? true,
        skipInvalid: options.skipInvalid ?? true
      };
      
      const importResult = await this.targetStorage.importData(importData, importOptions);

      result.succeeded = importResult.imported;
      result.failed = importResult.skipped;
      result.errors = importResult.errors.map(e => e.message);

      // Track progress
      this.updateStatus({
        processedItems: this.status.processedItems + books.length,
        progress: ((this.status.processedItems + books.length) / this.status.totalItems) * 100
      });

      // Get migrated books
      if (result.succeeded > 0) {
        const allBooks = await this.targetStorage.getBooks();
        result.migratedBooks = allBooks.slice(-result.succeeded);
      }
    } catch (error) {
      console.error('Failed to migrate books:', error);
      result.failed = books.length;
      result.errors.push(error instanceof Error ? error.message : 'Failed to migrate books');
    }

    return result;
  }

  private async migrateStreakHistory(
    streakHistory: LegacyStreakHistory
  ): Promise<EnhancedStreakHistory | null> {
    try {
      // Convert legacy format to new StreakHistory format
      const newStreakHistory: StreakHistory = {
        readingDays: new Set(streakHistory.readingDays || []),
        bookPeriods: [],
        lastCalculated: new Date()
      };

      // Migrate to enhanced format
      const enhancedHistory = migrateStreakHistory(newStreakHistory);

      // Save to storage
      await this.targetStorage.updateEnhancedStreakHistory(enhancedHistory);

      // Update progress
      this.updateStatus({
        processedItems: this.status.processedItems + 1,
        progress: ((this.status.processedItems + 1) / this.status.totalItems) * 100
      });

      return enhancedHistory;
    } catch (error) {
      console.error('Failed to migrate streak history:', error);
      this.addError('Failed to migrate streak history');
      return null;
    }
  }

  private async clearLocalStorage(): Promise<void> {
    // Remove migrated data
    localStorage.removeItem(DataMigrationService.LOCAL_STORAGE_KEYS.BOOKS);
    localStorage.removeItem(DataMigrationService.LOCAL_STORAGE_KEYS.STREAK_HISTORY);
    localStorage.removeItem(DataMigrationService.LOCAL_STORAGE_KEYS.SETTINGS);
    
    // Keep backup for safety
    console.log('Local storage cleared after successful migration');
  }
}