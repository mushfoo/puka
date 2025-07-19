import { 
  type StorageService, 
  type UserSettings, 
  type ExportData, 
  type ImportData, 
  type ImportOptions, 
  type ImportResult, 
  type ImportError,
  type BookFilter, 
  type BulkReadingDayOperation,
  type TransactionContext,
  type BatchResult,
  StorageError, 
  StorageErrorCode 
} from './StorageService';
import { type Book, type StreakHistory, type EnhancedStreakHistory, type EnhancedReadingDayEntry } from '@/types';
import { getAppBaseUrl } from '@/lib/api/utils';
import { getSession } from '@/lib/auth-client';

/**
 * Database representation interfaces for type safety
 */
interface DbBook {
  id: string;
  title: string;
  author: string;
  status: 'unread' | 'reading' | 'completed' | 'dnf';
  progress: number;
  rating?: number;
  genre?: string;
  totalPages?: number;
  currentPage?: number;
  notes?: string;
  dateAdded: string;
  dateStarted?: string;
  dateFinished?: string;
  tags?: string[];
  isbn?: string;
  publishedDate?: string;
}

interface DbStreakHistory {
  readingDays: string[] | { [key: string]: string };
  currentStreak: number;
  longestStreak: number;
  lastReadDate?: string;
  totalDaysRead?: number;
  lastCalculated?: string;
  bookPeriods?: DbBookPeriod[];
}

interface DbEnhancedStreakHistory {
  readingDayEntries: DbReadingDayEntry[];
  readingDays: string[] | { [key: string]: string };
  bookPeriods: DbBookPeriod[];
  lastCalculated: string;
  lastSyncDate: string;
  version: number;
}

interface DbReadingDayEntry {
  date: string;
  source: 'manual' | 'book' | 'page_update';
  bookIds?: number[];
  notes?: string;
  createdAt: string;
  modifiedAt: string;
}

interface DbBookPeriod {
  bookId: number;
  title: string;
  author: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

/**
 * DatabaseStorageService - Implements StorageService interface using API calls
 * Replaces MockStorageService with real database persistence via Better-auth
 */
export class DatabaseStorageService implements StorageService {
  private baseUrl: string;
  private initialized = false;
  private sessionRefreshPromise: Promise<void> | null = null;
  
  // Transaction and batch processing constants
  private static readonly DEFAULT_BATCH_SIZE = 100;
  private static readonly MAX_BATCH_SIZE = 1000;
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.baseUrl = getAppBaseUrl();
  }

