import { PrismaClient } from '@prisma/client';
import { StorageService } from './StorageService';
import { Book, StreakData } from '../../types';

/**
 * Simplified Railway Postgres + Prisma storage implementation
 * Focuses on core functionality for the migration
 */
export class SimplePrismaStorageService implements StorageService {
  constructor(
    private prisma: PrismaClient,
    private userId: string
  ) {}

  async initialize(): Promise<void> {
    // No initialization needed for Prisma
  }

  // Book Management
  async getBooks(): Promise<Book[]> {
    const dbBooks = await this.prisma.book.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' }
    });

    return dbBooks.map(this.mapDbBookToApp);
  }

  async getBook(id: number): Promise<Book | null> {
    const dbBook = await this.prisma.book.findFirst({
      where: { 
        userId: this.userId,
        legacyId: id
      }
    });

    if (!dbBook) return null;
    return this.mapDbBookToApp(dbBook);
  }

  async saveBook(book: Book): Promise<Book> {
    if (book.id === 0 || !book.id) {
      // Create new book
      const dbBook = await this.prisma.book.create({
        data: {
          userId: this.userId,
          legacyId: Date.now(), // Use timestamp as legacy ID
          title: book.title,
          author: book.author,
          status: this.mapAppStatusToDb(book.status),
          progress: book.progress,
          notes: book.notes,
          dateStarted: book.dateStarted,
          dateFinished: book.dateFinished,
        }
      });
      return this.mapDbBookToApp(dbBook);
    } else {
      // Update existing book
      const dbBook = await this.prisma.book.update({
        where: { 
          userId_legacyId: {
            userId: this.userId,
            legacyId: book.id
          }
        },
        data: {
          title: book.title,
          author: book.author,
          status: this.mapAppStatusToDb(book.status),
          progress: book.progress,
          notes: book.notes,
          dateStarted: book.dateStarted,
          dateFinished: book.dateFinished,
        }
      });
      return this.mapDbBookToApp(dbBook);
    }
  }

  async deleteBook(id: number): Promise<boolean> {
    try {
      await this.prisma.book.delete({
        where: {
          userId_legacyId: {
            userId: this.userId,
            legacyId: id
          }
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  // Simplified implementations for other required methods
  async searchBooks(): Promise<Book[]> {
    return this.getBooks();
  }

  async getStreakData(): Promise<StreakData> {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      dailyGoal: 1,
      todayProgress: 0,
      hasReadToday: false
    };
  }

  async updateStreakData(): Promise<void> {
    // Placeholder implementation
  }

  async markReadingDay(): Promise<void> {
    // Placeholder implementation
  }

  async importBooks(books: Book[]): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const book of books) {
      try {
        await this.saveBook({ ...book, id: 0 }); // Force create new
        imported++;
      } catch (error) {
        errors.push(`Failed to import "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, errors };
  }

  async exportBooks(): Promise<Book[]> {
    return this.getBooks();
  }

  async getSettings(): Promise<any> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: this.userId }
    });
    return settings || {};
  }

  async saveSettings(): Promise<void> {
    // Placeholder implementation
  }

  async clearAllData(): Promise<void> {
    await this.prisma.book.deleteMany({
      where: { userId: this.userId }
    });
  }

  // Helper methods
  private mapDbBookToApp(dbBook: any): Book {
    return {
      id: dbBook.legacyId || parseInt(dbBook.id),
      title: dbBook.title,
      author: dbBook.author,
      status: this.mapDbStatusToApp(dbBook.status),
      progress: dbBook.progress,
      notes: dbBook.notes || '',
      dateAdded: dbBook.createdAt,
      dateModified: dbBook.updatedAt,
      dateStarted: dbBook.dateStarted,
      dateFinished: dbBook.dateFinished,
    };
  }

  private mapAppStatusToDb(status: string): 'WANT_TO_READ' | 'CURRENTLY_READING' | 'FINISHED' {
    switch (status) {
      case 'want_to_read': return 'WANT_TO_READ';
      case 'currently_reading': return 'CURRENTLY_READING';
      case 'finished': return 'FINISHED';
      default: return 'WANT_TO_READ';
    }
  }

  private mapDbStatusToApp(status: string): 'want_to_read' | 'currently_reading' | 'finished' {
    switch (status) {
      case 'WANT_TO_READ': return 'want_to_read';
      case 'CURRENTLY_READING': return 'currently_reading';
      case 'FINISHED': return 'finished';
      default: return 'want_to_read';
    }
  }
}