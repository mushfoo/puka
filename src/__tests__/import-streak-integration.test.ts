import { describe, it, expect, beforeEach } from 'vitest';
import { ImportService } from '@/services/importService';
import { FileSystemStorageService } from '@/services/storage/FileSystemStorageService';

describe('Import with Streak Integration Test', () => {
  let storageService: FileSystemStorageService;

  beforeEach(() => {
    // Mock localStorage for testing
    const localStorageMock = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    storageService = new FileSystemStorageService();
  });

  it('should import books and calculate streak impact', async () => {
    // Initialize storage service (will use localStorage fallback)
    await storageService.initialize();

    // Create CSV data with books that have date ranges
    const csvData = [
      {
        'Title': 'The Great Gatsby',
        'Author': 'F. Scott Fitzgerald',
        'Status': 'finished',
        'Progress': '100',
        'Date Started': '2024-01-01',
        'Date Finished': '2024-01-05'
      },
      {
        'Title': '1984',
        'Author': 'George Orwell',
        'Status': 'finished',
        'Progress': '100',
        'Date Started': '2024-01-06',
        'Date Finished': '2024-01-10'
      },
      {
        'Title': 'To Kill a Mockingbird',
        'Author': 'Harper Lee',
        'Status': 'currently_reading',
        'Progress': '50',
        'Date Started': '2024-01-15',
        'Date Finished': ''
      }
    ];

    // Get the Puka native format
    const format = ImportService.getSupportedFormats().find(f => f.id === 'puka-native')!;

    // Process the import data
    const parsedData = ImportService.processImportData(csvData, format);
    expect(parsedData.books).toHaveLength(3);
    expect(parsedData.validRows).toBe(3);

    // Analyze streak data
    const streakPreview = ImportService.analyzeStreakData(parsedData.books);
    expect(streakPreview.periodsFound).toBe(2); // Only finished books with both dates
    expect(streakPreview.totalDaysToAdd).toBe(10); // 5 days + 5 days

    // Create import data
    const importData = ImportService.createImportData(parsedData.books);
    expect(importData.books).toHaveLength(3);

    // Import to storage
    const importResult = await storageService.importData(importData);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(3);

    // Verify books were imported
    const books = await storageService.getBooks();
    expect(books).toHaveLength(3);

    // Process streak import
    const booksWithDates = parsedData.books.filter(
      book => book.dateStarted && book.dateFinished
    );
    const streakResult = ImportService.processImportWithStreaks(
      booksWithDates,
      books
    );

    expect(streakResult.streakResult).toBeDefined();
    expect(streakResult.streakResult!.periodsProcessed).toBe(2);
    expect(streakResult.streakResult!.daysAdded).toBe(10);

    // Save streak history
    if (streakResult.streakResult) {
      const streakHistory = await storageService.getStreakHistory();
      expect(streakHistory).toBeNull(); // Should be null initially

      // Create and save new streak history
      const newHistory = {
        readingDays: new Set<string>(),
        bookPeriods: streakResult.importData.books
          .filter(book => book.dateStarted && book.dateFinished)
          .map(book => ({
            bookId: book.id || 0,
            title: book.title || 'Unknown Title',
            author: book.author || 'Unknown Author',
            startDate: book.dateStarted!,
            endDate: book.dateFinished!,
            totalDays: Math.ceil(
              (book.dateFinished!.getTime() - book.dateStarted!.getTime()) / 
              (1000 * 60 * 60 * 24)
            ) + 1
          })),
        lastCalculated: new Date()
      };

      // Add reading days
      for (const period of newHistory.bookPeriods) {
        const current = new Date(period.startDate);
        const end = new Date(period.endDate);
        while (current <= end) {
          newHistory.readingDays.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }

      const savedHistory = await storageService.saveStreakHistory(newHistory);
      expect(savedHistory.readingDays.size).toBe(10);
      expect(savedHistory.bookPeriods).toHaveLength(2);
    }
  });

  it('should handle CSV with mixed date formats', async () => {
    await storageService.initialize();

    const csvData = [
      {
        'Title': 'Book with ISO dates',
        'Author': 'Author 1',
        'Status': 'finished',
        'Progress': '100',
        'Date Started': '2024-01-01',
        'Date Finished': '2024-01-05'
      },
      {
        'Title': 'Book with slash dates',
        'Author': 'Author 2',
        'Status': 'finished',
        'Progress': '100',
        'Date Started': '01/10/2024',
        'Date Finished': '01/15/2024'
      }
    ];

    const format = ImportService.getSupportedFormats().find(f => f.id === 'puka-native')!;
    const parsedData = ImportService.processImportData(csvData, format);
    
    expect(parsedData.books).toHaveLength(2);
    expect(parsedData.books[0].dateStarted).toBeInstanceOf(Date);
    expect(parsedData.books[1].dateStarted).toBeInstanceOf(Date);
  });

  it('should skip books without proper date ranges', async () => {
    await storageService.initialize();

    const csvData = [
      {
        'Title': 'Complete book',
        'Author': 'Author 1',
        'Status': 'finished',
        'Progress': '100',
        'Date Started': '2024-01-01',
        'Date Finished': '2024-01-05'
      },
      {
        'Title': 'Book without dates',
        'Author': 'Author 2',
        'Status': 'finished',
        'Progress': '100',
        'Date Started': '',
        'Date Finished': ''
      },
      {
        'Title': 'Book with only start date',
        'Author': 'Author 3',
        'Status': 'currently_reading',
        'Progress': '50',
        'Date Started': '2024-01-10',
        'Date Finished': ''
      }
    ];

    const format = ImportService.getSupportedFormats().find(f => f.id === 'puka-native')!;
    const parsedData = ImportService.processImportData(csvData, format);
    const streakPreview = ImportService.analyzeStreakData(parsedData.books);

    expect(streakPreview.periodsFound).toBe(1); // Only the complete book
    expect(streakPreview.totalDaysToAdd).toBe(5); // Jan 1-5
  });
});