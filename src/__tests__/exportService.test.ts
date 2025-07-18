import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from '@/services/exportService';
import { Book } from '@/types';
import { ExportData } from '@/services/storage/StorageService';

// Mock DOM methods
global.document = {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    style: { display: '' },
    click: vi.fn()
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
} as any;

global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
} as any;

global.Blob = vi.fn((_content, options) => ({
  type: options?.type || 'text/plain'
})) as any;

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    status: 'finished',
    progress: 100,
    notes: 'Classic American literature',
    isbn: '9780743273565',
    genre: 'Fiction',
    totalPages: 180,
    currentPage: 180,
    rating: 5,
    publishedDate: '1925',
    dateAdded: new Date('2023-01-01'),
    dateModified: new Date('2023-01-15'),
    dateStarted: new Date('2023-01-01'),
    dateFinished: new Date('2023-01-15')
  },
  {
    id: 2,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    status: 'currently_reading',
    progress: 75,
    notes: 'Powerful story about justice',
    genre: 'Fiction',
    totalPages: 281,
    currentPage: 210,
    rating: 4,
    publishedDate: '1960',
    dateAdded: new Date('2023-02-01'),
    dateModified: new Date('2023-02-10'),
    dateStarted: new Date('2023-02-01')
  },
  {
    id: 3,
    title: 'JavaScript: The Good Parts',
    author: 'Douglas Crockford',
    status: 'want_to_read',
    progress: 0,
    isbn: '9780596517748',
    genre: 'Technology',
    totalPages: 153,
    publishedDate: '2008',
    dateAdded: new Date('2023-03-01'),
    dateModified: new Date('2023-03-01')
  }
];

