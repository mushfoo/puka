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
import { SupabaseStorageService } from './SupabaseStorageService'
import { supabase } from '@/lib/supabase'

/**
 * Hybrid storage service that automatically switches between local and cloud storage
 * based on authentication status. Provides seamless sync when user is authenticated.
 */
export class HybridStorageService implements StorageService {
  private localService: FileSystemStorageService
  private cloudService: SupabaseStorageService
  private currentService: StorageService
  private isAuthenticated = false
  private syncInProgress = false
  private pendingOperations: Array<() => Promise<void>> = []

  constructor() {
    this.localService = new FileSystemStorageService()
    this.cloudService = new SupabaseStorageService()
    this.currentService = this.localService // Start with local service
  }

  async initialize(): Promise<void> {
    try {
      // Always initialize local service first
      await this.localService.initialize()
      
      // Check authentication status
      await this.checkAuthenticationStatus()
      
      // Set up auth state listener
      this.setupAuthListener()
      
      console.log('Hybrid storage service initialized')
    } catch (error) {
      console.error('Failed to initialize hybrid storage service:', error)
      throw new StorageError(
        'Failed to initialize storage service',
        StorageErrorCode.INITIALIZATION_FAILED,
        error as Error
      )
    }
  }

  private async checkAuthenticationStatus(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await this.switchToCloudService()
      } else {
        await this.switchToLocalService()
      }
    } catch (error) {
      console.warn('Failed to check auth status, using local service:', error)
      await this.switchToLocalService()
    }
  }

  private setupAuthListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, switching to cloud service')
          await this.switchToCloudService()
          await this.syncLocalToCloud()
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, switching to local service')
          await this.switchToLocalService()
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
      }
    })
  }

  private async switchToCloudService(): Promise<void> {
    try {
      await this.cloudService.initialize()
      this.currentService = this.cloudService
      this.isAuthenticated = true
      console.log('Switched to cloud storage service')
    } catch (error) {
      console.warn('Failed to switch to cloud service, staying with local:', error)
      this.currentService = this.localService
      this.isAuthenticated = false
    }
  }

  private async switchToLocalService(): Promise<void> {
    this.currentService = this.localService
    this.isAuthenticated = false
    console.log('Switched to local storage service')
  }

  /**
   * Sync local data to cloud when user signs in
   */
  private async syncLocalToCloud(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping')
      return
    }

    this.syncInProgress = true

    try {
      console.log('Starting sync from local to cloud...')
      
      // Get local data
      const localBooks = await this.localService.getBooks()
      const localSettings = await this.localService.getSettings()
      const localStreakHistory = await this.localService.getStreakHistory()

      // Get cloud data to check for conflicts
      const cloudBooks = await this.cloudService.getBooks()

      // Sync books
      const booksToSync = localBooks.filter(localBook => {
        // Only sync books that don't already exist in cloud
        return !cloudBooks.some(cloudBook => 
          cloudBook.title === localBook.title && 
          cloudBook.author === localBook.author
        )
      })

      let syncedCount = 0
      for (const book of booksToSync) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, dateAdded: _dateAdded, dateModified: _dateModified, ...bookData } = book
          await this.cloudService.saveBook(bookData)
          syncedCount++
        } catch (error) {
          console.error('Failed to sync book:', book.title, error)
        }
      }

      // Sync settings
      try {
        await this.cloudService.updateSettings(localSettings)
      } catch (error) {
        console.error('Failed to sync settings:', error)
      }

      // Sync streak history (if implemented)
      if (localStreakHistory) {
        try {
          await this.cloudService.saveStreakHistory(localStreakHistory)
        } catch (error) {
          console.error('Failed to sync streak history:', error)
        }
      }

      console.log(`Sync completed: ${syncedCount} books synced to cloud`)
    } catch (error) {
      console.error('Failed to sync local data to cloud:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Download and merge cloud data to local storage
   */
  async syncCloudToLocal(): Promise<void> {
    if (!this.isAuthenticated) {
      console.log('Not authenticated, skipping cloud to local sync')
      return
    }

    try {
      console.log('Starting sync from cloud to local...')
      
      // Get cloud data
      const cloudBooks = await this.cloudService.getBooks()
      const cloudSettings = await this.cloudService.getSettings()

      // Get local data to merge
      const localBooks = await this.localService.getBooks()

      // Merge books (cloud takes precedence for conflicts)
      const booksToUpdate = cloudBooks.filter(cloudBook => {
        const localBook = localBooks.find(lb => 
          lb.title === cloudBook.title && lb.author === cloudBook.author
        )
        return !localBook || 
               (localBook.dateModified && cloudBook.dateModified && 
                cloudBook.dateModified > localBook.dateModified)
      })

      for (const book of booksToUpdate) {
        try {
          // Check if book exists locally
          const existingLocal = localBooks.find(lb => 
            lb.title === book.title && lb.author === book.author
          )
          
          if (existingLocal) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, dateAdded: _dateAdded, dateModified: _dateModified, ...updates } = book
            await this.localService.updateBook(existingLocal.id, updates)
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, dateAdded: _dateAdded, dateModified: _dateModified, ...bookData } = book
            await this.localService.saveBook(bookData)
          }
        } catch (error) {
          console.error('Failed to sync book to local:', book.title, error)
        }
      }

      // Update local settings
      await this.localService.updateSettings(cloudSettings)

      console.log(`Cloud to local sync completed: ${booksToUpdate.length} books updated`)
    } catch (error) {
      console.error('Failed to sync cloud data to local:', error)
    }
  }

  // Forward all storage interface methods to current service
  async getBooks(): Promise<Book[]> {
    return this.currentService.getBooks()
  }

  async getBook(id: number): Promise<Book | null> {
    return this.currentService.getBook(id)
  }

  async saveBook(book: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
    const result = await this.currentService.saveBook(book)
    
    // If we're using local service but user is authenticated, queue for sync
    if (this.currentService === this.localService && this.isAuthenticated) {
      this.queueOperation(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, dateAdded: _dateAdded, dateModified: _dateModified, ...bookData } = result
        await this.cloudService.saveBook(bookData)
      })
    }
    
    return result
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    const result = await this.currentService.updateBook(id, updates)
    
    // If we're using local service but user is authenticated, queue for sync
    if (this.currentService === this.localService && this.isAuthenticated) {
      this.queueOperation(async () => {
        await this.cloudService.updateBook(id, updates)
      })
    }
    
    return result
  }

  async deleteBook(id: number): Promise<boolean> {
    const result = await this.currentService.deleteBook(id)
    
    // If we're using local service but user is authenticated, queue for sync
    if (this.currentService === this.localService && this.isAuthenticated) {
      this.queueOperation(async () => {
        await this.cloudService.deleteBook(id)
      })
    }
    
    return result
  }

  async getSettings(): Promise<UserSettings> {
    return this.currentService.getSettings()
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const result = await this.currentService.updateSettings(settings)
    
    // If we're using local service but user is authenticated, queue for sync
    if (this.currentService === this.localService && this.isAuthenticated) {
      this.queueOperation(async () => {
        await this.cloudService.updateSettings(settings)
      })
    }
    
    return result
  }

  private queueOperation(operation: () => Promise<void>): void {
    this.pendingOperations.push(operation)
    
    // Process queue after a short delay
    setTimeout(() => this.processPendingOperations(), 1000)
  }

  private async processPendingOperations(): Promise<void> {
    if (this.pendingOperations.length === 0 || !this.isAuthenticated) {
      return
    }

    const operations = [...this.pendingOperations]
    this.pendingOperations = []

    for (const operation of operations) {
      try {
        await operation()
      } catch (error) {
        console.error('Failed to process pending operation:', error)
      }
    }
  }

  // Delegate remaining methods to current service
  async exportData(): Promise<ExportData> {
    return this.currentService.exportData()
  }

  async importData(data: ImportData, options?: ImportOptions): Promise<ImportResult> {
    return this.currentService.importData(data, options)
  }

  async searchBooks(query: string): Promise<Book[]> {
    return this.currentService.searchBooks(query)
  }

  async getFilteredBooks(filter: BookFilter): Promise<Book[]> {
    return this.currentService.getFilteredBooks(filter)
  }

  async createBackup(): Promise<string> {
    return this.currentService.createBackup()
  }

  async restoreBackup(backupData: string): Promise<void> {
    return this.currentService.restoreBackup(backupData)
  }

  async getStreakHistory(): Promise<StreakHistory | null> {
    return this.currentService.getStreakHistory()
  }

  async saveStreakHistory(streakHistory: StreakHistory): Promise<StreakHistory> {
    return this.currentService.saveStreakHistory(streakHistory)
  }

  async updateStreakHistory(updates: Partial<StreakHistory>): Promise<StreakHistory> {
    return this.currentService.updateStreakHistory(updates)
  }

  async clearStreakHistory(): Promise<void> {
    return this.currentService.clearStreakHistory()
  }

  async markReadingDay(): Promise<StreakHistory> {
    return this.currentService.markReadingDay()
  }

  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    return this.currentService.getEnhancedStreakHistory()
  }

  async saveEnhancedStreakHistory(enhancedHistory: EnhancedStreakHistory): Promise<EnhancedStreakHistory> {
    return this.currentService.saveEnhancedStreakHistory(enhancedHistory)
  }

  async updateEnhancedStreakHistory(updates: Partial<EnhancedStreakHistory>): Promise<EnhancedStreakHistory> {
    return this.currentService.updateEnhancedStreakHistory(updates)
  }

  async addReadingDayEntry(entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>): Promise<EnhancedStreakHistory> {
    return this.currentService.addReadingDayEntry(entry)
  }

  async updateReadingDayEntry(date: string, updates: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>): Promise<EnhancedStreakHistory> {
    return this.currentService.updateReadingDayEntry(date, updates)
  }

  async removeReadingDayEntry(date: string): Promise<EnhancedStreakHistory> {
    return this.currentService.removeReadingDayEntry(date)
  }

  async getReadingDayEntriesInRange(startDate: string, endDate: string): Promise<EnhancedReadingDayEntry[]> {
    return this.currentService.getReadingDayEntriesInRange(startDate, endDate)
  }

  async migrateToEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    return this.currentService.migrateToEnhancedStreakHistory()
  }

  async bulkUpdateReadingDayEntries(operations: BulkReadingDayOperation[]): Promise<EnhancedStreakHistory> {
    return this.currentService.bulkUpdateReadingDayEntries(operations)
  }

  // Additional hybrid-specific methods
  
  /**
   * Get current service type
   */
  getCurrentServiceType(): 'local' | 'cloud' {
    return this.currentService === this.cloudService ? 'cloud' : 'local'
  }

  /**
   * Check if cloud sync is available
   */
  isCloudSyncAvailable(): boolean {
    return this.isAuthenticated
  }

  /**
   * Manually trigger sync from local to cloud
   */
  async manualSyncToCloud(): Promise<void> {
    if (!this.isAuthenticated) {
      throw new StorageError(
        'Cannot sync to cloud: user not authenticated',
        StorageErrorCode.PERMISSION_DENIED
      )
    }
    
    await this.syncLocalToCloud()
  }

  /**
   * Manually trigger sync from cloud to local
   */
  async manualSyncFromCloud(): Promise<void> {
    if (!this.isAuthenticated) {
      throw new StorageError(
        'Cannot sync from cloud: user not authenticated',
        StorageErrorCode.PERMISSION_DENIED
      )
    }
    
    await this.syncCloudToLocal()
  }
}