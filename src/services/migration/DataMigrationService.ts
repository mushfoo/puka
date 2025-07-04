import { Book } from '@/types'
import { FileSystemStorageService } from '@/services/storage/FileSystemStorageService'
import { SupabaseStorageService } from '@/services/storage/SupabaseStorageService'

export interface MigrationProgress {
  phase: 'preparing' | 'books' | 'settings' | 'streaks' | 'cleanup' | 'complete' | 'error'
  totalItems: number
  completedItems: number
  currentItem?: string
  message: string
  percentage: number
}

export interface MigrationResult {
  success: boolean
  booksImported: number
  settingsImported: boolean
  streaksImported: boolean
  errors: string[]
  skipped: number
  duplicates: number
  duration: number
}

export interface MigrationOptions {
  skipDuplicates?: boolean
  overwriteExisting?: boolean
  preserveLocalData?: boolean
  batchSize?: number
}

export type MigrationProgressCallback = (progress: MigrationProgress) => void

/**
 * Service for migrating data from local storage to cloud storage
 * Handles batch processing, error recovery, and progress reporting
 */
export class DataMigrationService {
  private localService: FileSystemStorageService
  private cloudService: SupabaseStorageService
  private progressCallback?: MigrationProgressCallback

  constructor(
    localService: FileSystemStorageService,
    cloudService: SupabaseStorageService
  ) {
    this.localService = localService
    this.cloudService = cloudService
  }

