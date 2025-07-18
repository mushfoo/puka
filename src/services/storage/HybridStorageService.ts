import { 
  StorageService, 
  ExportData, 
  ImportData, 
  ImportOptions, 
  ImportResult, 
  BookFilter, 
  StorageError, 
  StorageErrorCode,
  UserSettings,
  BulkReadingDayOperation
} from './StorageService'
import { 
  Book, 
  StreakHistory, 
  EnhancedStreakHistory, 
  EnhancedReadingDayEntry 
} from '@/types'
import { FileSystemStorageService } from './FileSystemStorageService'

/**
 * Simplified storage service that uses local file system storage.
 * Previously was a hybrid service with cloud sync, but now only uses local storage.
 */
export class HybridStorageService implements StorageService {
  private localService: FileSystemStorageService

  constructor() {
    this.localService = new FileSystemStorageService()
  }

  async initialize(): Promise<void> {
    try {
      await this.localService.initialize()
      console.log('Storage service initialized (local only)')
    } catch (error) {
      console.error('Failed to initialize storage service:', error)
      throw new StorageError(
        'Failed to initialize storage service',
        StorageErrorCode.INITIALIZATION_FAILED,
        error as Error
      )
    }
  }

  // Forward all storage interface methods to local service
  async getBooks(): Promise<Book[]> {
    return this.localService.getBooks()
  }

  async getBook(id: number): Promise<Book | null> {
    return this.localService.getBook(id)
  }

  async saveBook(book: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
    return this.localService.saveBook(book)
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    return this.localService.updateBook(id, updates)
  }

  async deleteBook(id: number): Promise<boolean> {
    return this.localService.deleteBook(id)
  }

  async getSettings(): Promise<UserSettings> {
    return this.localService.getSettings()
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.localService.updateSettings(settings)
  }

  async exportData(): Promise<ExportData> {
    return this.localService.exportData()
  }

  async importData(data: ImportData, options?: ImportOptions): Promise<ImportResult> {
    return this.localService.importData(data, options)
  }

  async searchBooks(query: string): Promise<Book[]> {
    return this.localService.searchBooks(query)
  }

  async getFilteredBooks(filter: BookFilter): Promise<Book[]> {
    return this.localService.getFilteredBooks(filter)
  }

  async createBackup(): Promise<string> {
    return this.localService.createBackup()
  }

  async restoreBackup(backupData: string): Promise<void> {
    return this.localService.restoreBackup(backupData)
  }

  async getStreakHistory(): Promise<StreakHistory | null> {
    return this.localService.getStreakHistory()
  }

  async saveStreakHistory(streakHistory: StreakHistory): Promise<StreakHistory> {
    return this.localService.saveStreakHistory(streakHistory)
  }

  async updateStreakHistory(updates: Partial<StreakHistory>): Promise<StreakHistory> {
    return this.localService.updateStreakHistory(updates)
  }

  async clearStreakHistory(): Promise<void> {
    return this.localService.clearStreakHistory()
  }

  async markReadingDay(): Promise<StreakHistory> {
    return this.localService.markReadingDay()
  }

  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    return this.localService.getEnhancedStreakHistory()
  }

  async saveEnhancedStreakHistory(enhancedHistory: EnhancedStreakHistory): Promise<EnhancedStreakHistory> {
    return this.localService.saveEnhancedStreakHistory(enhancedHistory)
  }

  async updateEnhancedStreakHistory(updates: Partial<EnhancedStreakHistory>): Promise<EnhancedStreakHistory> {
    return this.localService.updateEnhancedStreakHistory(updates)
  }

  async addReadingDayEntry(entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>): Promise<EnhancedStreakHistory> {
    return this.localService.addReadingDayEntry(entry)
  }

  async updateReadingDayEntry(date: string, updates: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>): Promise<EnhancedStreakHistory> {
    return this.localService.updateReadingDayEntry(date, updates)
  }

  async removeReadingDayEntry(date: string): Promise<EnhancedStreakHistory> {
    return this.localService.removeReadingDayEntry(date)
  }

  async getReadingDayEntriesInRange(startDate: string, endDate: string): Promise<EnhancedReadingDayEntry[]> {
    return this.localService.getReadingDayEntriesInRange(startDate, endDate)
  }

  async migrateToEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    return this.localService.migrateToEnhancedStreakHistory()
  }

  async bulkUpdateReadingDayEntries(operations: BulkReadingDayOperation[]): Promise<EnhancedStreakHistory> {
    return this.localService.bulkUpdateReadingDayEntries(operations)
  }

  // Simplified methods that no longer support cloud sync
  
  /**
   * Get current service type (always local now)
   */
  getCurrentServiceType(): 'local' {
    return 'local'
  }

  /**
   * Check if cloud sync is available (always false now)
   */
  isCloudSyncAvailable(): boolean {
    return false
  }
}