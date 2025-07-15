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
import { PrismaStorageService } from './PrismaStorageService'
import { prisma } from '@/lib/prisma'
import { useSession } from 'next-auth/react'

/**
 * Hybrid storage service that automatically switches between local and Prisma cloud storage
 * based on authentication status. Provides seamless sync when user is authenticated.
 */
export class PrismaHybridStorageService implements StorageService {
  private localService: FileSystemStorageService
  private cloudService: PrismaStorageService | null = null
  private currentService: StorageService
  private isAuthenticated = false
  private syncInProgress = false
  private pendingOperations: Array<() => Promise<void>> = []

  constructor() {
    this.localService = new FileSystemStorageService()
    this.currentService = this.localService // Start with local service
  }

  async initialize(): Promise<void> {
    try {
      // Always initialize local service first
      await this.localService.initialize()
      
      // Check authentication status and initialize cloud service if needed
      await this.checkAuthenticationStatus()
      
    } catch (error) {
      console.error('Failed to initialize hybrid storage service:', error)
      throw new StorageError(
        'Failed to initialize storage service',
        StorageErrorCode.INITIALIZATION_FAILED,
        { originalError: error }
      )
    }
  }

  private async checkAuthenticationStatus(): Promise<void> {
    try {
      // In a real Next.js app, you'd get this from useSession() or getSession()
      // For now, we'll check if we have a user ID available
      const userId = this.getCurrentUserId()
      
      if (userId) {
        await this.switchToCloudStorage(userId)
      } else {
        await this.switchToLocalStorage()
      }
    } catch (error) {
      console.error('Error checking authentication status:', error)
      // Fall back to local storage on auth check failure
      await this.switchToLocalStorage()
    }
  }

  private getCurrentUserId(): string | null {
    // This would be implemented to get the current user ID from NextAuth session
    // For now, return null to use local storage
    if (typeof window !== 'undefined') {
      // Check for user ID in localStorage or session storage as a fallback
      return localStorage.getItem('puka_user_id')
    }
    return null
  }

  private async switchToCloudStorage(userId: string): Promise<void> {
    if (!this.cloudService) {
      this.cloudService = new PrismaStorageService(prisma, userId)
    }
    
    this.currentService = this.cloudService
    this.isAuthenticated = true
    
    console.log('Switched to Prisma cloud storage')
    
    // Sync local data to cloud if needed
    await this.syncLocalToCloud()
  }

  private async switchToLocalStorage(): Promise<void> {
    this.currentService = this.localService
    this.isAuthenticated = false
    this.cloudService = null
    
    console.log('Switched to local storage')
  }

  private async syncLocalToCloud(): Promise<void> {
    if (!this.cloudService || this.syncInProgress) return

    this.syncInProgress = true
    
    try {
      console.log('Starting sync from local to cloud storage...')
      
      // Get all local data
      const localBooks = await this.localService.getAllBooks()
      const localStreakHistory = await this.localService.getEnhancedStreakHistory()
      
      // Import to cloud service if there's local data
      if (localBooks.length > 0) {
        console.log(`Syncing ${localBooks.length} books to cloud...`)
        await this.cloudService.importBooks(localBooks)
      }
      
      if (localStreakHistory.readingDayEntries.length > 0) {
        console.log('Syncing streak history to cloud...')
        await this.cloudService.updateEnhancedStreakHistory(localStreakHistory)
      }
      
      console.log('Sync completed successfully')
    } catch (error) {
      console.error('Error syncing local to cloud:', error)
      // Don't throw error here - we want the app to continue working
    } finally {
      this.syncInProgress = false
    }
  }

  // Public method to trigger authentication and sync
  async authenticateAndSync(userId: string): Promise<void> {
    await this.switchToCloudStorage(userId)
  }

  // Public method to sign out and switch to local
  async signOut(): Promise<void> {
    await this.switchToLocalStorage()
  }

  // StorageService implementation - delegate to current service
  async getAllBooks(): Promise<Book[]> {
    return this.currentService.getAllBooks()
  }

  async getBookById(id: number): Promise<Book | null> {
    return this.currentService.getBookById(id)
  }

  async addBook(book: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>): Promise<Book> {
    return this.currentService.addBook(book)
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    return this.currentService.updateBook(id, updates)
  }

  async deleteBook(id: number): Promise<void> {
    return this.currentService.deleteBook(id)
  }

  async searchBooks(query: string): Promise<Book[]> {
    return this.currentService.searchBooks(query)
  }

  async getBooksByStatus(status: string): Promise<Book[]> {
    return this.currentService.getBooksByStatus(status)
  }

  async filterBooks(filter: BookFilter): Promise<Book[]> {
    return this.currentService.filterBooks(filter)
  }

  async getStreakData(): Promise<import('@/types').StreakData> {
    return this.currentService.getStreakData()
  }

  async updateStreakData(data: Partial<import('@/types').StreakData>): Promise<void> {
    return this.currentService.updateStreakData(data)
  }

  async markReadingDay(date: Date, bookIds?: number[], source?: 'manual' | 'book' | 'progress'): Promise<void> {
    return this.currentService.markReadingDay(date, bookIds, source)
  }

  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory> {
    return this.currentService.getEnhancedStreakHistory()
  }

  async updateEnhancedStreakHistory(history: EnhancedStreakHistory): Promise<void> {
    return this.currentService.updateEnhancedStreakHistory(history)
  }

  async importBooks(books: Book[]): Promise<{ imported: number; errors: string[] }> {
    return this.currentService.importBooks(books)
  }

  async exportBooks(): Promise<Book[]> {
    return this.currentService.exportBooks()
  }

  async importData(data: ImportData, options?: ImportOptions): Promise<ImportResult> {
    return this.currentService.importData(data, options)
  }

  async exportData(): Promise<ExportData> {
    return this.currentService.exportData()
  }

  async createBackup(): Promise<string> {
    return this.currentService.createBackup()
  }

  async restoreFromBackup(backupData: string): Promise<{ success: boolean; errors: string[] }> {
    return this.currentService.restoreFromBackup(backupData)
  }

  async getUserSettings(): Promise<UserSettings> {
    return this.currentService.getUserSettings()
  }

  async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    return this.currentService.updateUserSettings(settings)
  }

  async bulkUpdateReadingDays(operations: BulkReadingDayOperation[]): Promise<{ success: number; errors: string[] }> {
    return this.currentService.bulkUpdateReadingDays(operations)
  }

  // Utility methods
  isUsingCloudStorage(): boolean {
    return this.isAuthenticated && this.cloudService !== null
  }

  getCurrentStorageType(): 'local' | 'cloud' {
    return this.isAuthenticated ? 'cloud' : 'local'
  }

  async getLastSyncTime(): Promise<Date | null> {
    if (this.cloudService) {
      // Implementation would depend on how we track sync times
      return new Date() // Placeholder
    }
    return null
  }
}