const mockExportData: ExportData = {
  books: mockBooks,
  metadata: {
    exportDate: '2023-03-15T10:30:00.000Z',
    version: '1.0.0',
    totalBooks: 3
  },
  settings: {
    theme: 'system',
    dailyReadingGoal: 30,
    defaultView: 'grid',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    notificationsEnabled: true,
    autoBackup: false,
    backupFrequency: 'weekly'
  }
};

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setTimeout for URL cleanup
    vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 1 as any;
    });
  });

  describe('exportToCSV', () => {
    it('exports books to CSV format with headers', () => {
      const csv = ExportService.exportToCSV(mockBooks);
      
      expect(csv).toContain('Title,Author,Status,Progress');
      expect(csv).toContain('The Great Gatsby,F. Scott Fitzgerald,finished,100');
      expect(csv).toContain('To Kill a Mockingbird,Harper Lee,currently_reading,75');
      expect(csv).toContain('JavaScript: The Good Parts,Douglas Crockford,want_to_read,0');
    });

    it('includes metadata when requested', () => {
      const csv = ExportService.exportToCSV(mockBooks, true);
      
      expect(csv).toContain('# Export Metadata');
      expect(csv).toContain('# Total Books: 3');
      expect(csv).toContain('# Exported from: Puka Reading Tracker');
    });

    it('excludes metadata when not requested', () => {
      const csv = ExportService.exportToCSV(mockBooks, false);
      
      expect(csv).not.toContain('# Export Metadata');
      expect(csv).not.toContain('# Total Books');
    });

    it('escapes CSV values with commas and quotes', () => {
      const booksWithSpecialChars: Book[] = [
        {
          id: 1,
          title: 'Book with, comma',
          author: 'Author "with quotes"',
          status: 'finished',
          progress: 100,
          notes: 'Notes with\nnewlines',
          dateAdded: new Date('2023-01-01'),
          dateModified: new Date('2023-01-01')
        }
      ];
      
      const csv = ExportService.exportToCSV(booksWithSpecialChars);
      
      expect(csv).toContain('"Book with, comma"');
      expect(csv).toContain('"Author ""with quotes"""');
      expect(csv).toContain('"Notes with\nnewlines"');
    });

    it('handles empty and undefined values', () => {
      const booksWithEmptyValues: Book[] = [
        {
          id: 1,
          title: 'Test Book',
          author: 'Test Author',
          status: 'finished',
          progress: 100,
          notes: undefined,
          isbn: '',
          genre: undefined,
          dateAdded: new Date('2023-01-01'),
          dateModified: new Date('2023-01-01')
        }
      ];
      
      const csv = ExportService.exportToCSV(booksWithEmptyValues);
      
      expect(csv).toContain('Test Book,Test Author,finished,100,,,,');
    });
  });

  describe('exportToJSON', () => {
    it('exports data to formatted JSON', () => {
      const json = ExportService.exportToJSON(mockExportData);
      const parsed = JSON.parse(json);
      
      expect(parsed.books).toHaveLength(3);
      expect(parsed.metadata.totalBooks).toBe(3);
      expect(parsed.settings.theme).toBe('system');
    });

    it('preserves all data structure', () => {
      const json = ExportService.exportToJSON(mockExportData);
      const parsed = JSON.parse(json);
      
      // JSON serialization converts Dates to strings
      expect(parsed.books).toHaveLength(3);
      expect(parsed.metadata.totalBooks).toBe(3);
      expect(parsed.settings.theme).toBe('system');
      expect(parsed.books[0].title).toBe('The Great Gatsby');
      expect(parsed.books[0].dateAdded).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('downloadFile', () => {
    it('creates download link and triggers download', () => {
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = ExportService.downloadFile('test content', 'test.txt', 'text/plain');
      
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalledWith(['test content'], { type: 'text/plain' });
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.click).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.filename).toBe('test.txt');
    });

    it('handles download errors', () => {
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(() => { throw new Error('Download failed'); })
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = ExportService.downloadFile('test content', 'test.txt', 'text/plain');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Download failed');
    });
  });

  describe('exportBooks', () => {
    it('exports books in CSV format', async () => {
      const options = {
        format: 'csv' as const,
        includeMetadata: true,
        includeSettings: false
      };
      
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = await ExportService.exportBooks(mockBooks, mockExportData, options);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/puka-books-.*\.csv/);
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Title,Author,Status')],
        { type: 'text/csv;charset=utf-8;' }
      );
    });

    it('exports books in JSON format', async () => {
      const options = {
        format: 'json' as const,
        includeMetadata: true,
        includeSettings: true
      };
      
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = await ExportService.exportBooks(mockBooks, mockExportData, options);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/puka-books-.*\.json/);
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('"books"')],
        { type: 'application/json;charset=utf-8;' }
      );
    });

    it('uses custom filename when provided', async () => {
      const options = {
        format: 'csv' as const,
        filename: 'my-custom-export.csv'
      };
      
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = await ExportService.exportBooks(mockBooks, mockExportData, options);
      
      expect(result.filename).toBe('my-custom-export.csv');
    });

    it('generates timestamped filename when not provided', async () => {
      const options = {
        format: 'json' as const
      };
      
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = await ExportService.exportBooks(mockBooks, mockExportData, options);
      
      expect(result.filename).toMatch(/puka-books-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json/);
    });
  });

  describe('exportToGoodreadsCSV', () => {
    it('exports in Goodreads-compatible format', () => {
      const csv = ExportService.exportToGoodreadsCSV(mockBooks);
      
      expect(csv).toContain('Title,Author,My Rating,Average Rating');
      expect(csv).toContain('The Great Gatsby,F. Scott Fitzgerald,5,');
      expect(csv).toContain('read,Classic American literature');
      expect(csv).toContain('currently-reading,Powerful story about justice');
      expect(csv).toContain('to-read,');
    });

    it('maps status to Goodreads shelf names', () => {
      const csv = ExportService.exportToGoodreadsCSV(mockBooks);
      
      expect(csv).toContain('to-read'); // want_to_read -> to-read
      expect(csv).toContain('currently-reading'); // currently_reading -> currently-reading
      expect(csv).toContain('read'); // finished -> read
    });

    it('includes date finished for completed books', () => {
      const csv = ExportService.exportToGoodreadsCSV(mockBooks);
      
      expect(csv).toContain('2023-01-15'); // dateFinished for The Great Gatsby
    });
  });

  describe('exportToGoodreads', () => {
    it('exports to Goodreads format and triggers download', async () => {
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      (global.document.createElement as any).mockReturnValueOnce(mockLink);
      
      const result = await ExportService.exportToGoodreads(mockBooks);
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/goodreads-export-.*\.csv/);
      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('Title,Author,My Rating')],
        { type: 'text/csv;charset=utf-8;' }
      );
    });
  });

  describe('getAvailableFormats', () => {
    it('returns available export formats', () => {
      const formats = ExportService.getAvailableFormats();
      
      expect(formats).toHaveLength(3);
      expect(formats[0].value).toBe('csv');
      expect(formats[1].value).toBe('json');
      expect(formats[2].value).toBe('goodreads-csv');
      
      formats.forEach(format => {
        expect(format).toHaveProperty('label');
        expect(format).toHaveProperty('description');
      });
    });
  });
});