  /**
   * Initialize the storage service
   * @throws {StorageError} When initialization fails
   */
  async initialize(): Promise<void> {
    try {
      // Check if we can reach the API
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new StorageError(
          'Failed to connect to API server',
          StorageErrorCode.INITIALIZATION_FAILED
        );
      }

      // Verify authentication
      const session = await getSession();
      if (!session.data?.user) {
        throw new StorageError(
          'Authentication required for database storage',
          StorageErrorCode.PERMISSION_DENIED
        );
      }

      this.initialized = true;
      console.log('DatabaseStorageService initialized successfully');
    } catch (error) {
      console.error('DatabaseStorageService initialization failed:', error);
      throw new StorageError(
        'Failed to initialize database storage service',
        StorageErrorCode.INITIALIZATION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Authenticated fetch helper with session management
   * @param endpoint - API endpoint (relative to base URL)
   * @param options - Fetch options
   * @returns Promise resolving to Response
   */
  private async authenticatedFetch(
    endpoint: string, 
    options: globalThis.RequestInit = {}
  ): Promise<Response> {
    if (!this.initialized) {
      throw new StorageError(
        'Storage service not initialized',
        StorageErrorCode.INITIALIZATION_FAILED
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      // Make the API call
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Important for Better-auth sessions
      });

      // Handle session expiration
      if (response.status === 401) {
        console.log('Session expired, attempting refresh...');
        await this.refreshSession();
        
        // Retry the request once after session refresh
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });

        if (retryResponse.status === 401) {
          throw new StorageError(
            'Authentication failed after session refresh',
            StorageErrorCode.PERMISSION_DENIED
          );
        }

        return retryResponse;
      }

      // Handle network errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        
        throw new StorageError(
          `API request failed: ${response.status} ${response.statusText}`,
          StorageErrorCode.NETWORK_ERROR
        );
      }

      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Request: ${options.method || 'GET'} ${endpoint} - ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      // Handle network connection errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new StorageError(
          'Network connection failed - check your internet connection',
          StorageErrorCode.NETWORK_ERROR,
          error as Error
        );
      }

      throw new StorageError(
        'Unexpected error during API request',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Refresh the user session
   * @private
   */
  private async refreshSession(): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.sessionRefreshPromise) {
      return this.sessionRefreshPromise;
    }

    this.sessionRefreshPromise = this.performSessionRefresh();
    
    try {
      await this.sessionRefreshPromise;
    } finally {
      this.sessionRefreshPromise = null;
    }
  }

  /**
   * Perform the actual session refresh
   * @private
   */
  private async performSessionRefresh(): Promise<void> {
    try {
      console.log('Refreshing session...');
      
      // Check current session status
      const session = await getSession();
      
      if (!session.data?.user) {
        throw new StorageError(
          'No valid session found - please sign in again',
          StorageErrorCode.PERMISSION_DENIED
        );
      }

      // Better-auth handles session refresh automatically
      // If we reach here, the session is valid
      console.log('Session refresh successful');
      
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw new StorageError(
        'Session refresh failed - please sign in again',
        StorageErrorCode.PERMISSION_DENIED,
        error as Error
      );
    }
  }

  // =================================================================
  // TRANSACTION AND BATCH PROCESSING SUPPORT
  // =================================================================

  /**
   * Execute operations within a database transaction
   * @param operations - Function that performs operations
   * @returns Promise resolving to the result
   * @throws {StorageError} When transaction fails
   */
  async withTransaction<T>(operations: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.logRequest('POST', '/api/transaction/begin', { transactionId });

    try {
      // Begin transaction
      const beginResponse = await this.authenticatedFetch('/api/transaction/begin', {
        method: 'POST',
        body: JSON.stringify({ transactionId })
      });

      if (!beginResponse.ok) {
        throw new StorageError(
          'Failed to begin database transaction',
          StorageErrorCode.TRANSACTION_FAILED
        );
      }

      const context: TransactionContext = {
        id: transactionId,
        executeInTransaction: async (endpoint: string, options: RequestInit = {}) => {
          return this.authenticatedFetch(endpoint, {
            ...options,
            headers: {
              ...options.headers,
              'X-Transaction-Id': transactionId
            }
          });
        }
      };

      // Execute operations within transaction
      const result = await operations(context);

      // Commit transaction
      const commitResponse = await this.authenticatedFetch('/api/transaction/commit', {
        method: 'POST',
        body: JSON.stringify({ transactionId })
      });

      if (!commitResponse.ok) {
        throw new StorageError(
          'Failed to commit database transaction',
          StorageErrorCode.TRANSACTION_FAILED
        );
      }

      this.logResponse('/api/transaction/commit', { transactionId, success: true });
      return result;

    } catch (error) {
      // Rollback transaction on error
      try {
        await this.authenticatedFetch('/api/transaction/rollback', {
          method: 'POST',
          body: JSON.stringify({ transactionId })
        });
        this.logResponse('/api/transaction/rollback', { transactionId, error: error.message });
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }

      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorCode.TRANSACTION_FAILED,
        error as Error
      );
    }
  }

  /**
   * Process items in batches with retry logic
   * @param items - Array of items to process
   * @param processor - Function to process each batch
   * @param batchSize - Size of each batch (default: 100)
   * @returns Promise resolving to array of results
   */
  async processBatches<T, R>(
    items: T[],
    processor: (batch: T[], batchIndex: number) => Promise<R>,
    batchSize: number = DatabaseStorageService.DEFAULT_BATCH_SIZE
  ): Promise<R[]> {
    const effectiveBatchSize = Math.min(batchSize, DatabaseStorageService.MAX_BATCH_SIZE);
    const batches: T[][] = [];
    
    // Split items into batches
    for (let i = 0; i < items.length; i += effectiveBatchSize) {
      batches.push(items.slice(i, i + effectiveBatchSize));
    }

    const results: R[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts < DatabaseStorageService.MAX_RETRY_ATTEMPTS) {
        try {
          const result = await processor(batch, i);
          results.push(result);
          break; // Success, move to next batch
        } catch (error) {
          attempts++;
          lastError = error as Error;
          
          if (attempts < DatabaseStorageService.MAX_RETRY_ATTEMPTS) {
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempts) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.warn(`Batch ${i + 1} failed, retrying in ${delay}ms (attempt ${attempts})`);
          }
        }
      }

      if (attempts >= DatabaseStorageService.MAX_RETRY_ATTEMPTS) {
        throw new StorageError(
          `Batch processing failed after ${DatabaseStorageService.MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
          StorageErrorCode.BATCH_PROCESSING_FAILED,
          lastError
        );
      }
    }

    return results;
  }

  /**
   * Log API requests and responses for debugging
   * @private
   */
  private logRequest(method: string, endpoint: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DatabaseStorageService] ${method} ${endpoint}`, data ? { data } : '');
    }
  }

  /**
   * Log API responses for debugging
   * @private
   */
  private logResponse(endpoint: string, response: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DatabaseStorageService] Response ${endpoint}:`, response);
    }
  }

  // =================================================================
  // DATA MAPPING UTILITIES
  // =================================================================
  
  /**
   * Map database book (CUID) to frontend book format (numeric ID)
   * @private
   */
  private mapDbBookToFrontend(dbBook: DbBook): Book {
    return {
      id: this.cuidToNumber(dbBook.id),
      title: dbBook.title,
      author: dbBook.author,
      status: dbBook.status,
      progress: dbBook.progress,
      notes: dbBook.notes || undefined,
      dateAdded: new Date(dbBook.createdAt),
      dateModified: new Date(dbBook.updatedAt),
      dateStarted: dbBook.dateStarted ? new Date(dbBook.dateStarted) : undefined,
      dateFinished: dbBook.dateFinished ? new Date(dbBook.dateFinished) : undefined,
      isbn: dbBook.isbn || undefined,
      coverUrl: dbBook.coverUrl || undefined,
      tags: dbBook.tags || [],
      rating: dbBook.rating || undefined,
      totalPages: dbBook.totalPages || undefined,
      currentPage: dbBook.currentPage || undefined,
      genre: dbBook.genre || undefined,
      publishedDate: dbBook.publishedDate || undefined,
    };
  }

  /**
   * Map frontend book data to database format
   * @private
   */
  private mapFrontendBookToDb(frontendBook: Partial<Book>): Partial<DbBook> {
    const dbBook: Partial<DbBook> = {
      title: frontendBook.title,
      author: frontendBook.author,
      status: frontendBook.status,
      progress: frontendBook.progress,
      notes: frontendBook.notes || null,
      isbn: frontendBook.isbn || null,
      coverUrl: frontendBook.coverUrl || null,
      tags: frontendBook.tags || [],
      rating: frontendBook.rating || null,
      totalPages: frontendBook.totalPages || null,
      currentPage: frontendBook.currentPage || null,
      genre: frontendBook.genre || null,
      publishedDate: frontendBook.publishedDate || null,
      dateStarted: frontendBook.dateStarted ? new Date(frontendBook.dateStarted) : null,
      dateFinished: frontendBook.dateFinished ? new Date(frontendBook.dateFinished) : null,
    };

    // Remove undefined values
    return Object.fromEntries(
      Object.entries(dbBook).filter(([_, value]) => value !== undefined)
    );
  }

  /**
   * Convert CUID to numeric ID for frontend compatibility
   * Uses a simple hash function for consistent mapping
   * @private
   */
  private cuidToNumber(cuid: string): number {
    let hash = 0;
    for (let i = 0; i < cuid.length; i++) {
      const char = cuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Store CUID mapping for reverse lookup
   * In production, this would be stored in a cache or database
   * @private
   */
  private idMappingCache = new Map<number, string>();

  /**
   * Get CUID from numeric ID
   * @private
   */
  private getCuidFromNumber(numericId: number): string | null {
    return this.idMappingCache.get(numericId) || null;
  }

  /**
   * Store ID mapping for future lookups
   * @private
   */
  private storeIdMapping(cuid: string, numericId: number): void {
    this.idMappingCache.set(numericId, cuid);
  }

  /**
   * Query cache for performance optimization
   * @private
   */
  private queryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  
  /**
   * Default cache TTL (Time To Live) in milliseconds
   * @private
   */
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key for queries
   * @private
   */
  private getCacheKey(method: string, params: unknown): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached query result if valid
   * @private
   */
  private getCachedResult(cacheKey: string): unknown | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.queryCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache query result
   * @private
   */
  private setCachedResult(cacheKey: string, data: unknown, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Cleanup old cache entries periodically
    if (this.queryCache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Cleanup expired cache entries
   * @private
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp >= cached.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached queries
   * @private
   */
  private clearCache(): void {
    this.queryCache.clear();
  }

  // =================================================================
  // CORE CRUD METHODS - TASK 2.2
  // =================================================================

  /**
   * Get all books from storage
   * @returns Promise resolving to array of books
   * @throws {StorageError} When books cannot be retrieved
   */
  async getBooks(): Promise<Book[]> {
    this.logRequest('GET', '/api/books');
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey('getBooks', {});
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logResponse('/api/books', { count: cachedResult.length, cached: true });
        return cachedResult;
      }
      
      const response = await this.authenticatedFetch('/api/books');
      const data = await response.json();
      
      if (!data.books || !Array.isArray(data.books)) {
        throw new StorageError(
          'Invalid response format from books API',
          StorageErrorCode.UNKNOWN_ERROR
        );
      }

      // Map database books to frontend format and store ID mappings
      const mappedBooks = data.books.map((dbBook: any) => {
        const numericId = this.cuidToNumber(dbBook.id);
        this.storeIdMapping(dbBook.id, numericId);
        return this.mapDbBookToFrontend(dbBook);
      });

      // Cache the result for 2 minutes (shorter TTL for frequently changing data)
      this.setCachedResult(cacheKey, mappedBooks, 2 * 60 * 1000);

      this.logResponse('/api/books', { count: mappedBooks.length, cached: false });
      return mappedBooks;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error fetching books:', error);
      throw new StorageError(
        'Failed to retrieve books from storage',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Get a specific book by ID
   * @param id - Book ID
   * @returns Promise resolving to book or null if not found
   * @throws {StorageError} When book cannot be retrieved
   */
  async getBook(id: number): Promise<Book | null> {
    this.logRequest('GET', `/api/books/${id}`);
    
    try {
      // First try to get CUID from cache
      let cuid = this.getCuidFromNumber(id);
      
      // If not in cache, we need to fetch all books to populate cache
      if (!cuid) {
        await this.getBooks(); // This will populate the cache
        cuid = this.getCuidFromNumber(id);
      }
      
      // If still not found, the book doesn't exist
      if (!cuid) {
        this.logResponse(`/api/books/${id}`, null);
        return null;
      }
      
      const response = await this.authenticatedFetch(`/api/books/${cuid}`);
      
      if (response.status === 404) {
        this.logResponse(`/api/books/${id}`, null);
        return null;
      }
      
      const dbBook = await response.json();
      const mappedBook = this.mapDbBookToFrontend(dbBook);
      
      this.logResponse(`/api/books/${id}`, { found: true });
      return mappedBook;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Error fetching book ${id}:`, error);
      throw new StorageError(
        `Failed to retrieve book with ID ${id}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Save a new book to storage
   * @param book - Book data to save
   * @returns Promise resolving to saved book with generated ID
   * @throws {StorageError} When book cannot be saved
   */
  async saveBook(book: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
    this.logRequest('POST', '/api/books', book);
    
    try {
      // Validate required fields
      if (!book.title || !book.author) {
        throw new StorageError(
          'Title and author are required',
          StorageErrorCode.UNKNOWN_ERROR
        );
      }
      
      // Map frontend book data to database format
      const dbBookData = this.mapFrontendBookToDb(book);
      
      const response = await this.authenticatedFetch('/api/books', {
        method: 'POST',
        body: JSON.stringify(dbBookData),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid book data: ${errorData.error}`,
          StorageErrorCode.UNKNOWN_ERROR
        );
      }
      
      const savedDbBook = await response.json();
      
      // Store ID mapping for future lookups
      const numericId = this.cuidToNumber(savedDbBook.id);
      this.storeIdMapping(savedDbBook.id, numericId);
      
      const mappedBook = this.mapDbBookToFrontend(savedDbBook);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/books', { created: true, id: mappedBook.id });
      return mappedBook;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error saving book:', error);
      throw new StorageError(
        'Failed to save book to storage',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Update an existing book
   * @param id - Book ID to update
   * @param updates - Partial book data to update
   * @returns Promise resolving to updated book
   * @throws {StorageError} When book cannot be updated
   */
  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    this.logRequest('PUT', `/api/books/${id}`, updates);
    
    try {
      // Get CUID from cache
      let cuid = this.getCuidFromNumber(id);
      
      // If not in cache, populate cache first
      if (!cuid) {
        await this.getBooks();
        cuid = this.getCuidFromNumber(id);
      }
      
      // If still not found, the book doesn't exist
      if (!cuid) {
        throw new StorageError(
          `Book with ID ${id} not found`,
          StorageErrorCode.FILE_NOT_FOUND
        );
      }
      
      // Remove readonly fields from updates
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, dateAdded: __, ...cleanUpdates } = updates;
      
      // Map frontend updates to database format
      const dbUpdates = this.mapFrontendBookToDb(cleanUpdates);
      
      const response = await this.authenticatedFetch(`/api/books/${cuid}`, {
        method: 'PUT',
        body: JSON.stringify(dbUpdates),
      });
      
      if (response.status === 404) {
        throw new StorageError(
          `Book with ID ${id} not found`,
          StorageErrorCode.FILE_NOT_FOUND
        );
      }
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid update data: ${errorData.error}`,
          StorageErrorCode.UNKNOWN_ERROR
        );
      }
      
      const updatedDbBook = await response.json();
      const mappedBook = this.mapDbBookToFrontend(updatedDbBook);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse(`/api/books/${id}`, { updated: true });
      return mappedBook;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Error updating book ${id}:`, error);
      throw new StorageError(
        `Failed to update book with ID ${id}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Delete a book from storage
   * @param id - Book ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   * @throws {StorageError} When book cannot be deleted
   */
  async deleteBook(id: number): Promise<boolean> {
    this.logRequest('DELETE', `/api/books/${id}`);
    
    try {
      // Get CUID from cache
      let cuid = this.getCuidFromNumber(id);
      
      // If not in cache, populate cache first
      if (!cuid) {
        await this.getBooks();
        cuid = this.getCuidFromNumber(id);
      }
      
      // If still not found, the book doesn't exist
      if (!cuid) {
        this.logResponse(`/api/books/${id}`, { deleted: false, reason: 'not found' });
        return false;
      }
      
      const response = await this.authenticatedFetch(`/api/books/${cuid}`, {
        method: 'DELETE',
      });
      
      if (response.status === 404) {
        this.logResponse(`/api/books/${id}`, { deleted: false, reason: 'not found' });
        return false;
      }
      
      if (response.status === 204) {
        // Remove from cache after successful deletion
        this.idMappingCache.delete(id);
        this.clearCache();
        this.logResponse(`/api/books/${id}`, { deleted: true });
        return true;
      }
      
      // Handle other error statuses
      throw new StorageError(
        `Failed to delete book: ${response.status} ${response.statusText}`,
        StorageErrorCode.UNKNOWN_ERROR
      );
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error(`Error deleting book ${id}:`, error);
      throw new StorageError(
        `Failed to delete book with ID ${id}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  // =================================================================
  // SEARCH AND FILTER METHODS - TASK 2.4
  // =================================================================
  
  // Task 2.4.1: searchBooks() - Full-text search implementation ✓
  // Task 2.4.2: getFilteredBooks() - Advanced filtering ✓
  // Task 2.4.3: Pagination support - limit/offset ✓
  // Task 2.4.4: Sorting and ordering ✓
  // Task 2.4.5: Performance optimizations and caching ✓
  
  // Search and filter methods are implemented above in the class
  
  // =================================================================
  // STREAK DATA MAPPING UTILITIES - TASK 2.5
  // =================================================================
  
  /**
   * Map database streak history to frontend format
   * @private
   */
  private mapDbStreakHistoryToFrontend(dbStreakHistory: DbStreakHistory): StreakHistory {
    return {
      readingDays: new Set(dbStreakHistory.readingDays || []),
      bookPeriods: dbStreakHistory.bookPeriods || [],
      lastCalculated: new Date(dbStreakHistory.lastCalculated || Date.now())
    };
  }
  
  /**
   * Map frontend streak history to database format
   * @private
   */
  private mapFrontendStreakHistoryToDb(streakHistory: StreakHistory): DbStreakHistory {
    return {
      readingDays: Array.from(streakHistory.readingDays),
      currentStreak: 0, // Will be calculated by the backend
      longestStreak: 0, // Will be calculated by the backend  
      bookPeriods: streakHistory.bookPeriods,
      lastCalculated: streakHistory.lastCalculated.toISOString(),
      totalDaysRead: streakHistory.readingDays.size
    };
  }
  
  /**
   * Map database enhanced streak history to frontend format
   * @private
   */
  private mapDbEnhancedStreakHistoryToFrontend(dbEnhancedHistory: DbEnhancedStreakHistory): EnhancedStreakHistory {
    return {
      readingDays: new Set(dbEnhancedHistory.readingDays || []),
      bookPeriods: dbEnhancedHistory.bookPeriods || [],
      lastCalculated: new Date(dbEnhancedHistory.lastCalculated || Date.now()),
      readingDayEntries: (dbEnhancedHistory.readingDayEntries || []).map((entry: DbReadingDayEntry) => ({
        date: entry.date,
        source: entry.source,
        bookIds: entry.bookIds || [],
        notes: entry.notes,
        createdAt: new Date(entry.createdAt),
        modifiedAt: new Date(entry.modifiedAt)
      })),
      lastSyncDate: new Date(dbEnhancedHistory.lastSyncDate || Date.now()),
      version: dbEnhancedHistory.version || 1
    };
  }
  
  /**
   * Map frontend enhanced streak history to database format
   * @private
   */
  private mapFrontendEnhancedStreakHistoryToDb(enhancedHistory: EnhancedStreakHistory): DbEnhancedStreakHistory {
    return {
      readingDays: Array.from(enhancedHistory.readingDays),
      bookPeriods: enhancedHistory.bookPeriods.map(period => ({
        bookId: period.bookId,
        title: period.title,
        author: period.author,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        totalDays: period.totalDays
      })),
      lastCalculated: enhancedHistory.lastCalculated.toISOString(),
      readingDayEntries: enhancedHistory.readingDayEntries.map(entry => ({
        date: entry.date,
        source: entry.source,
        bookIds: entry.bookIds,
        notes: entry.notes,
        createdAt: entry.createdAt.toISOString(),
        modifiedAt: entry.modifiedAt.toISOString()
      })),
      lastSyncDate: enhancedHistory.lastSyncDate.toISOString(),
      version: enhancedHistory.version
    };
  }
  
  /**
   * Convert legacy streak history to enhanced format for migration
   * @private
   */
  private convertLegacyToEnhanced(legacyHistory: StreakHistory): EnhancedStreakHistory {
    const readingDayEntries: EnhancedReadingDayEntry[] = Array.from(legacyHistory.readingDays).map(date => ({
      date,
      source: 'book' as const,
      bookIds: [],
      notes: undefined,
      createdAt: new Date(),
      modifiedAt: new Date()
    }));
    
    return {
      ...legacyHistory,
      readingDayEntries,
      lastSyncDate: new Date(),
      version: 1
    };
  }
  
  /**
   * Validate reading day entry format
   * @private
   */
  private validateReadingDayEntry(entry: unknown): entry is EnhancedReadingDayEntry {
    return (
      typeof entry === 'object' &&
      entry !== null &&
      'date' in entry &&
      'source' in entry &&
      'createdAt' in entry &&
      'modifiedAt' in entry &&
      typeof (entry as Record<string, unknown>).date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test((entry as Record<string, unknown>).date as string) &&
      ['manual', 'book', 'progress'].includes((entry as Record<string, unknown>).source as string) &&
      ((entry as Record<string, unknown>).bookIds === undefined || Array.isArray((entry as Record<string, unknown>).bookIds)) &&
      ((entry as Record<string, unknown>).notes === undefined || typeof (entry as Record<string, unknown>).notes === 'string') &&
      (entry as Record<string, unknown>).createdAt instanceof Date &&
      (entry as Record<string, unknown>).modifiedAt instanceof Date
    );
  }
  
  // =================================================================
  // SETTINGS AND METADATA METHODS - TASK 2.5
  // =================================================================

  /**
   * Get user settings
   * @returns Promise resolving to user settings
   * @throws {StorageError} When settings cannot be retrieved
   */
  async getSettings(): Promise<UserSettings> {
    this.logRequest('GET', '/api/settings');
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey('getSettings', {});
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logResponse('/api/settings', { cached: true });
        return cachedResult;
      }
      
      const response = await this.authenticatedFetch('/api/settings');
      
      if (response.status === 404) {
        // Return default settings if no settings found
        const defaultSettings: UserSettings = {
          theme: 'system',
          dailyReadingGoal: 30,
          defaultView: 'grid',
          sortBy: 'dateAdded',
          sortOrder: 'desc',
          notificationsEnabled: true,
          autoBackup: false,
          backupFrequency: 'weekly'
        };
        
        this.logResponse('/api/settings', { found: false, returning: 'defaults' });
        return defaultSettings;
      }
      
      const settings = await response.json();
      
      // Validate settings format
      if (!settings || typeof settings !== 'object') {
        throw new StorageError(
          'Invalid settings format received from API',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Cache the result for 30 minutes (settings don't change frequently)
      this.setCachedResult(cacheKey, settings, 30 * 60 * 1000);
      
      this.logResponse('/api/settings', { found: true, cached: false });
      return settings;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error fetching settings:', error);
      throw new StorageError(
        'Failed to retrieve user settings',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Update user settings
   * @param settings - Partial settings to update
   * @returns Promise resolving to updated settings
   * @throws {StorageError} When settings cannot be updated
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    this.logRequest('PUT', '/api/settings', settings);
    
    try {
      // Validate settings before sending
      if (!settings || Object.keys(settings).length === 0) {
        throw new StorageError(
          'No settings provided to update',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Filter out undefined values
      const cleanSettings = Object.fromEntries(
        Object.entries(settings).filter(([_, value]) => value !== undefined)
      );
      
      const response = await this.authenticatedFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(cleanSettings),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid settings data: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedSettings = await response.json();
      
      // Validate updated settings format
      if (!updatedSettings || typeof updatedSettings !== 'object') {
        throw new StorageError(
          'Invalid settings format received from API after update',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Clear cache since settings have changed
      this.clearCache();
      
      this.logResponse('/api/settings', { updated: true });
      return updatedSettings;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error updating settings:', error);
      throw new StorageError(
        'Failed to update user settings',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Export all data for backup/migration
   * @returns Promise resolving to export data
   * @throws {StorageError} When data cannot be exported
   */
  async exportData(): Promise<ExportData> {
    this.logRequest('GET', '/api/export');
    
    try {
      // Gather all data for export
      const [books, settings, streakHistory, enhancedStreakHistory] = await Promise.all([
        this.getBooks(),
        this.getSettings(),
        this.getStreakHistory(),
        this.getEnhancedStreakHistory()
      ]);
      
      // Create export data with metadata
      const exportData: ExportData = {
        books,
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          totalBooks: books.length,
        },
        settings,
        streakHistory: streakHistory || undefined,
        enhancedStreakHistory: enhancedStreakHistory || undefined
      };
      
      this.logResponse('/api/export', {
        booksCount: books.length,
        hasSettings: !!settings,
        hasStreakHistory: !!streakHistory,
        hasEnhancedStreakHistory: !!enhancedStreakHistory,
        exportDate: exportData.metadata.exportDate
      });
      
      return exportData;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error exporting data:', error);
      throw new StorageError(
        'Failed to export data',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Import data from backup/migration with transaction support and batch processing
   * @param data - Import data
   * @param options - Import options
   * @returns Promise resolving to import result
   * @throws {StorageError} When data cannot be imported
   */
  async importData(data: ImportData, options?: ImportOptions): Promise<ImportResult> {
    this.logRequest('POST', '/api/import', { booksCount: data.books?.length || 0 });
    
    // Use transaction to ensure data consistency
    return this.withTransaction(async (tx) => {
      // Validate input data
      if (!data || typeof data !== 'object') {
        throw new StorageError(
          'Invalid import data provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Set default options
      const importOptions: ImportOptions = {
        mergeDuplicates: false,
        overwriteExisting: false,
        validateData: true,
        skipInvalid: false,
        ...options
      };
      
      // Initialize result
      const result: ImportResult = {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [],
        duplicates: 0
      };
      
      try {
        // Import books if provided (using batch processing)
        if (data.books && Array.isArray(data.books) && data.books.length > 0) {
          await this.importBooksInBatches(data.books, importOptions, result);
        }
      
      // Import settings if provided
      if (data.settings && typeof data.settings === 'object') {
        try {
          await this.updateSettings(data.settings);
          this.logResponse('/api/import (settings)', { imported: true });
        } catch (error) {
          result.errors.push({
            row: -1,
            field: 'settings',
            message: `Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: data.settings
          });
        }
      }
      
      // Import streak history if provided
      if (data.streakHistory && typeof data.streakHistory === 'object') {
        try {
          await this.saveStreakHistory(data.streakHistory);
          this.logResponse('/api/import (streak)', { imported: true });
        } catch (error) {
          result.errors.push({
            row: -1,
            field: 'streakHistory',
            message: `Failed to import streak history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: data.streakHistory
          });
        }
      }
      
      // Import enhanced streak history if provided
      if (data.enhancedStreakHistory && typeof data.enhancedStreakHistory === 'object') {
        try {
          await this.saveEnhancedStreakHistory(data.enhancedStreakHistory);
          this.logResponse('/api/import (enhanced-streak)', { imported: true });
        } catch (error) {
          result.errors.push({
            row: -1,
            field: 'enhancedStreakHistory',
            message: `Failed to import enhanced streak history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: data.enhancedStreakHistory
          });
        }
      }
      
      // Determine overall success
      result.success = result.errors.length === 0 || 
                      (importOptions.skipInvalid && result.imported > 0);
      
      this.logResponse('/api/import', {
        success: result.success,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        duplicates: result.duplicates
      });
      
      return result;
      
      } catch (error) {
        if (error instanceof StorageError) {
          throw error;
        }
        
        console.error('Error importing data:', error);
        throw new StorageError(
          'Failed to import data',
          StorageErrorCode.UNKNOWN_ERROR,
          error as Error
        );
      }
    });
  }

  /**
   * Search books by query
   * @param query - Search query
   * @returns Promise resolving to matching books
   * @throws {StorageError} When search fails
   */
  async searchBooks(query: string): Promise<Book[]> {
    this.logRequest('GET', '/api/books?search=' + encodeURIComponent(query));
    
    try {
      // Validate query
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      // Check cache first
      const cacheKey = this.getCacheKey('searchBooks', { query: query.trim() });
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logResponse('/api/books (search)', { 
          query,
          count: cachedResult.length,
          cached: true
        });
        return cachedResult;
      }
      
      // Construct search query parameters
      const params = new URLSearchParams({
        search: query.trim(),
        limit: '100', // Default limit for search
        offset: '0'
      });
      
      const response = await this.authenticatedFetch(`/api/books?${params.toString()}`);
      const data = await response.json();
      
      if (!data.books || !Array.isArray(data.books)) {
        throw new StorageError(
          'Invalid response format from search API',
          StorageErrorCode.UNKNOWN_ERROR
        );
      }
      
      // Map database books to frontend format and store ID mappings
      const mappedBooks = data.books.map((dbBook: any) => {
        const numericId = this.cuidToNumber(dbBook.id);
        this.storeIdMapping(dbBook.id, numericId);
        return this.mapDbBookToFrontend(dbBook);
      });
      
      // Cache search results for 10 minutes (longer TTL for search results)
      this.setCachedResult(cacheKey, mappedBooks, 10 * 60 * 1000);
      
      this.logResponse('/api/books (search)', { 
        query,
        count: mappedBooks.length,
        total: data.pagination?.total || mappedBooks.length,
        cached: false
      });
      
      return mappedBooks;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error searching books:', error);
      throw new StorageError(
        `Failed to search books with query: ${query}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Get books with filtering and sorting
   * @param filter - Filter options
   * @returns Promise resolving to filtered books
   * @throws {StorageError} When filtering fails
   */
  async getFilteredBooks(filter: BookFilter): Promise<Book[]> {
    this.logRequest('GET', '/api/books (filtered)', filter);
    
    try {
      // Check cache first (excluding date range which is client-side)
      const cacheableFilter = { ...filter };
      delete cacheableFilter.dateRange; // Don't cache date range queries
      
      const cacheKey = this.getCacheKey('getFilteredBooks', cacheableFilter);
      const cachedResult = this.getCachedResult(cacheKey);
      
      let mappedBooks: Book[];
      
      if (cachedResult && !filter.dateRange) {
        // Use cached result if no date range filtering needed
        mappedBooks = cachedResult;
        this.logResponse('/api/books (filtered)', { 
          filter: {
            status: filter.status,
            search: filter.search,
            genre: filter.genre,
            rating: filter.rating,
            sortBy: filter.sortBy,
            sortOrder: filter.sortOrder,
            hasDateRange: !!filter.dateRange
          },
          count: mappedBooks.length,
          cached: true
        });
      } else {
        // Construct query parameters from filter
        const params = new URLSearchParams();
        
        // Basic filters
        if (filter.status && filter.status !== 'all') {
          params.append('status', filter.status);
        }
        
        if (filter.search) {
          params.append('search', filter.search);
        }
        
        if (filter.genre) {
          params.append('genre', filter.genre);
        }
        
        if (filter.rating) {
          params.append('rating', filter.rating.toString());
        }
        
        // Sorting
        if (filter.sortBy) {
          params.append('sortBy', filter.sortBy);
        }
        
        if (filter.sortOrder) {
          params.append('sortOrder', filter.sortOrder);
        }
        
        // Pagination
        if (filter.limit) {
          params.append('limit', filter.limit.toString());
        }
        
        if (filter.offset) {
          params.append('offset', filter.offset.toString());
        }
        
        // Make API request
        const response = await this.authenticatedFetch(`/api/books?${params.toString()}`);
        const data = await response.json();
        
        if (!data.books || !Array.isArray(data.books)) {
          throw new StorageError(
            'Invalid response format from filtered books API',
            StorageErrorCode.UNKNOWN_ERROR
          );
        }
        
        // Map database books to frontend format and store ID mappings
        mappedBooks = data.books.map((dbBook: any) => {
          const numericId = this.cuidToNumber(dbBook.id);
          this.storeIdMapping(dbBook.id, numericId);
          return this.mapDbBookToFrontend(dbBook);
        });
        
        // Cache the result for 5 minutes (if no date range filtering)
        if (!filter.dateRange) {
          this.setCachedResult(cacheKey, mappedBooks, 5 * 60 * 1000);
        }
      }
      
      // Apply client-side date range filtering if specified
      // (since date range filtering is not implemented in the API yet)
      let filteredBooks = mappedBooks;
      if (filter.dateRange) {
        filteredBooks = mappedBooks.filter(book => {
          const bookDate = book.dateAdded || book.dateModified;
          return bookDate >= filter.dateRange!.start && bookDate <= filter.dateRange!.end;
        });
      }
      
      this.logResponse('/api/books (filtered)', { 
        filter: {
          status: filter.status,
          search: filter.search,
          genre: filter.genre,
          rating: filter.rating,
          sortBy: filter.sortBy,
          sortOrder: filter.sortOrder,
          hasDateRange: !!filter.dateRange
        },
        count: filteredBooks.length,
        total: mappedBooks.length,
        cached: !!cachedResult && !filter.dateRange
      });
      
      return filteredBooks;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error filtering books:', error);
      throw new StorageError(
        'Failed to filter books',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Import books from array with validation and error handling
   * @param books - Array of books to import
   * @param options - Import options
   * @param result - Result object to update
   * @private
   */
  private async importBooks(
    books: (Omit<Book, 'id' | 'dateAdded'> | Book)[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    for (let i = 0; i < books.length; i++) {
      const bookData = books[i];
      
      try {
        // Validate required fields
        if (options.validateData) {
          const validation = this.validateBookData(bookData, i);
          if (!validation.valid) {
            result.errors.push(...validation.errors);
            if (!options.skipInvalid) {
              throw new StorageError(
                `Invalid book data at row ${i}: ${validation.errors.map(e => e.message).join(', ')}`,
                StorageErrorCode.VALIDATION_ERROR
              );
            }
            result.skipped++;
            continue;
          }
        }
        
        // Check for duplicates by title and author
        const existingBooks = await this.searchBooks(`${bookData.title} ${bookData.author}`);
        const isDuplicate = existingBooks.some(book => 
          book.title.toLowerCase() === bookData.title.toLowerCase() && 
          book.author.toLowerCase() === bookData.author.toLowerCase()
        );
        
        if (isDuplicate) {
          result.duplicates++;
          
          if (!options.mergeDuplicates && !options.overwriteExisting) {
            result.skipped++;
            continue;
          }
          
          if (options.overwriteExisting) {
            // Find and update existing book
            const existingBook = existingBooks.find(book => 
              book.title.toLowerCase() === bookData.title.toLowerCase() && 
              book.author.toLowerCase() === bookData.author.toLowerCase()
            );
            
            if (existingBook) {
              await this.updateBook(existingBook.id, bookData);
              result.imported++;
              continue;
            }
          }
        }
        
        // Save new book (remove id and dateAdded if present)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, dateAdded: __, ...newBookData } = bookData as any;
        await this.saveBook(newBookData);
        result.imported++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          row: i,
          field: 'book',
          message: errorMessage,
          data: bookData
        });
        
        if (!options.skipInvalid) {
          throw error;
        }
        
        result.skipped++;
      }
    }
  }

  /**
   * Import books using batch processing for better performance
   * @param books - Array of books to import
   * @param options - Import options
   * @param result - Import result to update
   * @private
   */
  private async importBooksInBatches(
    books: (Omit<Book, 'id' | 'dateAdded'> | Book)[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    this.logRequest('POST', '/api/books/batch', { count: books.length });

    // Process books in batches for better performance
    await this.processBatches(
      books,
      async (batch: typeof books, batchIndex: number) => {
        // Use existing importBooks method for each batch
        const batchResult: ImportResult = {
          success: true,
          imported: 0,
          skipped: 0,
          errors: [],
          duplicates: 0
        };

        // Import this batch
        await this.importBooks(batch, options, batchResult);

        // Merge batch result into overall result
        result.imported += batchResult.imported;
        result.skipped += batchResult.skipped;
        result.duplicates += batchResult.duplicates;
        result.errors.push(...batchResult.errors);

        this.logResponse(`/api/books/batch (${batchIndex + 1})`, {
          imported: batchResult.imported,
          skipped: batchResult.skipped,
          errors: batchResult.errors.length
        });

        return batchResult;
      }
    );
  }
  
  /**
   * Validate book data for import
   * @param bookData - Book data to validate
   * @param rowIndex - Row index for error reporting
   * @returns Validation result
   * @private
   */
  private validateBookData(bookData: unknown, rowIndex: number): {
    valid: boolean;
    errors: ImportError[];
  } {
    const errors: ImportError[] = [];
    
    // Check required fields
    if (!bookData.title || typeof bookData.title !== 'string' || bookData.title.trim() === '') {
      errors.push({
        row: rowIndex,
        field: 'title',
        message: 'Title is required and must be a non-empty string',
        data: bookData.title
      });
    }
    
    if (!bookData.author || typeof bookData.author !== 'string' || bookData.author.trim() === '') {
      errors.push({
        row: rowIndex,
        field: 'author',
        message: 'Author is required and must be a non-empty string',
        data: bookData.author
      });
    }
    
    // Validate status
    if (bookData.status && !['unread', 'reading', 'completed', 'abandoned'].includes(bookData.status)) {
      errors.push({
        row: rowIndex,
        field: 'status',
        message: 'Status must be one of: unread, reading, completed, abandoned',
        data: bookData.status
      });
    }
    
    // Validate progress
    if (bookData.progress !== undefined && (typeof bookData.progress !== 'number' || bookData.progress < 0 || bookData.progress > 100)) {
      errors.push({
        row: rowIndex,
        field: 'progress',
        message: 'Progress must be a number between 0 and 100',
        data: bookData.progress
      });
    }
    
    // Validate rating
    if (bookData.rating !== undefined && (typeof bookData.rating !== 'number' || bookData.rating < 1 || bookData.rating > 5)) {
      errors.push({
        row: rowIndex,
        field: 'rating',
        message: 'Rating must be a number between 1 and 5',
        data: bookData.rating
      });
    }
    
    // Validate pages
    if (bookData.totalPages !== undefined && (typeof bookData.totalPages !== 'number' || bookData.totalPages < 1)) {
      errors.push({
        row: rowIndex,
        field: 'totalPages',
        message: 'Total pages must be a positive number',
        data: bookData.totalPages
      });
    }
    
    if (bookData.currentPage !== undefined && (typeof bookData.currentPage !== 'number' || bookData.currentPage < 0)) {
      errors.push({
        row: rowIndex,
        field: 'currentPage',
        message: 'Current page must be a non-negative number',
        data: bookData.currentPage
      });
    }
    
    // Validate page consistency
    if (bookData.totalPages && bookData.currentPage && bookData.currentPage > bookData.totalPages) {
      errors.push({
        row: rowIndex,
        field: 'currentPage',
        message: 'Current page cannot exceed total pages',
        data: { currentPage: bookData.currentPage, totalPages: bookData.totalPages }
      });
    }
    
    // Validate dates
    if (bookData.dateStarted && !this.isValidDate(bookData.dateStarted)) {
      errors.push({
        row: rowIndex,
        field: 'dateStarted',
        message: 'Date started must be a valid date',
        data: bookData.dateStarted
      });
    }
    
    if (bookData.dateFinished && !this.isValidDate(bookData.dateFinished)) {
      errors.push({
        row: rowIndex,
        field: 'dateFinished',
        message: 'Date finished must be a valid date',
        data: bookData.dateFinished
      });
    }
    
    // Validate date logic
    if (bookData.dateStarted && bookData.dateFinished) {
      const startDate = new Date(bookData.dateStarted);
      const finishDate = new Date(bookData.dateFinished);
      
      if (startDate > finishDate) {
        errors.push({
          row: rowIndex,
          field: 'dateFinished',
          message: 'Date finished cannot be before date started',
          data: { dateStarted: bookData.dateStarted, dateFinished: bookData.dateFinished }
        });
      }
    }
    
    // Validate arrays
    if (bookData.tags && !Array.isArray(bookData.tags)) {
      errors.push({
        row: rowIndex,
        field: 'tags',
        message: 'Tags must be an array',
        data: bookData.tags
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if a value is a valid date
   * @param value - Value to check
   * @returns True if valid date
   * @private
   */
  private isValidDate(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  /**
   * Backup data to file
   * @returns Promise resolving to backup success
   * @throws {StorageError} When backup fails
   */
  async createBackup(): Promise<string> {
    this.logRequest('POST', '/api/backup');
    
    try {
      // Get export data
      const exportData = await this.exportData();
      
      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `puka-backup-${timestamp}.json`;
      
      // Convert to JSON string
      const backupData = JSON.stringify(exportData, null, 2);
      
      // In a real implementation, this would save to file system or cloud storage
      // For now, we'll return the backup data as a downloadable string
      this.logResponse('/api/backup', {
        success: true,
        backupName,
        size: backupData.length,
        booksCount: exportData.books.length
      });
      
      return backupData;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error creating backup:', error);
      throw new StorageError(
        'Failed to create backup',
        StorageErrorCode.BACKUP_FAILED,
        error as Error
      );
    }
  }

  /**
   * Restore data from backup file
   * @param backupData - Backup data to restore
   * @returns Promise resolving to restore success
   * @throws {StorageError} When restore fails
   */
  async restoreBackup(backupData: string): Promise<void> {
    this.logRequest('POST', '/api/restore');
    
    try {
      // Validate backup data
      if (!backupData || typeof backupData !== 'string') {
        throw new StorageError(
          'Invalid backup data provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Parse backup data
      let parsedData: any;
      try {
        parsedData = JSON.parse(backupData);
      } catch (error) {
        throw new StorageError(
          'Invalid backup data format - not valid JSON',
          StorageErrorCode.INVALID_DATA,
          error as Error
        );
      }
      
      // Validate backup structure
      if (!parsedData || typeof parsedData !== 'object') {
        throw new StorageError(
          'Invalid backup data structure',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      if (!parsedData.books || !Array.isArray(parsedData.books)) {
        throw new StorageError(
          'Backup data must contain a books array',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      if (!parsedData.metadata || !parsedData.metadata.version) {
        throw new StorageError(
          'Backup data must contain metadata with version',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Check version compatibility
      const backupVersion = parsedData.metadata.version;
      const supportedVersions = ['1.0'];
      
      if (!supportedVersions.includes(backupVersion)) {
        throw new StorageError(
          `Unsupported backup version: ${backupVersion}. Supported versions: ${supportedVersions.join(', ')}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Prepare import data
      const importData: ImportData = {
        books: parsedData.books,
        settings: parsedData.settings,
        streakHistory: parsedData.streakHistory,
        enhancedStreakHistory: parsedData.enhancedStreakHistory
      };
      
      // Import with overwrite options
      const importResult = await this.importData(importData, {
        mergeDuplicates: false,
        overwriteExisting: true,
        validateData: true,
        skipInvalid: false
      });
      
      if (!importResult.success) {
        throw new StorageError(
          `Restore failed: ${importResult.errors.map(e => e.message).join(', ')}`,
          StorageErrorCode.RESTORE_FAILED
        );
      }
      
      this.logResponse('/api/restore', {
        success: true,
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: importResult.errors.length
      });
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error restoring backup:', error);
      throw new StorageError(
        'Failed to restore backup',
        StorageErrorCode.RESTORE_FAILED,
        error as Error
      );
    }
  }

  /**
   * Get streak history
   * @returns Promise resolving to streak history
   * @throws {StorageError} When streak history cannot be retrieved
   */
  async getStreakHistory(): Promise<StreakHistory | null> {
    this.logRequest('GET', '/api/streak');
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey('getStreakHistory', {});
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logResponse('/api/streak', { found: true, cached: true });
        return cachedResult;
      }
      
      const response = await this.authenticatedFetch('/api/streak');
      
      if (response.status === 404) {
        this.logResponse('/api/streak', { found: false });
        return null;
      }
      
      const dbStreakHistory = await response.json();
      
      // Validate and map to frontend format
      if (!dbStreakHistory || typeof dbStreakHistory !== 'object') {
        throw new StorageError(
          'Invalid streak history format received from API',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const mappedStreakHistory = this.mapDbStreakHistoryToFrontend(dbStreakHistory);
      
      // Cache the result for 15 minutes (streak data changes frequently)
      this.setCachedResult(cacheKey, mappedStreakHistory, 15 * 60 * 1000);
      
      this.logResponse('/api/streak', { found: true, cached: false });
      return mappedStreakHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error fetching streak history:', error);
      throw new StorageError(
        'Failed to retrieve streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Save streak history
   * @param streakHistory - Streak history to save
   * @returns Promise resolving to saved streak history
   * @throws {StorageError} When streak history cannot be saved
   */
  async saveStreakHistory(streakHistory: StreakHistory): Promise<StreakHistory> {
    this.logRequest('POST', '/api/streak', streakHistory);
    
    try {
      // Validate streak history before saving
      if (!streakHistory || typeof streakHistory !== 'object') {
        throw new StorageError(
          'Invalid streak history provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Map frontend data to database format
      const dbStreakHistory = this.mapFrontendStreakHistoryToDb(streakHistory);
      
      const response = await this.authenticatedFetch('/api/streak', {
        method: 'POST',
        body: JSON.stringify(dbStreakHistory),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid streak history data: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const savedDbStreakHistory = await response.json();
      const mappedStreakHistory = this.mapDbStreakHistoryToFrontend(savedDbStreakHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak', { saved: true });
      return mappedStreakHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error saving streak history:', error);
      throw new StorageError(
        'Failed to save streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Update streak history
   * @param updates - Partial streak history updates
   * @returns Promise resolving to updated streak history
   * @throws {StorageError} When streak history cannot be updated
   */
  async updateStreakHistory(updates: Partial<StreakHistory>): Promise<StreakHistory> {
    this.logRequest('PUT', '/api/streak', updates);
    
    try {
      // Validate updates before sending
      if (!updates || Object.keys(updates).length === 0) {
        throw new StorageError(
          'No streak history updates provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Map frontend updates to database format
      const dbUpdates = this.mapFrontendStreakHistoryToDb(updates as StreakHistory);
      
      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(dbUpdates).filter(([_, value]) => value !== undefined)
      );
      
      const response = await this.authenticatedFetch('/api/streak', {
        method: 'PUT',
        body: JSON.stringify(cleanUpdates),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid streak history data: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedDbStreakHistory = await response.json();
      const mappedStreakHistory = this.mapDbStreakHistoryToFrontend(updatedDbStreakHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak', { updated: true });
      return mappedStreakHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error updating streak history:', error);
      throw new StorageError(
        'Failed to update streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Clear streak history
   * @returns Promise resolving to success
   * @throws {StorageError} When streak history cannot be cleared
   */
  async clearStreakHistory(): Promise<void> {
    this.logRequest('DELETE', '/api/streak');
    
    try {
      const response = await this.authenticatedFetch('/api/streak', {
        method: 'DELETE',
      });
      
      if (response.status === 404) {
        // Already cleared - this is OK
        this.logResponse('/api/streak', { cleared: true, already_empty: true });
        return;
      }
      
      if (response.status !== 204) {
        throw new StorageError(
          `Failed to clear streak history: ${response.status} ${response.statusText}`,
          StorageErrorCode.UNKNOWN_ERROR
        );
      }
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak', { cleared: true });
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error clearing streak history:', error);
      throw new StorageError(
        'Failed to clear streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Manually mark today as a reading day
   * @returns Promise resolving to updated streak history
   * @throws {StorageError} When reading day cannot be added
   */
  async markReadingDay(): Promise<StreakHistory> {
    this.logRequest('POST', '/api/streak/mark-day');
    
    try {
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const response = await this.authenticatedFetch('/api/streak/mark-day', {
        method: 'POST',
        body: JSON.stringify({ date: todayDate }),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Failed to mark reading day: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedDbStreakHistory = await response.json();
      const mappedStreakHistory = this.mapDbStreakHistoryToFrontend(updatedDbStreakHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak/mark-day', { marked: true, date: todayDate });
      return mappedStreakHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error marking reading day:', error);
      throw new StorageError(
        'Failed to mark reading day',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Get enhanced streak history with detailed reading day entries
   * @returns Promise resolving to enhanced streak history or null if none exists
   * @throws {StorageError} When enhanced streak history cannot be retrieved
   */
  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    this.logRequest('GET', '/api/streak/enhanced');
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey('getEnhancedStreakHistory', {});
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logResponse('/api/streak/enhanced', { found: true, cached: true });
        return cachedResult;
      }
      
      const response = await this.authenticatedFetch('/api/streak/enhanced');
      
      if (response.status === 404) {
        // Try to get legacy streak history and migrate it
        const legacyHistory = await this.getStreakHistory();
        if (legacyHistory) {
          const enhancedHistory = this.convertLegacyToEnhanced(legacyHistory);
          // Save the migrated data
          await this.saveEnhancedStreakHistory(enhancedHistory);
          this.logResponse('/api/streak/enhanced', { found: true, migrated: true });
          return enhancedHistory;
        }
        
        this.logResponse('/api/streak/enhanced', { found: false });
        return null;
      }
      
      const dbEnhancedHistory = await response.json();
      
      // Validate and map to frontend format
      if (!dbEnhancedHistory || typeof dbEnhancedHistory !== 'object') {
        throw new StorageError(
          'Invalid enhanced streak history format received from API',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(dbEnhancedHistory);
      
      // Cache the result for 15 minutes
      this.setCachedResult(cacheKey, mappedEnhancedHistory, 15 * 60 * 1000);
      
      this.logResponse('/api/streak/enhanced', { found: true, cached: false });
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error fetching enhanced streak history:', error);
      throw new StorageError(
        'Failed to retrieve enhanced streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Save enhanced streak history
   * @param enhancedHistory - Enhanced streak history to save
   * @returns Promise resolving to saved enhanced streak history
   * @throws {StorageError} When enhanced streak history cannot be saved
   */
  async saveEnhancedStreakHistory(enhancedHistory: EnhancedStreakHistory): Promise<EnhancedStreakHistory> {
    this.logRequest('POST', '/api/streak/enhanced', enhancedHistory);
    
    try {
      // Validate enhanced history before saving
      if (!enhancedHistory || typeof enhancedHistory !== 'object') {
        throw new StorageError(
          'Invalid enhanced streak history provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate reading day entries
      if (enhancedHistory.readingDayEntries) {
        for (const entry of enhancedHistory.readingDayEntries) {
          if (!this.validateReadingDayEntry(entry)) {
            throw new StorageError(
              `Invalid reading day entry format: ${JSON.stringify(entry)}`,
              StorageErrorCode.INVALID_DATA
            );
          }
        }
      }
      
      // Map frontend data to database format
      const dbEnhancedHistory = this.mapFrontendEnhancedStreakHistoryToDb(enhancedHistory);
      
      const response = await this.authenticatedFetch('/api/streak/enhanced', {
        method: 'POST',
        body: JSON.stringify(dbEnhancedHistory),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid enhanced streak history data: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const savedDbEnhancedHistory = await response.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(savedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak/enhanced', { saved: true });
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error saving enhanced streak history:', error);
      throw new StorageError(
        'Failed to save enhanced streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Update enhanced streak history
   * @param updates - Partial enhanced streak history updates
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When enhanced streak history cannot be updated
   */
  async updateEnhancedStreakHistory(updates: Partial<EnhancedStreakHistory>): Promise<EnhancedStreakHistory> {
    this.logRequest('PUT', '/api/streak/enhanced', updates);
    
    try {
      // Validate updates before sending
      if (!updates || Object.keys(updates).length === 0) {
        throw new StorageError(
          'No enhanced streak history updates provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate reading day entries if provided
      if (updates.readingDayEntries) {
        for (const entry of updates.readingDayEntries) {
          if (!this.validateReadingDayEntry(entry)) {
            throw new StorageError(
              `Invalid reading day entry format: ${JSON.stringify(entry)}`,
              StorageErrorCode.INVALID_DATA
            );
          }
        }
      }
      
      // Map frontend updates to database format
      const dbUpdates = this.mapFrontendEnhancedStreakHistoryToDb(updates as EnhancedStreakHistory);
      
      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(dbUpdates).filter(([_, value]) => value !== undefined)
      );
      
      const response = await this.authenticatedFetch('/api/streak/enhanced', {
        method: 'PUT',
        body: JSON.stringify(cleanUpdates),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid enhanced streak history data: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedDbEnhancedHistory = await response.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(updatedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak/enhanced', { updated: true });
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error updating enhanced streak history:', error);
      throw new StorageError(
        'Failed to update enhanced streak history',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Add a reading day entry to the enhanced streak history
   * @param entry - Reading day entry to add (without timestamps)
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When reading day entry cannot be added
   */
  async addReadingDayEntry(entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>): Promise<EnhancedStreakHistory> {
    this.logRequest('POST', '/api/streak/entries', entry);
    
    try {
      // Validate entry before adding
      if (!entry || typeof entry !== 'object') {
        throw new StorageError(
          'Invalid reading day entry provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate date format
      if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        throw new StorageError(
          'Invalid date format. Expected YYYY-MM-DD',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate source
      if (!['manual', 'book', 'progress'].includes(entry.source)) {
        throw new StorageError(
          'Invalid source. Must be manual, book, or progress',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Add timestamps
      const entryWithTimestamps = {
        ...entry,
        createdAt: new Date(),
        modifiedAt: new Date()
      };
      
      const response = await this.authenticatedFetch('/api/streak/entries', {
        method: 'POST',
        body: JSON.stringify(entryWithTimestamps),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid reading day entry data: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedDbEnhancedHistory = await response.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(updatedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak/entries', { added: true, date: entry.date });
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error adding reading day entry:', error);
      throw new StorageError(
        'Failed to add reading day entry',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Update a reading day entry in the enhanced streak history
   * @param date - Date of the entry to update (YYYY-MM-DD format)
   * @param updates - Partial reading day entry updates
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When reading day entry cannot be updated
   */
  async updateReadingDayEntry(date: string, updates: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>): Promise<EnhancedStreakHistory> {
    this.logRequest('PUT', `/api/streak/entries/${date}`, updates);
    
    try {
      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new StorageError(
          'Invalid date format. Expected YYYY-MM-DD',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate updates
      if (!updates || Object.keys(updates).length === 0) {
        throw new StorageError(
          'No updates provided for reading day entry',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate source if provided
      if (updates.source && !['manual', 'book', 'progress'].includes(updates.source)) {
        throw new StorageError(
          'Invalid source. Must be manual, book, or progress',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Add modified timestamp
      const updatesWithTimestamp = {
        ...updates,
        modifiedAt: new Date()
      };
      
      const response = await this.authenticatedFetch(`/api/streak/entries/${date}`, {
        method: 'PUT',
        body: JSON.stringify(updatesWithTimestamp),
      });
      
      if (response.status === 404) {
        throw new StorageError(
          `Reading day entry not found for date: ${date}`,
          StorageErrorCode.FILE_NOT_FOUND
        );
      }
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Invalid reading day entry updates: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedDbEnhancedHistory = await response.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(updatedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse(`/api/streak/entries/${date}`, { updated: true });
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error updating reading day entry:', error);
      throw new StorageError(
        `Failed to update reading day entry for date: ${date}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Remove a reading day entry from the enhanced streak history
   * @param date - Date of the entry to remove (YYYY-MM-DD format)
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When reading day entry cannot be removed
   */
  async removeReadingDayEntry(date: string): Promise<EnhancedStreakHistory> {
    this.logRequest('DELETE', `/api/streak/entries/${date}`);
    
    try {
      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new StorageError(
          'Invalid date format. Expected YYYY-MM-DD',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const response = await this.authenticatedFetch(`/api/streak/entries/${date}`, {
        method: 'DELETE',
      });
      
      if (response.status === 404) {
        throw new StorageError(
          `Reading day entry not found for date: ${date}`,
          StorageErrorCode.FILE_NOT_FOUND
        );
      }
      
      if (response.status !== 200) {
        throw new StorageError(
          `Failed to remove reading day entry: ${response.status} ${response.statusText}`,
          StorageErrorCode.UNKNOWN_ERROR
        );
      }
      
      const updatedDbEnhancedHistory = await response.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(updatedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse(`/api/streak/entries/${date}`, { removed: true });
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error removing reading day entry:', error);
      throw new StorageError(
        `Failed to remove reading day entry for date: ${date}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Get reading day entries within a date range
   * @param startDate - Start date (YYYY-MM-DD format)
   * @param endDate - End date (YYYY-MM-DD format)
   * @returns Promise resolving to reading day entries in the specified range
   * @throws {StorageError} When reading day entries cannot be retrieved
   */
  async getReadingDayEntriesInRange(startDate: string, endDate: string): Promise<EnhancedReadingDayEntry[]> {
    this.logRequest('GET', `/api/streak/entries?start=${startDate}&end=${endDate}`);
    
    try {
      // Validate date formats
      if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        throw new StorageError(
          'Invalid start date format. Expected YYYY-MM-DD',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        throw new StorageError(
          'Invalid end date format. Expected YYYY-MM-DD',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        throw new StorageError(
          'Start date cannot be after end date',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Check cache first
      const cacheKey = this.getCacheKey('getReadingDayEntriesInRange', { startDate, endDate });
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logResponse(`/api/streak/entries (range)`, { 
          count: cachedResult.length,
          cached: true,
          range: `${startDate} to ${endDate}`
        });
        return cachedResult;
      }
      
      const params = new URLSearchParams({
        start: startDate,
        end: endDate
      });
      
      const response = await this.authenticatedFetch(`/api/streak/entries?${params.toString()}`);
      
      if (response.status === 404) {
        // No entries found in range - return empty array
        this.logResponse(`/api/streak/entries (range)`, { 
          count: 0,
          cached: false,
          range: `${startDate} to ${endDate}`
        });
        return [];
      }
      
      const dbEntries = await response.json();
      
      // Validate and map entries
      if (!Array.isArray(dbEntries)) {
        throw new StorageError(
          'Invalid response format from reading day entries API',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const mappedEntries = dbEntries.map((entry: any) => ({
        date: entry.date,
        source: entry.source,
        bookIds: entry.bookIds || [],
        notes: entry.notes,
        createdAt: new Date(entry.createdAt),
        modifiedAt: new Date(entry.modifiedAt)
      }));
      
      // Cache the result for 10 minutes
      this.setCachedResult(cacheKey, mappedEntries, 10 * 60 * 1000);
      
      this.logResponse(`/api/streak/entries (range)`, { 
        count: mappedEntries.length,
        cached: false,
        range: `${startDate} to ${endDate}`
      });
      
      return mappedEntries;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error getting reading day entries in range:', error);
      throw new StorageError(
        `Failed to get reading day entries in range ${startDate} to ${endDate}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  /**
   * Migrate legacy streak history to enhanced format
   * @returns Promise resolving to migrated enhanced streak history or null if no legacy data exists
   * @throws {StorageError} When migration fails
   */
  async migrateToEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    this.logRequest('POST', '/api/streak/migrate');
    
    try {
      // First, try to get existing enhanced streak history
      const response = await this.authenticatedFetch('/api/streak/enhanced');
      
      if (response.status === 200) {
        // Enhanced streak history already exists, no migration needed
        const existingEnhancedHistory = await response.json();
        const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(existingEnhancedHistory);
        
        this.logResponse('/api/streak/migrate', { 
          migrated: false,
          reason: 'enhanced_history_exists'
        });
        return mappedEnhancedHistory;
      }
      
      // Try to get legacy streak history
      const legacyHistory = await this.getStreakHistory();
      
      if (!legacyHistory) {
        this.logResponse('/api/streak/migrate', { 
          migrated: false,
          reason: 'no_legacy_data'
        });
        return null;
      }
      
      // Perform migration
      const migrateResponse = await this.authenticatedFetch('/api/streak/migrate', {
        method: 'POST',
        body: JSON.stringify({
          legacyData: this.mapFrontendStreakHistoryToDb(legacyHistory)
        }),
      });
      
      if (migrateResponse.status === 400) {
        const errorData = await migrateResponse.json();
        throw new StorageError(
          `Migration failed: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const migratedDbEnhancedHistory = await migrateResponse.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(migratedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak/migrate', { 
        migrated: true,
        readingDaysCount: mappedEnhancedHistory.readingDays.size,
        entriesCount: mappedEnhancedHistory.readingDayEntries.length
      });
      
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error migrating streak history:', error);
      throw new StorageError(
        'Failed to migrate legacy streak history to enhanced format',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }

  // =================================================================
  // ENHANCED IMPORT/EXPORT METHODS - TASK 2.6
  // =================================================================
  
  /**
   * Export books to CSV format
   * @returns Promise resolving to CSV string
   * @throws {StorageError} When CSV export fails
   */
  async exportBooksToCSV(): Promise<string> {
    this.logRequest('GET', '/api/export/csv');
    
    try {
      const books = await this.getBooks();
      
      if (books.length === 0) {
        return 'title,author,status,progress,rating,genre,totalPages,currentPage,notes,dateStarted,dateFinished,tags\n';
      }
      
      // CSV headers
      const headers = [
        'title',
        'author', 
        'status',
        'progress',
        'rating',
        'genre',
        'totalPages',
        'currentPage',
        'notes',
        'dateStarted',
        'dateFinished',
        'tags'
      ];
      
      // Convert books to CSV rows
      const csvRows = books.map(book => {
        const row = [
          this.escapeCSVValue(book.title),
          this.escapeCSVValue(book.author),
          this.escapeCSVValue(book.status),
          book.progress || '',
          book.rating || '',
          this.escapeCSVValue(book.genre || ''),
          book.totalPages || '',
          book.currentPage || '',
          this.escapeCSVValue(book.notes || ''),
          book.dateStarted ? book.dateStarted.toISOString().split('T')[0] : '',
          book.dateFinished ? book.dateFinished.toISOString().split('T')[0] : '',
          this.escapeCSVValue(book.tags ? book.tags.join(';') : '')
        ];
        
        return row.join(',');
      });
      
      const csvContent = headers.join(',') + '\n' + csvRows.join('\n');
      
      this.logResponse('/api/export/csv', {
        success: true,
        bookCount: books.length,
        size: csvContent.length
      });
      
      return csvContent;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error exporting books to CSV:', error);
      throw new StorageError(
        'Failed to export books to CSV',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }
  
  /**
   * Import books from CSV string
   * @param csvData - CSV string to import
   * @param options - Import options
   * @returns Promise resolving to import result
   * @throws {StorageError} When CSV import fails
   */
  async importBooksFromCSV(csvData: string, options?: ImportOptions): Promise<ImportResult> {
    this.logRequest('POST', '/api/import/csv');
    
    try {
      // Validate CSV data
      if (!csvData || typeof csvData !== 'string') {
        throw new StorageError(
          'Invalid CSV data provided',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Parse CSV data
      const books = this.parseCSVData(csvData);
      
      // Import books using existing import logic
      const importData: ImportData = { books };
      const result = await this.importData(importData, options);
      
      this.logResponse('/api/import/csv', {
        success: result.success,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length
      });
      
      return result;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error importing books from CSV:', error);
      throw new StorageError(
        'Failed to import books from CSV',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }
  
  /**
   * Parse CSV data into book objects
   * @param csvData - CSV string to parse
   * @returns Array of book objects
   * @private
   */
  private parseCSVData(csvData: string): Omit<Book, 'id' | 'dateAdded'>[] {
    const lines = csvData.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      throw new StorageError(
        'CSV data is empty',
        StorageErrorCode.INVALID_DATA
      );
    }
    
    // Parse headers
    const headers = this.parseCSVRow(lines[0]);
    
    // Validate required headers
    const requiredHeaders = ['title', 'author'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new StorageError(
        `CSV is missing required headers: ${missingHeaders.join(', ')}`,
        StorageErrorCode.INVALID_DATA
      );
    }
    
    // Parse data rows
    const books: Omit<Book, 'id' | 'dateAdded'>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      if (row.length !== headers.length) {
        throw new StorageError(
          `CSV row ${i} has ${row.length} columns but expected ${headers.length}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const book: any = {
        status: 'unread',
        progress: 0,
        dateModified: new Date(),
        tags: []
      };
      
      // Map CSV columns to book properties
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = row[j];
        
        if (value === '' || value === null || value === undefined) {
          continue; // Skip empty values
        }
        
        switch (header) {
          case 'title':
          case 'author':
          case 'status':
          case 'genre':
          case 'notes':
          case 'isbn':
          case 'coverUrl':
          case 'publishedDate':
            book[header] = value;
            break;
            
          case 'progress':
          case 'rating':
          case 'totalPages':
          case 'currentPage': {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
              book[header] = numValue;
            }
            break;
          }
            
          case 'dateStarted':
          case 'dateFinished': {
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
              book[header] = dateValue;
            }
            break;
          }
            
          case 'tags':
            book.tags = value.split(';').filter(tag => tag.trim().length > 0);
            break;
        }
      }
      
      books.push(book);
    }
    
    return books;
  }
  
  /**
   * Parse a single CSV row
   * @param row - CSV row string
   * @returns Array of cell values
   * @private
   */
  private parseCSVRow(row: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < row.length) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          currentCell += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Cell separator
        cells.push(currentCell.trim());
        currentCell = '';
        i++;
      } else {
        currentCell += char;
        i++;
      }
    }
    
    // Add the last cell
    cells.push(currentCell.trim());
    
    return cells;
  }
  
  /**
   * Escape CSV value for proper formatting
   * @param value - Value to escape
   * @returns Escaped CSV value
   * @private
   */
  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If the value contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    
    return stringValue;
  }
  
  /**
   * Get import/export progress for large operations
   * @param operationId - Operation identifier
   * @returns Promise resolving to progress information
   * @throws {StorageError} When progress cannot be retrieved
   */
  async getImportExportProgress(operationId: string): Promise<{
    operationId: string;
    type: 'import' | 'export';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    total: number;
    message?: string;
    error?: string;
  }> {
    this.logRequest('GET', `/api/operations/${operationId}/progress`);
    
    try {
      const response = await this.authenticatedFetch(`/api/operations/${operationId}/progress`);
      
      if (response.status === 404) {
        throw new StorageError(
          `Operation ${operationId} not found`,
          StorageErrorCode.FILE_NOT_FOUND
        );
      }
      
      const progressData = await response.json();
      
      this.logResponse(`/api/operations/${operationId}/progress`, {
        status: progressData.status,
        progress: progressData.progress,
        total: progressData.total
      });
      
      return progressData;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error getting import/export progress:', error);
      throw new StorageError(
        `Failed to get progress for operation ${operationId}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }
  
  /**
   * Cancel an ongoing import/export operation
   * @param operationId - Operation identifier
   * @returns Promise resolving to cancellation success
   * @throws {StorageError} When operation cannot be cancelled
   */
  async cancelImportExportOperation(operationId: string): Promise<boolean> {
    this.logRequest('DELETE', `/api/operations/${operationId}`);
    
    try {
      const response = await this.authenticatedFetch(`/api/operations/${operationId}`, {
        method: 'DELETE'
      });
      
      if (response.status === 404) {
        this.logResponse(`/api/operations/${operationId}`, { cancelled: false, reason: 'not_found' });
        return false;
      }
      
      const success = response.status === 200;
      
      this.logResponse(`/api/operations/${operationId}`, { cancelled: success });
      
      return success;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error cancelling import/export operation:', error);
      throw new StorageError(
        `Failed to cancel operation ${operationId}`,
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }
  
  /**
   * Perform bulk operations on reading day entries
   * @param operations - Array of bulk operations to perform
   * @returns Promise resolving to updated enhanced streak history
   * @throws {StorageError} When any operation fails
   */
  async bulkUpdateReadingDayEntries(operations: BulkReadingDayOperation[]): Promise<EnhancedStreakHistory> {
    this.logRequest('POST', '/api/streak/entries/bulk', { operationCount: operations.length });
    
    try {
      // Validate operations
      if (!Array.isArray(operations) || operations.length === 0) {
        throw new StorageError(
          'No operations provided for bulk update',
          StorageErrorCode.INVALID_DATA
        );
      }
      
      // Validate each operation
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        if (!operation || typeof operation !== 'object') {
          throw new StorageError(
            `Invalid operation at index ${i}: operation must be an object`,
            StorageErrorCode.INVALID_DATA
          );
        }
        
        if (!['add', 'update', 'remove'].includes(operation.type)) {
          throw new StorageError(
            `Invalid operation type at index ${i}: must be add, update, or remove`,
            StorageErrorCode.INVALID_DATA
          );
        }
        
        if (!operation.date || !/^\d{4}-\d{2}-\d{2}$/.test(operation.date)) {
          throw new StorageError(
            `Invalid date format at index ${i}: expected YYYY-MM-DD`,
            StorageErrorCode.INVALID_DATA
          );
        }
        
        if (operation.type === 'add' && !operation.entry) {
          throw new StorageError(
            `Missing entry data for add operation at index ${i}`,
            StorageErrorCode.INVALID_DATA
          );
        }
        
        if (operation.type === 'update' && !operation.updates) {
          throw new StorageError(
            `Missing updates data for update operation at index ${i}`,
            StorageErrorCode.INVALID_DATA
          );
        }
        
        // Validate entry source if provided
        if (operation.entry?.source && !['manual', 'book', 'progress'].includes(operation.entry.source)) {
          throw new StorageError(
            `Invalid source in entry at index ${i}: must be manual, book, or progress`,
            StorageErrorCode.INVALID_DATA
          );
        }
        
        if (operation.updates?.source && !['manual', 'book', 'progress'].includes(operation.updates.source)) {
          throw new StorageError(
            `Invalid source in updates at index ${i}: must be manual, book, or progress`,
            StorageErrorCode.INVALID_DATA
          );
        }
      }
      
      // Prepare operations for API call
      const apiOperations = operations.map(operation => {
        const apiOp: any = {
          type: operation.type,
          date: operation.date
        };
        
        if (operation.entry) {
          apiOp.entry = {
            ...operation.entry,
            createdAt: new Date(),
            modifiedAt: new Date()
          };
        }
        
        if (operation.updates) {
          apiOp.updates = {
            ...operation.updates,
            modifiedAt: new Date()
          };
        }
        
        return apiOp;
      });
      
      const response = await this.authenticatedFetch('/api/streak/entries/bulk', {
        method: 'POST',
        body: JSON.stringify({ operations: apiOperations }),
      });
      
      if (response.status === 400) {
        const errorData = await response.json();
        throw new StorageError(
          `Bulk operation failed: ${errorData.error}`,
          StorageErrorCode.INVALID_DATA
        );
      }
      
      const updatedDbEnhancedHistory = await response.json();
      const mappedEnhancedHistory = this.mapDbEnhancedStreakHistoryToFrontend(updatedDbEnhancedHistory);
      
      // Clear cache since data has changed
      this.clearCache();
      
      this.logResponse('/api/streak/entries/bulk', { 
        operationsProcessed: operations.length,
        success: true
      });
      
      return mappedEnhancedHistory;
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      
      console.error('Error performing bulk reading day operations:', error);
      throw new StorageError(
        'Failed to perform bulk reading day operations',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      );
    }
  }
}