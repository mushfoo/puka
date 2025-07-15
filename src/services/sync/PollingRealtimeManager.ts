import { PrismaClient } from '@prisma/client';

export type SyncEventType = 'books' | 'settings' | 'streak_history' | 'reading_days';

export interface SyncEvent {
  type: SyncEventType;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
  old_record?: any;
}

export type ConflictResolutionStrategy = 'local-wins' | 'remote-wins' | 'last-write-wins' | 'manual';

export interface ConflictData {
  type: SyncEventType;
  local: any;
  remote: any;
  strategy: ConflictResolutionStrategy;
}

/**
 * Polling-based real-time sync manager
 * Replaces Supabase real-time subscriptions with periodic polling
 */
export class PollingRealtimeManager {
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private lastSyncTimestamps: Map<SyncEventType, Date> = new Map();
  private eventListeners: Map<SyncEventType, ((event: SyncEvent) => void)[]> = new Map();
  private conflictListeners: ((conflict: ConflictData) => void)[] = [];

  constructor(
    private prisma: PrismaClient,
    private userId: string,
    private pollIntervalMs: number = 5000
  ) {}

  /**
   * Start polling for changes
   */
  startPolling(): void {
    if (this.isPolling) return;

    this.isPolling = true;
    this.initializeTimestamps();
    
    this.pollInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling for changes
   */
  stopPolling(): void {
    if (!this.isPolling) return;

    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Subscribe to specific table changes
   */
  subscribe(
    table: SyncEventType,
    callback: (event: SyncEvent) => void
  ): () => void {
    if (!this.eventListeners.has(table)) {
      this.eventListeners.set(table, []);
    }
    
    this.eventListeners.get(table)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(table);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to conflict events
   */
  onConflict(callback: (conflict: ConflictData) => void): () => void {
    this.conflictListeners.push(callback);

    return () => {
      const index = this.conflictListeners.indexOf(callback);
      if (index > -1) {
        this.conflictListeners.splice(index, 1);
      }
    };
  }

  /**
   * Manual trigger for immediate sync check
   */
  async triggerSync(): Promise<void> {
    if (!this.isPolling) return;
    await this.checkForUpdates();
  }

  /**
   * Set conflict resolution strategy for a specific type
   */
  setConflictResolution(
    type: SyncEventType,
    strategy: ConflictResolutionStrategy
  ): void {
    // Store strategy for future conflicts
    // For now, we'll use a simple approach
  }

  private async initializeTimestamps(): Promise<void> {
    const now = new Date();
    this.lastSyncTimestamps.set('books', now);
    this.lastSyncTimestamps.set('settings', now);
    this.lastSyncTimestamps.set('streak_history', now);
    this.lastSyncTimestamps.set('reading_days', now);
  }

  private async checkForUpdates(): Promise<void> {
    try {
      await Promise.all([
        this.checkBooksUpdates(),
        this.checkSettingsUpdates(),
        this.checkStreakHistoryUpdates(),
        this.checkReadingDaysUpdates()
      ]);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  private async checkBooksUpdates(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('books')!;
    
    const updatedBooks = await this.prisma.book.findMany({
      where: {
        userId: this.userId,
        updatedAt: {
          gt: lastSync
        }
      },
      orderBy: { updatedAt: 'asc' }
    });

    for (const book of updatedBooks) {
      this.emitEvent('books', 'UPDATE', book);
    }

    if (updatedBooks.length > 0) {
      this.lastSyncTimestamps.set('books', updatedBooks[updatedBooks.length - 1].updatedAt);
    }
  }

  private async checkSettingsUpdates(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('settings')!;
    
    const updatedSettings = await this.prisma.userSettings.findFirst({
      where: {
        userId: this.userId,
        updatedAt: {
          gt: lastSync
        }
      }
    });

    if (updatedSettings) {
      this.emitEvent('settings', 'UPDATE', updatedSettings);
      this.lastSyncTimestamps.set('settings', updatedSettings.updatedAt);
    }
  }

  private async checkStreakHistoryUpdates(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('streak_history')!;
    
    const updatedStreakHistory = await this.prisma.streakHistory.findFirst({
      where: {
        userId: this.userId,
        updatedAt: {
          gt: lastSync
        }
      }
    });

    if (updatedStreakHistory) {
      this.emitEvent('streak_history', 'UPDATE', updatedStreakHistory);
      this.lastSyncTimestamps.set('streak_history', updatedStreakHistory.updatedAt);
    }
  }

  private async checkReadingDaysUpdates(): Promise<void> {
    const lastSync = this.lastSyncTimestamps.get('reading_days')!;
    
    const updatedReadingDays = await this.prisma.readingDay.findMany({
      where: {
        userId: this.userId,
        updatedAt: {
          gt: lastSync
        }
      },
      orderBy: { updatedAt: 'asc' }
    });

    for (const readingDay of updatedReadingDays) {
      this.emitEvent('reading_days', 'UPDATE', readingDay);
    }

    if (updatedReadingDays.length > 0) {
      this.lastSyncTimestamps.set(
        'reading_days', 
        updatedReadingDays[updatedReadingDays.length - 1].updatedAt
      );
    }
  }

  private emitEvent(type: SyncEventType, operation: 'INSERT' | 'UPDATE' | 'DELETE', record: any): void {
    const event: SyncEvent = { type, operation, record };
    
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in sync event listener for ${type}:`, error);
        }
      });
    }
  }

  private emitConflict(conflict: ConflictData): void {
    this.conflictListeners.forEach(callback => {
      try {
        callback(conflict);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }
}