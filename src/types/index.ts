export interface Book {
  id: number;
  title: string;
  author: string;
  status: 'want_to_read' | 'currently_reading' | 'finished';
  progress: number; // 0-100
  notes?: string;
  dateAdded: Date;
  dateModified?: Date;
  dateStarted?: Date;
  dateFinished?: Date;
  isbn?: string;
  coverUrl?: string;
  tags?: string[];
  rating?: number;
  totalPages?: number;
  currentPage?: number;
  genre?: string;
  publishedDate?: string;
}

export interface ReadingSession {
  id: number;
  bookId: number;
  startTime: Date;
  endTime: Date;
  pagesRead: number;
  notes?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
  dailyGoal: number;
  todayProgress: number;
  hasReadToday: boolean;
}

export interface ReadingPeriod {
  bookId: number;
  title: string;
  author: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export interface StreakImportResult {
  periodsProcessed: number;
  daysAdded: number;
  readingDaysGenerated: Set<string>; // ISO date strings
  newCurrentStreak: number;
  newLongestStreak: number;
  oldCurrentStreak: number;
  oldLongestStreak: number;
}

/**
 * Enhanced reading day entry with detailed tracking information
 * Used for Phase 1.1 reading history management and analytics
 */
export interface EnhancedReadingDayEntry {
  /** Date in YYYY-MM-DD format for consistency and sorting */
  date: string;
  /** Source of the reading day entry for audit trails */
  source: 'manual' | 'book' | 'progress';
  /** Associated book IDs for this reading session (optional) */
  bookIds?: number[];
  /** Optional user notes about the reading session */
  notes?: string;
  /** Timestamp when this entry was originally created */
  createdAt: Date;
  /** Timestamp when this entry was last modified */
  modifiedAt: Date;
}

/**
 * Basic streak history interface for backward compatibility
 * @deprecated Use EnhancedStreakHistory for new implementations
 */
export interface StreakHistory {
  readingDays: Set<string>; // ISO date strings (YYYY-MM-DD format)
  bookPeriods: ReadingPeriod[];
  lastCalculated: Date;
}

/**
 * Enhanced streak history with detailed reading day entries and versioning
 * Extends the basic StreakHistory for backward compatibility
 */
export interface EnhancedStreakHistory extends StreakHistory {
  /** Detailed reading day entries with rich metadata */
  readingDayEntries: EnhancedReadingDayEntry[];
  /** Last synchronization date for data integrity */
  lastSyncDate: Date;
  /** Data model version for migration management */
  version: number;
}

export type StatusFilter = 'all' | 'want_to_read' | 'currently_reading' | 'finished';

export interface FilterOptions {
  status?: StatusFilter;
  search?: string;
  genre?: string;
  rating?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: (bookId: number) => void;
  condition?: (book: Book) => boolean;
}

/**
 * Migration status for data model upgrades
 */
export interface MigrationStatus {
  /** Whether migration is needed */
  migrationNeeded: boolean;
  /** Current data version */
  currentVersion: number;
  /** Target data version */
  targetVersion: number;
  /** Migration operation details */
  details: string;
  /** Estimated time for migration */
  estimatedTime?: string;
}

/**
 * Result of a data migration operation
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Number of records migrated */
  recordsMigrated: number;
  /** Any errors encountered during migration */
  errors: string[];
  /** Migration execution time in milliseconds */
  executionTime: number;
  /** Final data version after migration */
  finalVersion: number;
}

/**
 * Legacy reading day entry format for backward compatibility
 * Used by existing ReadingDataService - will be migrated in Phase 1.2
 */
export interface ReadingDayEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  sources: ReadingDataSource[];
  bookIds: number[];
  notes?: string;
}

/**
 * Legacy reading data source format for backward compatibility
 * Used by existing ReadingDataService - will be migrated in Phase 1.2
 */
export interface ReadingDataSource {
  type: 'manual' | 'book_completion' | 'progress_update';
  timestamp: Date;
  bookId?: number;
  metadata?: {
    progress?: number;
    pages?: number;
    [key: string]: any;
  };
}

/**
 * Legacy reading day map type for backward compatibility
 * Used by existing ReadingDataService - will be migrated in Phase 1.2
 */
export type ReadingDayMap = Map<string, ReadingDayEntry>;