  /**
   * Migrate all data from local to cloud storage
   */
  async migrateToCloud(
    options: MigrationOptions = {},
    progressCallback?: MigrationProgressCallback
  ): Promise<MigrationResult> {
    const startTime = Date.now()
    this.progressCallback = progressCallback
    
    const result: MigrationResult = {
      success: false,
      booksImported: 0,
      settingsImported: false,
      streaksImported: false,
      errors: [],
      skipped: 0,
      duplicates: 0,
      duration: 0
    }

    try {
      // Phase 1: Prepare for migration
      this.reportProgress({
        phase: 'preparing',
        totalItems: 0,
        completedItems: 0,
        message: 'Preparing migration...',
        percentage: 0
      })

      // Check if cloud service is ready
      await this.cloudService.initialize()
      
      // Get local data
      const localBooks = await this.localService.getBooks()
      const localSettings = await this.localService.getSettings()
      const localStreakHistory = await this.localService.getStreakHistory()
      const localEnhancedStreakHistory = await this.localService.getEnhancedStreakHistory()

      // Get existing cloud data to check for conflicts
      const cloudBooks = await this.cloudService.getBooks()
      
      // Calculate total items to migrate
      const totalItems = localBooks.length + 1 + (localStreakHistory ? 1 : 0)
      
      // Phase 2: Migrate books
      this.reportProgress({
        phase: 'books',
        totalItems,
        completedItems: 0,
        message: 'Migrating books...',
        percentage: 5
      })

      const booksResult = await this.migrateBooksToCloud(
        localBooks,
        cloudBooks,
        options
      )
      
      result.booksImported = booksResult.imported
      result.skipped += booksResult.skipped
      result.duplicates += booksResult.duplicates
      result.errors.push(...booksResult.errors)

      // Phase 3: Migrate settings
      this.reportProgress({
        phase: 'settings',
        totalItems,
        completedItems: localBooks.length,
        message: 'Migrating settings...',
        percentage: 80
      })

      try {
        await this.cloudService.updateSettings(localSettings)
        result.settingsImported = true
      } catch (error) {
        result.errors.push(`Failed to migrate settings: ${error}`)
      }

      // Phase 4: Migrate streak history
      this.reportProgress({
        phase: 'streaks',
        totalItems,
        completedItems: localBooks.length + 1,
        message: 'Migrating streak history...',
        percentage: 90
      })

      if (localStreakHistory) {
        try {
          await this.cloudService.saveStreakHistory(localStreakHistory)
          result.streaksImported = true
        } catch (error) {
          result.errors.push(`Failed to migrate streak history: ${error}`)
        }
      }

      if (localEnhancedStreakHistory) {
        try {
          await this.cloudService.saveEnhancedStreakHistory(localEnhancedStreakHistory)
        } catch (error) {
          result.errors.push(`Failed to migrate enhanced streak history: ${error}`)
        }
      }

      // Phase 5: Cleanup (optional)
      if (!options.preserveLocalData && result.errors.length === 0) {
        this.reportProgress({
          phase: 'cleanup',
          totalItems,
          completedItems: totalItems,
          message: 'Cleaning up...',
          percentage: 95
        })

        // This would clear local data, but for safety we'll skip this for now
        // await this.clearLocalData()
      }

      // Complete
      result.success = result.errors.length === 0
      result.duration = Date.now() - startTime

      this.reportProgress({
        phase: 'complete',
        totalItems,
        completedItems: totalItems,
        message: result.success ? 'Migration completed successfully!' : 'Migration completed with errors',
        percentage: 100
      })

      return result

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`)
      result.success = false
      result.duration = Date.now() - startTime

      this.reportProgress({
        phase: 'error',
        totalItems: 0,
        completedItems: 0,
        message: `Migration failed: ${error}`,
        percentage: 0
      })

      return result
    }
  }

  /**
   * Migrate books with duplicate detection and conflict resolution
   */
  private async migrateBooksToCloud(
    localBooks: Book[],
    cloudBooks: Book[],
    options: MigrationOptions
  ): Promise<{
    imported: number
    skipped: number
    duplicates: number
    errors: string[]
  }> {
    const result = {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: [] as string[]
    }

    const batchSize = options.batchSize || 10
    
    for (let i = 0; i < localBooks.length; i += batchSize) {
      const batch = localBooks.slice(i, i + batchSize)
      
      for (const localBook of batch) {
        try {
          this.reportProgress({
            phase: 'books',
            totalItems: localBooks.length,
            completedItems: result.imported + result.skipped,
            currentItem: localBook.title,
            message: `Migrating "${localBook.title}"...`,
            percentage: 5 + (70 * (result.imported + result.skipped) / localBooks.length)
          })

          // Check for duplicates
          const duplicate = cloudBooks.find(cloudBook => 
            this.areBooksEquivalent(localBook, cloudBook)
          )

          if (duplicate) {
            result.duplicates++
            
            if (options.skipDuplicates) {
              result.skipped++
              continue
            }
            
            if (!options.overwriteExisting) {
              result.skipped++
              continue
            }
            
            // Update existing book
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, dateAdded: _dateAdded, dateModified: _dateModified, ...updates } = localBook
            await this.cloudService.updateBook(duplicate.id, updates)
            result.imported++
          } else {
            // Import new book
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, dateAdded: _dateAdded, dateModified: _dateModified, ...bookData } = localBook
            await this.cloudService.saveBook(bookData)
            result.imported++
          }

          // Small delay to avoid overwhelming the API
          await this.delay(100)

        } catch (error) {
          result.errors.push(`Failed to migrate book "${localBook.title}": ${error instanceof Error ? error.message : String(error)}`)
          result.skipped++
        }
      }
    }

    return result
  }

  /**
   * Check if two books are equivalent (same book, potentially different data)
   */
  private areBooksEquivalent(book1: Book, book2: Book): boolean {
    // Check if books are the same based on title and author
    const title1 = book1.title.toLowerCase().trim()
    const title2 = book2.title.toLowerCase().trim()
    const author1 = book1.author.toLowerCase().trim()
    const author2 = book2.author.toLowerCase().trim()

    return title1 === title2 && author1 === author2
  }

  /**
   * Report migration progress
   */
  private reportProgress(progress: MigrationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Verify migration integrity by comparing local and cloud data
   */
  async verifyMigration(): Promise<{
    success: boolean
    localBooks: number
    cloudBooks: number
    missingBooks: string[]
    extraBooks: string[]
  }> {
    try {
      const localBooks = await this.localService.getBooks()
      const cloudBooks = await this.cloudService.getBooks()

      const missingBooks: string[] = []
      const extraBooks: string[] = []

      // Check for books in local but not in cloud
      for (const localBook of localBooks) {
        const found = cloudBooks.find(cloudBook => 
          this.areBooksEquivalent(localBook, cloudBook)
        )
        if (!found) {
          missingBooks.push(`${localBook.title} by ${localBook.author}`)
        }
      }

      // Check for books in cloud but not in local (shouldn't happen in migration)
      for (const cloudBook of cloudBooks) {
        const found = localBooks.find(localBook => 
          this.areBooksEquivalent(localBook, cloudBook)
        )
        if (!found) {
          extraBooks.push(`${cloudBook.title} by ${cloudBook.author}`)
        }
      }

      return {
        success: missingBooks.length === 0,
        localBooks: localBooks.length,
        cloudBooks: cloudBooks.length,
        missingBooks,
        extraBooks
      }

    } catch (error) {
      throw new Error(`Failed to verify migration: ${error}`)
    }
  }

  /**
   * Create a backup of local data before migration
   */
  async createBackup(): Promise<string> {
    try {
      const exportData = await this.localService.exportData()
      const backup = {
        ...exportData,
        backupDate: new Date().toISOString(),
        version: '2.0'
      }
      
      return JSON.stringify(backup, null, 2)
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`)
    }
  }

  /**
   * Estimate migration size and duration
   */
  async estimateMigration(): Promise<{
    totalBooks: number
    estimatedDuration: number // in milliseconds
    estimatedSize: number // in bytes
  }> {
    try {
      const localBooks = await this.localService.getBooks()
      const exportData = await this.localService.exportData()
      
      // Rough estimates
      const booksCount = localBooks.length
      const avgTimePerBook = 500 // 500ms per book
      const estimatedDuration = booksCount * avgTimePerBook + 5000 // 5s overhead
      
      const dataSize = JSON.stringify(exportData).length
      
      return {
        totalBooks: booksCount,
        estimatedDuration,
        estimatedSize: dataSize
      }
    } catch (error) {
      throw new Error(`Failed to estimate migration: ${error}`)
    }
  }
}