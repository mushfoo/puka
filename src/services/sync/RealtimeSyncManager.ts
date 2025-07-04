import { supabase } from '@/lib/supabase'
import { Book } from '@/types'
import { StorageService } from '@/services/storage/StorageService'

export interface SyncConflict {
  id: string
  type: 'book' | 'settings' | 'streak'
  localData: any
  remoteData: any
  lastModified: {
    local: Date
    remote: Date
  }
}

export type ConflictResolutionStrategy = 'local-wins' | 'remote-wins' | 'last-write-wins' | 'manual'

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'conflict-detected' | 'data-updated'
  data?: any
  error?: Error
  conflicts?: SyncConflict[]
}

export type SyncEventListener = (event: SyncEvent) => void

/**
 * Manages real-time synchronization between local and cloud storage
 * Handles conflict resolution and provides sync status updates
 */
export class RealtimeSyncManager {
  private storageService: StorageService
  private isSubscribed = false
  private syncInProgress = false
  private listeners: SyncEventListener[] = []
  private conflicts: SyncConflict[] = []
  private conflictResolutionStrategy: ConflictResolutionStrategy = 'last-write-wins'

  constructor(storageService: StorageService) {
    this.storageService = storageService
  }

  /**
   * Start real-time sync subscriptions
   */
  async startRealtimeSync(): Promise<void> {
    if (this.isSubscribed) {
      console.log('Real-time sync already active')
      return
    }

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated, skipping real-time sync')
        return
      }

      // Subscribe to books table changes
      supabase
        .channel('books-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'books',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => this.handleBooksChange(payload)
        )
        .subscribe()

      // Subscribe to settings changes
      supabase
        .channel('settings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_settings',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => this.handleSettingsChange(payload)
        )
        .subscribe()

      // Subscribe to reading days changes
      supabase
        .channel('reading-days-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reading_days',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => this.handleReadingDaysChange(payload)
        )
        .subscribe()

      this.isSubscribed = true
      console.log('Real-time sync started')
      
