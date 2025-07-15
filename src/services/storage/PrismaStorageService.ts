import { PrismaClient, BookStatus as PrismaBookStatus, ReadingSource as PrismaReadingSource } from '@prisma/client';
import { StorageService } from './StorageService';
import { Book, StatusFilter, FilterOptions, StreakData, EnhancedStreakHistory, ReadingPeriod } from '../../types';

/**
 * Railway Postgres + Prisma storage implementation
 * Replaces SupabaseStorageService with direct database access
 */
export class PrismaStorageService implements StorageService {
  constructor(
    private prisma: PrismaClient,
    private userId: string
  ) {}

  // Book Management
  async getAllBooks(): Promise<Book[]> {
    const dbBooks = await this.prisma.book.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' }
    });

    return dbBooks.map(this.mapDbBookToApp);
  }

  async getBookById(id: number): Promise<Book | null> {
    const dbBook = await this.prisma.book.findFirst({
      where: { 
        userId: this.userId,
        OR: [
          { legacyId: id },
          { id: id.toString() }
        ]
      }
    });

    if (!dbBook) return null;
    return this.mapDbBookToApp(dbBook);
  }

  async addBook(book: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>): Promise<Book> {
    const dbBook = await this.prisma.book.create({
      data: {
        userId: this.userId,
        title: book.title,
        author: book.author,
        status: this.mapAppStatusToDb(book.status),
        progress: book.progress,
        notes: book.notes,
        isbn: book.isbn,
        coverUrl: book.coverUrl,
        tags: book.tags || [],
        rating: book.rating,
        totalPages: book.totalPages,
        currentPage: book.currentPage,
        genre: book.genre,
        publishedDate: book.publishedDate,
        dateStarted: book.dateStarted,
        dateFinished: book.dateFinished,
      }
    });

    return this.mapDbBookToApp(dbBook);
  }

  async updateBook(id: number, updates: Partial<Book>): Promise<Book> {
    const dbBook = await this.prisma.book.update({
      where: { 
        userId_legacyId: {
          userId: this.userId,
          legacyId: id
        }
      },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.author && { author: updates.author }),
        ...(updates.status && { status: this.mapAppStatusToDb(updates.status) }),
        ...(updates.progress !== undefined && { progress: updates.progress }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.isbn !== undefined && { isbn: updates.isbn }),
        ...(updates.coverUrl !== undefined && { coverUrl: updates.coverUrl }),
        ...(updates.tags !== undefined && { tags: updates.tags || [] }),
        ...(updates.rating !== undefined && { rating: updates.rating }),
        ...(updates.totalPages !== undefined && { totalPages: updates.totalPages }),
        ...(updates.currentPage !== undefined && { currentPage: updates.currentPage }),
        ...(updates.genre !== undefined && { genre: updates.genre }),
        ...(updates.publishedDate !== undefined && { publishedDate: updates.publishedDate }),
        ...(updates.dateStarted !== undefined && { dateStarted: updates.dateStarted }),
        ...(updates.dateFinished !== undefined && { dateFinished: updates.dateFinished }),
      }
    });

    return this.mapDbBookToApp(dbBook);
  }

  async deleteBook(id: number): Promise<void> {
    await this.prisma.book.delete({
      where: {
        userId_legacyId: {
          userId: this.userId,
          legacyId: id
        }
      }
    });
  }

  async searchBooks(query: string): Promise<Book[]> {
    const dbBooks = await this.prisma.book.findMany({
      where: {
        userId: this.userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { genre: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return dbBooks.map(this.mapDbBookToApp);
  }

  async getBooksByStatus(status: StatusFilter): Promise<Book[]> {
    if (status === 'all') {
      return this.getAllBooks();
    }

    const dbBooks = await this.prisma.book.findMany({
      where: {
        userId: this.userId,
        status: this.mapAppStatusToDb(status)
      },
      orderBy: { createdAt: 'desc' }
    });

    return dbBooks.map(this.mapDbBookToApp);
  }

  async filterBooks(options: FilterOptions): Promise<Book[]> {
    const where: any = { userId: this.userId };

    if (options.status && options.status !== 'all') {
      where.status = this.mapAppStatusToDb(options.status);
    }

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { author: { contains: options.search, mode: 'insensitive' } },
        { notes: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    if (options.genre) {
      where.genre = { contains: options.genre, mode: 'insensitive' };
    }

    if (options.rating) {
      where.rating = options.rating;
    }

    if (options.dateRange) {
      where.createdAt = {
        gte: options.dateRange.start,
        lte: options.dateRange.end
      };
    }

    const dbBooks = await this.prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return dbBooks.map(this.mapDbBookToApp);
  }

  // Streak Management
  async getStreakData(): Promise<StreakData> {
    const streakHistory = await this.prisma.streakHistory.findUnique({
      where: { userId: this.userId }
    });

    if (!streakHistory) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        dailyGoal: 1,
        todayProgress: 0,
        hasReadToday: false
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const hasReadToday = await this.prisma.readingDay.findFirst({
      where: {
        userId: this.userId,
        date: new Date(today)
      }
    }) !== null;

    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: this.userId }
    });

    return {
      currentStreak: streakHistory.currentStreak,
      longestStreak: streakHistory.longestStreak,
      lastReadDate: streakHistory.lastReadDate,
      dailyGoal: settings?.dailyReadingGoal || 1,
      todayProgress: hasReadToday ? 1 : 0,
      hasReadToday
    };
  }

  async updateStreakData(data: Partial<StreakData>): Promise<void> {
    const updates: any = {};
    
    if (data.currentStreak !== undefined) updates.currentStreak = data.currentStreak;
    if (data.longestStreak !== undefined) updates.longestStreak = data.longestStreak;
    if (data.lastReadDate !== undefined) updates.lastReadDate = data.lastReadDate;

    if (Object.keys(updates).length > 0) {
      await this.prisma.streakHistory.upsert({
        where: { userId: this.userId },
        update: updates,
        create: {
          userId: this.userId,
          ...updates
        }
      });
    }

    if (data.dailyGoal !== undefined) {
      await this.prisma.userSettings.upsert({
        where: { userId: this.userId },
        update: { dailyReadingGoal: data.dailyGoal },
        create: {
          userId: this.userId,
          dailyReadingGoal: data.dailyGoal
        }
      });
    }
  }

  async markReadingDay(date: Date, bookIds?: number[], source: 'manual' | 'book' | 'progress' = 'manual'): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    
    await this.prisma.readingDay.upsert({
      where: {
        userId_date: {
          userId: this.userId,
          date: new Date(dateStr)
        }
      },
      update: {
        bookIds: bookIds?.map(id => id.toString()) || [],
        source: this.mapAppSourceToDb(source)
      },
      create: {
        userId: this.userId,
        date: new Date(dateStr),
        bookIds: bookIds?.map(id => id.toString()) || [],
        source: this.mapAppSourceToDb(source)
      }
    });
  }

  // Import/Export
  async importBooks(books: Book[]): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const book of books) {
      try {
        await this.addBook(book);
        imported++;
      } catch (error) {
        errors.push(`Failed to import "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, errors };
  }

  async exportBooks(): Promise<Book[]> {
    return this.getAllBooks();
  }

  async importData(data: any): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      if (data.books && Array.isArray(data.books)) {
        const result = await this.importBooks(data.books);
        errors.push(...result.errors);
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown import error'] 
      };
    }
  }

  async exportData(): Promise<any> {
    const books = await this.getAllBooks();
    const streakData = await this.getStreakData();
    
    return {
      books,
      streakData,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
  }

  // Enhanced Streak History (placeholder implementation)
  async getEnhancedStreakHistory(): Promise<EnhancedStreakHistory> {
    const streakHistory = await this.prisma.streakHistory.findUnique({
      where: { userId: this.userId }
    });

    const readingDays = await this.prisma.readingDay.findMany({
      where: { userId: this.userId },
      orderBy: { date: 'desc' }
    });

    const readingDayEntries = readingDays.map(day => ({
      date: day.date.toISOString().split('T')[0],
      source: this.mapDbSourceToApp(day.source),
      bookIds: day.bookIds.map(id => parseInt(id)).filter(id => !isNaN(id)),
      notes: day.notes,
      createdAt: day.createdAt,
      modifiedAt: day.updatedAt
    }));

    return {
      readingDays: new Set(readingDayEntries.map(entry => entry.date)),
      bookPeriods: [], // Would need to calculate from books
      lastCalculated: streakHistory?.lastCalculated || new Date(),
      readingDayEntries,
      lastSyncDate: streakHistory?.lastSynced || new Date(),
      version: streakHistory?.dataVersion || 1
    };
  }

  async updateEnhancedStreakHistory(history: EnhancedStreakHistory): Promise<void> {
    await this.prisma.streakHistory.upsert({
      where: { userId: this.userId },
      update: {
        readingDaysData: Object.fromEntries(history.readingDays),
        bookPeriodsData: history.bookPeriods,
        dataVersion: history.version,
        lastCalculated: history.lastCalculated,
        lastSynced: history.lastSyncDate
      },
      create: {
        userId: this.userId,
        readingDaysData: Object.fromEntries(history.readingDays),
        bookPeriodsData: history.bookPeriods,
        dataVersion: history.version,
        lastCalculated: history.lastCalculated,
        lastSynced: history.lastSyncDate
      }
    });
  }

  // Backup/Restore (simplified implementation)
  async createBackup(): Promise<string> {
    const data = await this.exportData();
    return JSON.stringify(data);
  }

  async restoreFromBackup(backupData: string): Promise<{ success: boolean; errors: string[] }> {
    try {
      const data = JSON.parse(backupData);
      return await this.importData(data);
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Invalid backup data']
      };
    }
  }

  // Helper methods for data mapping
  private mapDbBookToApp(dbBook: any): Book {
    return {
      id: dbBook.legacyId || parseInt(dbBook.id),
      title: dbBook.title,
      author: dbBook.author,
      status: this.mapDbStatusToApp(dbBook.status),
      progress: dbBook.progress,
      notes: dbBook.notes,
      dateAdded: dbBook.createdAt,
      dateModified: dbBook.updatedAt,
      dateStarted: dbBook.dateStarted,
      dateFinished: dbBook.dateFinished,
      isbn: dbBook.isbn,
      coverUrl: dbBook.coverUrl,
      tags: dbBook.tags,
      rating: dbBook.rating,
      totalPages: dbBook.totalPages,
      currentPage: dbBook.currentPage,
      genre: dbBook.genre,
      publishedDate: dbBook.publishedDate
    };
  }

  private mapAppStatusToDb(status: string): PrismaBookStatus {
    switch (status) {
      case 'want_to_read': return 'WANT_TO_READ';
      case 'currently_reading': return 'CURRENTLY_READING';
      case 'finished': return 'FINISHED';
      default: return 'WANT_TO_READ';
    }
  }

  private mapDbStatusToApp(status: PrismaBookStatus): 'want_to_read' | 'currently_reading' | 'finished' {
    switch (status) {
      case 'WANT_TO_READ': return 'want_to_read';
      case 'CURRENTLY_READING': return 'currently_reading';
      case 'FINISHED': return 'finished';
      default: return 'want_to_read';
    }
  }

  private mapAppSourceToDb(source: string): PrismaReadingSource {
    switch (source) {
      case 'manual': return 'MANUAL';
      case 'book': return 'BOOK';
      case 'progress': return 'PROGRESS';
      default: return 'MANUAL';
    }
  }

  private mapDbSourceToApp(source: PrismaReadingSource): 'manual' | 'book' | 'progress' {
    switch (source) {
      case 'MANUAL': return 'manual';
      case 'BOOK': return 'book';
      case 'PROGRESS': return 'progress';
      default: return 'manual';
    }
  }
}