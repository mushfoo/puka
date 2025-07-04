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
import { 
  supabase, 
  Book as SupabaseBook, 
  BookInsert, 
  BookUpdate
} from '@/lib/supabase'

/**
 * Supabase-based storage service that syncs data to the cloud
 * Implements the same interface as FileSystemStorageService for compatibility
 */
export class SupabaseStorageService implements StorageService {
  private userId: string | null = null
  private isInitialized = false

  async initialize(): Promise<void> {
    try {
      // Get current user
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        throw new StorageError(
          'Authentication required for cloud sync',
          StorageErrorCode.PERMISSION_DENIED,
          error
        )
      }

      if (!user) {
        throw new StorageError(
          'User not authenticated',
          StorageErrorCode.PERMISSION_DENIED
        )
      }

      this.userId = user.id
      this.isInitialized = true
      
      console.log('Supabase storage service initialized for user:', user.email)
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to initialize Supabase storage service',
        StorageErrorCode.INITIALIZATION_FAILED,
        error as Error
      )
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.userId) {
      throw new StorageError(
        'Storage service not initialized',
        StorageErrorCode.INITIALIZATION_FAILED
      )
    }
  }

  private convertSupabaseBookToBook(supabaseBook: SupabaseBook): Book {
    return {
      id: parseInt(supabaseBook.legacy_id?.toString() || '0') || this.hashUuidToNumber(supabaseBook.id),
      title: supabaseBook.title,
      author: supabaseBook.author,
      status: supabaseBook.status,
      progress: supabaseBook.progress,
      notes: supabaseBook.notes,
      dateAdded: new Date(supabaseBook.created_at),
      dateModified: supabaseBook.updated_at ? new Date(supabaseBook.updated_at) : undefined,
      dateStarted: supabaseBook.date_started ? new Date(supabaseBook.date_started) : undefined,
      dateFinished: supabaseBook.date_finished ? new Date(supabaseBook.date_finished) : undefined,
      isbn: supabaseBook.isbn,
      coverUrl: supabaseBook.cover_url,
      tags: supabaseBook.tags,
      rating: supabaseBook.rating,
      totalPages: supabaseBook.total_pages,
      currentPage: supabaseBook.current_page,
      genre: supabaseBook.genre,
      publishedDate: supabaseBook.published_date,
    }
  }

  private convertBookToSupabaseInsert(book: Omit<Book, 'id' | 'dateAdded'>, legacyId?: number): BookInsert {
    this.ensureInitialized()
    
    return {
      user_id: this.userId!,
      title: book.title,
      author: book.author,
      status: book.status,
      progress: book.progress,
      notes: book.notes,
      date_started: book.dateStarted?.toISOString().split('T')[0],
      date_finished: book.dateFinished?.toISOString().split('T')[0],
      isbn: book.isbn,
      cover_url: book.coverUrl,
      tags: book.tags,
      rating: book.rating,
      total_pages: book.totalPages,
      current_page: book.currentPage,
      genre: book.genre,
      published_date: book.publishedDate,
      legacy_id: legacyId,
    }
  }

  private convertBookToSupabaseUpdate(updates: Partial<Book>): BookUpdate {
    const supabaseUpdate: BookUpdate = {}
    
    if (updates.title !== undefined) supabaseUpdate.title = updates.title
    if (updates.author !== undefined) supabaseUpdate.author = updates.author
    if (updates.status !== undefined) supabaseUpdate.status = updates.status
    if (updates.progress !== undefined) supabaseUpdate.progress = updates.progress
    if (updates.notes !== undefined) supabaseUpdate.notes = updates.notes
    if (updates.dateStarted !== undefined) {
      supabaseUpdate.date_started = updates.dateStarted?.toISOString().split('T')[0]
    }
    if (updates.dateFinished !== undefined) {
      supabaseUpdate.date_finished = updates.dateFinished?.toISOString().split('T')[0]
    }
    if (updates.isbn !== undefined) supabaseUpdate.isbn = updates.isbn
    if (updates.coverUrl !== undefined) supabaseUpdate.cover_url = updates.coverUrl
    if (updates.tags !== undefined) supabaseUpdate.tags = updates.tags
    if (updates.rating !== undefined) supabaseUpdate.rating = updates.rating
    if (updates.totalPages !== undefined) supabaseUpdate.total_pages = updates.totalPages
    if (updates.currentPage !== undefined) supabaseUpdate.current_page = updates.currentPage
    if (updates.genre !== undefined) supabaseUpdate.genre = updates.genre
    if (updates.publishedDate !== undefined) supabaseUpdate.published_date = updates.publishedDate

    return supabaseUpdate
  }

  // Simple hash function to convert UUID to number for legacy compatibility
  private hashUuidToNumber(uuid: string): number {
    let hash = 0
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  async getBooks(): Promise<Book[]> {
    this.ensureInitialized()

    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', this.userId!)
        .order('created_at', { ascending: false })

      if (error) {
        throw new StorageError(
          'Failed to fetch books from cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return data.map(book => this.convertSupabaseBookToBook(book))
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to get books',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  async getBook(id: number): Promise<Book | null> {
    this.ensureInitialized()

    try {
      // Try to find by legacy_id first, then by generated hash
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', this.userId!)
        .or(`legacy_id.eq.${id}`)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null
        }
        throw new StorageError(
          'Failed to fetch book from cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return this.convertSupabaseBookToBook(data)
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      return null
    }
  }

  async saveBook(book: Omit<Book, 'id' | 'dateAdded'>): Promise<Book> {
    this.ensureInitialized()

    try {
      const bookInsert = this.convertBookToSupabaseInsert(book)
      
      const { data, error } = await supabase
        .from('books')
        .insert(bookInsert)
        .select()
        .single()

      if (error) {
        throw new StorageError(
          'Failed to save book to cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return this.convertSupabaseBookToBook(data)
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to save book',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    this.ensureInitialized()

    try {
      const supabaseUpdate = this.convertBookToSupabaseUpdate(updates)
      
      const { data, error } = await supabase
        .from('books')
        .update(supabaseUpdate)
        .eq('user_id', this.userId!)
        .or(`legacy_id.eq.${id}`)
        .select()
        .single()

      if (error) {
        throw new StorageError(
          'Failed to update book in cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return this.convertSupabaseBookToBook(data)
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to update book',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  async deleteBook(id: number): Promise<boolean> {
    this.ensureInitialized()

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('user_id', this.userId!)
        .or(`legacy_id.eq.${id}`)

      if (error) {
        throw new StorageError(
          'Failed to delete book from cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return true
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to delete book',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  async getSettings(): Promise<UserSettings> {
    this.ensureInitialized()

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.userId!)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          // Return default settings
          return {
            theme: 'system',
            dailyReadingGoal: 1,
            defaultView: 'grid',
            sortBy: 'dateAdded',
            sortOrder: 'desc',
            notificationsEnabled: true,
            autoBackup: false,
            backupFrequency: 'weekly'
          }
        }
        throw new StorageError(
          'Failed to fetch settings from cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return {
        theme: data.theme as UserSettings['theme'],
        dailyReadingGoal: data.daily_reading_goal,
        defaultView: data.default_view as UserSettings['defaultView'],
        sortBy: data.sort_by as UserSettings['sortBy'],
        sortOrder: data.sort_order as UserSettings['sortOrder'],
        notificationsEnabled: data.notifications_enabled,
        autoBackup: data.auto_backup,
        backupFrequency: data.backup_frequency as UserSettings['backupFrequency']
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to get settings',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    this.ensureInitialized()

    try {
      const update: any = {}
      if (settings.theme) update.theme = settings.theme
      if (settings.dailyReadingGoal) update.daily_reading_goal = settings.dailyReadingGoal
      if (settings.defaultView) update.default_view = settings.defaultView
      if (settings.sortBy) update.sort_by = settings.sortBy
      if (settings.sortOrder) update.sort_order = settings.sortOrder
      if (settings.notificationsEnabled !== undefined) update.notifications_enabled = settings.notificationsEnabled
      if (settings.autoBackup !== undefined) update.auto_backup = settings.autoBackup
      if (settings.backupFrequency) update.backup_frequency = settings.backupFrequency

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: this.userId!,
          ...update
        })
        .select()
        .single()

      if (error) {
        throw new StorageError(
          'Failed to update settings in cloud',
          StorageErrorCode.NETWORK_ERROR,
          error
        )
      }

      return {
        theme: data.theme as UserSettings['theme'],
        dailyReadingGoal: data.daily_reading_goal,
        defaultView: data.default_view as UserSettings['defaultView'],
        sortBy: data.sort_by as UserSettings['sortBy'],
        sortOrder: data.sort_order as UserSettings['sortOrder'],
        notificationsEnabled: data.notifications_enabled,
        autoBackup: data.auto_backup,
        backupFrequency: data.backup_frequency as UserSettings['backupFrequency']
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }
      throw new StorageError(
        'Failed to update settings',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  // Implement remaining interface methods
  // Note: For brevity, I'm implementing minimal versions of complex methods
  // In a full implementation, these would have proper cloud sync logic

  async exportData(): Promise<ExportData> {
    const books = await this.getBooks()
    const settings = await this.getSettings()
    
    return {
      books,
      settings,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '2.0',
        totalBooks: books.length
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async importData(data: ImportData, _options?: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: 0
    }

    try {
      for (const bookData of data.books) {
        try {
          const bookToSave = 'id' in bookData 
            ? { ...bookData, id: undefined, dateAdded: undefined } as Omit<Book, 'id' | 'dateAdded'>
            : bookData as Omit<Book, 'id' | 'dateAdded'>
          
          await this.saveBook(bookToSave)
          result.imported++
        } catch (error) {
          result.errors.push({
            row: result.imported + result.skipped,
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error',
            data: bookData
          })
          result.skipped++
        }
      }

      result.success = result.errors.length === 0
      return result
    } catch (error) {
      throw new StorageError(
        'Failed to import data',
        StorageErrorCode.UNKNOWN_ERROR,
        error as Error
      )
    }
  }

  async searchBooks(query: string): Promise<Book[]> {
    const books = await this.getBooks()
    const lowercaseQuery = query.toLowerCase()
    
    return books.filter(book => 
      book.title.toLowerCase().includes(lowercaseQuery) ||
      book.author.toLowerCase().includes(lowercaseQuery) ||
      book.notes?.toLowerCase().includes(lowercaseQuery)
    )
  }

  async getFilteredBooks(filter: BookFilter): Promise<Book[]> {
    let books = await this.getBooks()

    // Apply filters
    if (filter.status && filter.status !== 'all') {
      books = books.filter(book => book.status === filter.status)
    }

    if (filter.search) {
      const lowercaseSearch = filter.search.toLowerCase()
      books = books.filter(book => 
        book.title.toLowerCase().includes(lowercaseSearch) ||
        book.author.toLowerCase().includes(lowercaseSearch)
      )
    }

    // Apply sorting
    if (filter.sortBy) {
      books.sort((a, b) => {
        let aValue: any = a[filter.sortBy!]
        let bValue: any = b[filter.sortBy!]

        if (aValue instanceof Date) aValue = aValue.getTime()
        if (bValue instanceof Date) bValue = bValue.getTime()

        if (filter.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1
        }
        return aValue > bValue ? 1 : -1
      })
    }

    return books
  }

  async createBackup(): Promise<string> {
    const exportData = await this.exportData()
    return JSON.stringify(exportData)
  }

  async restoreBackup(backupData: string): Promise<void> {
    try {
      const data = JSON.parse(backupData)
      await this.importData(data)
    } catch (error) {
      throw new StorageError(
        'Failed to restore backup',
        StorageErrorCode.RESTORE_FAILED,
        error as Error
      )
    }
  }

  // Streak history methods (simplified for basic compatibility)
  async getStreakHistory(): Promise<StreakHistory | null> {
    // For now, return null - streak history will be implemented in next phase
    return null
  }

  async saveStreakHistory(streakHistory: StreakHistory): Promise<StreakHistory> {
    // Placeholder implementation
    return streakHistory
  }

  async updateStreakHistory(updates: Partial<StreakHistory>): Promise<StreakHistory> {
    // Placeholder implementation
    const current = await this.getStreakHistory()
    return { ...current!, ...updates }
  }

  async clearStreakHistory(): Promise<void> {
    // Placeholder implementation
  }

  async markReadingDay(): Promise<StreakHistory> {
    // Placeholder implementation
    const current = await this.getStreakHistory()
    return current!
  }

  // Enhanced streak history methods (to be implemented)
  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    return null
  }

  async saveEnhancedStreakHistory(enhancedHistory: EnhancedStreakHistory): Promise<EnhancedStreakHistory> {
    return enhancedHistory
  }

  async updateEnhancedStreakHistory(updates: Partial<EnhancedStreakHistory>): Promise<EnhancedStreakHistory> {
    const current = await this.getEnhancedStreakHistory()
    return { ...current!, ...updates }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addReadingDayEntry(_entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>): Promise<EnhancedStreakHistory> {
    const current = await this.getEnhancedStreakHistory()
    return current!
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateReadingDayEntry(_date: string, _updates: Partial<Omit<EnhancedReadingDayEntry, 'date' | 'createdAt'>>): Promise<EnhancedStreakHistory> {
    const current = await this.getEnhancedStreakHistory()
    return current!
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async removeReadingDayEntry(_date: string): Promise<EnhancedStreakHistory> {
    const current = await this.getEnhancedStreakHistory()
    return current!
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getReadingDayEntriesInRange(_startDate: string, _endDate: string): Promise<EnhancedReadingDayEntry[]> {
    return []
  }

  async migrateToEnhancedStreakHistory(): Promise<EnhancedStreakHistory | null> {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async bulkUpdateReadingDayEntries(_operations: BulkReadingDayOperation[]): Promise<EnhancedStreakHistory> {
    const current = await this.getEnhancedStreakHistory()
    return current!
  }
}