      this.emitEvent({
        type: 'sync-start'
      })

    } catch (error) {
      console.error('Failed to start real-time sync:', error)
      this.emitEvent({
        type: 'sync-error',
        error: error as Error
      })
    }
  }

  /**
   * Stop real-time sync subscriptions
   */
  async stopRealtimeSync(): Promise<void> {
    if (!this.isSubscribed) {
      return
    }

    try {
      // Remove all subscriptions
      await supabase.removeAllChannels()
      
      this.isSubscribed = false
      console.log('Real-time sync stopped')
    } catch (error) {
      console.error('Failed to stop real-time sync:', error)
    }
  }

  /**
   * Handle changes to books table
   */
  private async handleBooksChange(payload: any): Promise<void> {
    if (this.syncInProgress) {
      return // Avoid infinite sync loops
    }

    try {
      console.log('Books change detected:', payload.eventType, payload.new?.title || payload.old?.title)
      
      // Get current local data to check for conflicts
      if (payload.eventType === 'UPDATE' && payload.new) {
        await this.handleBookUpdate(payload.new, payload.old)
      } else if (payload.eventType === 'INSERT' && payload.new) {
        await this.handleBookInsert(payload.new)
      } else if (payload.eventType === 'DELETE' && payload.old) {
        await this.handleBookDelete(payload.old)
      }

      this.emitEvent({
        type: 'data-updated',
        data: { type: 'book', change: payload.eventType, id: payload.new?.id || payload.old?.id }
      })

    } catch (error) {
      console.error('Failed to handle books change:', error)
      this.emitEvent({
        type: 'sync-error',
        error: error as Error
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleBookUpdate(remoteBook: any, _oldBook: any): Promise<void> {
    // Convert legacy_id or hash UUID to number for local lookup
    const bookId = remoteBook.legacy_id || this.hashUuidToNumber(remoteBook.id)
    const localBook = await this.storageService.getBook(bookId)

    if (!localBook) {
      // Book doesn't exist locally, insert it
      await this.handleBookInsert(remoteBook)
      return
    }

    // Check for conflicts
    const remoteModified = new Date(remoteBook.updated_at)
    const localModified = localBook.dateModified || localBook.dateAdded

    if (localModified > remoteModified) {
      // Local data is newer, potential conflict
      const conflict: SyncConflict = {
        id: `book-${bookId}`,
        type: 'book',
        localData: localBook,
        remoteData: this.convertSupabaseBookToBook(remoteBook),
        lastModified: {
          local: localModified,
          remote: remoteModified
        }
      }

      await this.resolveConflict(conflict)
    } else {
      // Remote data is newer or same, apply update
      this.syncInProgress = true
      try {
        const bookUpdates = this.convertSupabaseBookToPartialBook(remoteBook)
        await this.storageService.updateBook(bookId, bookUpdates)
      } finally {
        this.syncInProgress = false
      }
    }
  }

  private async handleBookInsert(remoteBook: any): Promise<void> {
    this.syncInProgress = true
    try {
      const book = this.convertSupabaseBookToBookInsert(remoteBook)
      await this.storageService.saveBook(book)
    } finally {
      this.syncInProgress = false
    }
  }

  private async handleBookDelete(remoteBook: any): Promise<void> {
    const bookId = remoteBook.legacy_id || this.hashUuidToNumber(remoteBook.id)
    
    this.syncInProgress = true
    try {
      await this.storageService.deleteBook(bookId)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Handle changes to settings table
   */
  private async handleSettingsChange(payload: any): Promise<void> {
    if (this.syncInProgress) {
      return
    }

    try {
      console.log('Settings change detected:', payload.eventType)
      
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        // Apply settings update
        this.syncInProgress = true
        try {
          const settings = this.convertSupabaseSettingsToUserSettings(payload.new)
          await this.storageService.updateSettings(settings)
        } finally {
          this.syncInProgress = false
        }
      }

      this.emitEvent({
        type: 'data-updated',
        data: { type: 'settings', change: payload.eventType }
      })

    } catch (error) {
      console.error('Failed to handle settings change:', error)
      this.emitEvent({
        type: 'sync-error',
        error: error as Error
      })
    }
  }

  /**
   * Handle changes to reading_days table
   */
  private async handleReadingDaysChange(payload: any): Promise<void> {
    if (this.syncInProgress) {
      return
    }

    try {
      console.log('Reading days change detected:', payload.eventType)
      
      // For now, just emit an event - streak history sync will be implemented later
      this.emitEvent({
        type: 'data-updated',
        data: { type: 'streak', change: payload.eventType, date: payload.new?.date || payload.old?.date }
      })

    } catch (error) {
      console.error('Failed to handle reading days change:', error)
      this.emitEvent({
        type: 'sync-error',
        error: error as Error
      })
    }
  }

  /**
   * Resolve sync conflicts based on configured strategy
   */
  private async resolveConflict(conflict: SyncConflict): Promise<void> {
    this.conflicts.push(conflict)

    this.emitEvent({
      type: 'conflict-detected',
      conflicts: [conflict]
    })

    try {
      switch (this.conflictResolutionStrategy) {
        case 'local-wins':
          // Keep local data, upload to remote
          await this.applyLocalToRemote(conflict)
          break

        case 'remote-wins':
          // Use remote data, update local
          await this.applyRemoteToLocal(conflict)
          break

        case 'last-write-wins':
          // Use the most recently modified data
          if (conflict.lastModified.local > conflict.lastModified.remote) {
            await this.applyLocalToRemote(conflict)
          } else {
            await this.applyRemoteToLocal(conflict)
          }
          break

        case 'manual':
          // Don't auto-resolve, wait for manual resolution
          console.log('Manual conflict resolution required for:', conflict.id)
          return
      }

      // Remove resolved conflict
      this.conflicts = this.conflicts.filter(c => c.id !== conflict.id)

    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      this.emitEvent({
        type: 'sync-error',
        error: error as Error
      })
    }
  }

  private async applyLocalToRemote(conflict: SyncConflict): Promise<void> {
    // This would need access to the cloud service to push local changes
    console.log('Applying local changes to remote for conflict:', conflict.id)
    // Implementation would depend on having direct access to Supabase service
  }

  private async applyRemoteToLocal(conflict: SyncConflict): Promise<void> {
    this.syncInProgress = true
    try {
      if (conflict.type === 'book') {
        const book = conflict.remoteData as Book
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { dateAdded: _dateAdded, dateModified: _dateModified, ...updates } = book
        await this.storageService.updateBook(book.id, updates)
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Manually resolve a specific conflict
   */
  async resolveConflictManually(conflictId: string, resolution: 'local' | 'remote'): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId)
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`)
    }

    if (resolution === 'local') {
      await this.applyLocalToRemote(conflict)
    } else {
      await this.applyRemoteToLocal(conflict)
    }

    this.conflicts = this.conflicts.filter(c => c.id !== conflictId)
  }

  /**
   * Get current sync conflicts
   */
  getConflicts(): SyncConflict[] {
    return [...this.conflicts]
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolutionStrategy(strategy: ConflictResolutionStrategy): void {
    this.conflictResolutionStrategy = strategy
  }

  /**
   * Add sync event listener
   */
  addEventListener(listener: SyncEventListener): void {
    this.listeners.push(listener)
  }

  /**
   * Remove sync event listener
   */
  removeEventListener(listener: SyncEventListener): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  private emitEvent(event: SyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in sync event listener:', error)
      }
    })
  }

  // Utility methods for data conversion
  private hashUuidToNumber(uuid: string): number {
    let hash = 0
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private convertSupabaseBookToBook(supabaseBook: any): Book {
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

  private convertSupabaseBookToPartialBook(supabaseBook: any): Partial<Book> {
    const book = this.convertSupabaseBookToBook(supabaseBook)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, dateAdded: _dateAdded, ...partial } = book
    return partial
  }

  private convertSupabaseBookToBookInsert(supabaseBook: any): Omit<Book, 'id' | 'dateAdded'> {
    const book = this.convertSupabaseBookToBook(supabaseBook)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, dateAdded: _dateAdded, ...insert } = book
    return insert
  }

  private convertSupabaseSettingsToUserSettings(supabaseSettings: any): any {
    return {
      theme: supabaseSettings.theme,
      dailyReadingGoal: supabaseSettings.daily_reading_goal,
      defaultView: supabaseSettings.default_view,
      sortBy: supabaseSettings.sort_by,
      sortOrder: supabaseSettings.sort_order,
      notificationsEnabled: supabaseSettings.notifications_enabled,
      autoBackup: supabaseSettings.auto_backup,
      backupFrequency: supabaseSettings.backup_frequency
    }
  }

  /**
   * Check if real-time sync is active
   */
  isActive(): boolean {
    return this.isSubscribed
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isActive: boolean
    inProgress: boolean
    conflictsCount: number
    strategy: ConflictResolutionStrategy
  } {
    return {
      isActive: this.isSubscribed,
      inProgress: this.syncInProgress,
      conflictsCount: this.conflicts.length,
      strategy: this.conflictResolutionStrategy
    }
  }
}