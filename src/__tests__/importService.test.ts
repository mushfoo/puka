import { describe, it, expect, beforeEach } from 'vitest';
import { ImportService } from '@/services/importService';
import { Book } from '@/types';

describe('ImportService', () => {
  describe('parseCSVText', () => {
    it('should parse Puka native CSV format correctly', () => {
      const csvText = `Title,Author,Status,Progress,Notes,ISBN,Genre,Total Pages,Rating
The Great Gatsby,F. Scott Fitzgerald,finished,100,Great book,978-0-7432-7356-5,Fiction,180,5
1984,George Orwell,currently_reading,75,Dystopian classic,978-0-452-28423-4,Fiction,328,4`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.suggestedFormat?.id).toBe('puka-native');
      expect(result.sampleBooks).toHaveLength(2);
      
      const firstBook = result.sampleBooks[0];
      expect(firstBook.title).toBe('The Great Gatsby');
      expect(firstBook.author).toBe('F. Scott Fitzgerald');
      expect(firstBook.status).toBe('finished');
      expect(firstBook.progress).toBe(100);
      expect(firstBook.rating).toBe(5);
    });

    it('should parse Goodreads CSV format correctly', () => {
      const csvText = `Title,Author,My Rating,Number of Pages,Bookshelves,My Review
The Hobbit,J.R.R. Tolkien,5,310,read,Amazing adventure
Dune,Frank Herbert,4,688,currently-reading,Complex but engaging`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.success).toBe(true);
      expect(result.suggestedFormat?.id).toBe('goodreads');
      expect(result.sampleBooks).toHaveLength(2);
      
      const firstBook = result.sampleBooks[0];
      expect(firstBook.title).toBe('The Hobbit');
      expect(firstBook.author).toBe('J.R.R. Tolkien');
      expect(firstBook.status).toBe('finished'); // 'read' mapped to 'finished'
      expect(firstBook.rating).toBe(5);
      expect(firstBook.totalPages).toBe(310);
    });

    it('should handle status mapping correctly', () => {
      const csvText = `Title,Author,Bookshelves
Book 1,Author 1,to-read
Book 2,Author 2,currently-reading
Book 3,Author 3,read`;

      const result = ImportService.parseCSVText(csvText);
      const books = result.sampleBooks;

      expect(books[0].status).toBe('want_to_read');
      expect(books[1].status).toBe('currently_reading');
      expect(books[2].status).toBe('finished');
    });

    it('should auto-determine status from progress when status not provided', () => {
      const csvText = `Title,Author,Progress
Book 1,Author 1,0
Book 2,Author 2,50
Book 3,Author 3,100`;

      const result = ImportService.parseCSVText(csvText);
      const books = result.sampleBooks;

      expect(books[0].status).toBe('want_to_read');
      expect(books[1].status).toBe('currently_reading');
      expect(books[2].status).toBe('finished');
    });

    it('should handle missing required fields gracefully', () => {
      const csvText = `Author,Status
F. Scott Fitzgerald,finished
George Orwell,reading`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.errors).toHaveLength(2); // Both rows missing title
      expect(result.errors[0].message).toContain('Title is required');
    });

    it('should validate progress values', () => {
      const csvText = `Title,Author,Progress
Valid Book,Author 1,50
Invalid Book 1,Author 2,150
Invalid Book 2,Author 3,-10`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.validRows).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should parse dates correctly', () => {
      const csvText = `Title,Author,Status,Progress,Date Added,Date Finished
Book 1,Author 1,finished,100,2023-01-15,2023-02-15
Book 2,Author 2,reading,50,01/20/2023,02/20/2023`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.sampleBooks).toHaveLength(2);
      expect(result.suggestedFormat?.id).toBe('puka-native');
      expect(result.sampleBooks[0].dateAdded).toBeInstanceOf(Date);
      expect(result.sampleBooks[0].dateFinished).toBeInstanceOf(Date);
    });

    it('should handle empty CSV gracefully', () => {
      const csvText = '';

      const result = ImportService.parseCSVText(csvText);

      expect(result.totalRows).toBe(0);
      expect(result.validRows).toBe(0);
      expect(result.sampleBooks).toHaveLength(0);
    });

    it('should handle malformed CSV', () => {
      const csvText = `Title,Author
"Unclosed quote,Author 1
Book 2,Author 2`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('processImportData', () => {
    it('should process valid import data correctly', () => {
      const csvData = [
        { Title: 'Book 1', Author: 'Author 1', Status: 'finished', Progress: '100' },
        { Title: 'Book 2', Author: 'Author 2', Status: 'reading', Progress: '50' }
      ];

      const format = ImportService.getSupportedFormats().find(f => f.id === 'puka-native')!;
      const result = ImportService.processImportData(csvData, format);

      expect(result.validRows).toBe(2);
      expect(result.totalRows).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.books).toHaveLength(2);
    });

    it('should skip invalid rows when skipInvalid is true', () => {
      const csvData = [
        { Author: 'Author 1', Status: 'finished' }, // Missing title
        { Title: 'Book 2', Author: 'Author 2', Status: 'reading' }
      ];

      const format = ImportService.getSupportedFormats().find(f => f.id === 'puka-native')!;
      const result = ImportService.processImportData(csvData, format, {
        mergeDuplicates: false,
        overwriteExisting: false,
        validateData: true,
        skipInvalid: true
      });

      expect(result.validRows).toBe(1);
      expect(result.totalRows).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.books).toHaveLength(1);
    });

    it('should throw error when skipInvalid is false and validation fails', () => {
      const csvData = [
        { Author: 'Author 1', Status: 'finished' } // Missing title
      ];

      const format = ImportService.getSupportedFormats().find(f => f.id === 'puka-native')!;

      expect(() => {
        ImportService.processImportData(csvData, format, {
          mergeDuplicates: false,
          overwriteExisting: false,
          validateData: true,
          skipInvalid: false
        });
      }).toThrow();
    });
  });

  describe('createImportData', () => {
    it('should convert parsed books to ImportData format', () => {
      const books: Partial<Book>[] = [
        {
          title: 'Test Book',
          author: 'Test Author',
          status: 'finished',
          progress: 100
        }
      ];

      const importData = ImportService.createImportData(books);

      expect(importData.books).toHaveLength(1);
      expect(importData.books[0].title).toBe('Test Book');
      expect(importData.books[0].author).toBe('Test Author');
      expect(importData.books[0].status).toBe('finished');
      expect(importData.books[0].progress).toBe(100);
    });

    it('should apply defaults for missing required fields', () => {
      const books: Partial<Book>[] = [
        {
          title: 'Test Book'
          // Missing author, status, progress
        }
      ];

      const importData = ImportService.createImportData(books);

      expect(importData.books[0].author).toBe('Unknown Author');
      expect(importData.books[0].status).toBe('want_to_read');
      expect(importData.books[0].progress).toBe(0);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported formats', () => {
      const formats = ImportService.getSupportedFormats();

      expect(formats).toHaveLength(3);
      expect(formats.find(f => f.id === 'puka-native')).toBeDefined();
      expect(formats.find(f => f.id === 'goodreads')).toBeDefined();
      expect(formats.find(f => f.id === 'generic')).toBeDefined();
    });
  });

  describe('createCustomFormat', () => {
    it('should create custom format with provided mapping', () => {
      const columnMapping = {
        'Book Title': 'title',
        'Book Author': 'author',
        'Read Status': 'status'
      };

      const customFormat = ImportService.createCustomFormat(columnMapping);

      expect(customFormat.id).toBe('custom');
      expect(customFormat.name).toBe('Custom Format');
      expect(customFormat.columnMapping).toEqual(columnMapping);
    });
  });

  describe('edge cases', () => {
    it('should handle numeric IDs in CSV data', () => {
      const csvText = `ID,Title,Author,Status
1,Book 1,Author 1,finished
2,Book 2,Author 2,reading`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.sampleBooks).toHaveLength(2);
      // Should ignore ID column since it's not in our mapping
      expect(result.sampleBooks[0].title).toBe('Book 1');
    });

    it('should handle special characters in book data', () => {
      const csvText = `Title,Author,Status,Progress,Notes
"Book with ""quotes""",Author & Co.,finished,100,"Notes with, commas"
Book with émojis 📚,Authør Nåme,reading,75,Review with newlines`;

      const result = ImportService.parseCSVText(csvText);

      expect(result.sampleBooks).toHaveLength(2);
      expect(result.suggestedFormat?.id).toBe('puka-native');
      expect(result.sampleBooks[0].title).toBe('Book with "quotes"');
      expect(result.sampleBooks[0].author).toBe('Author & Co.');
      expect(result.sampleBooks[0].notes).toBe('Notes with, commas');
    });

    it('should handle mixed case status values', () => {
      const csvText = `Title,Author,Status
Book 1,Author 1,FINISHED
Book 2,Author 2,Currently-Reading
Book 3,Author 3,want-to-read`;

      const result = ImportService.parseCSVText(csvText);
      const books = result.sampleBooks;

      expect(books[0].status).toBe('finished');
      expect(books[1].status).toBe('currently_reading');
      expect(books[2].status).toBe('want_to_read');
    });
  });
});