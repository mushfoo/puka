import { Book } from '@/types';
import { ExportData } from './storage/StorageService';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeMetadata?: boolean;
  includeSettings?: boolean;
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  error?: string;
}

/**
 * Service for exporting book data in various formats
 */
export class ExportService {
  /**
   * Export books to CSV format
   */
  static exportToCSV(books: Book[], includeMetadata: boolean = true): string {
    const headers = [
      'Title',
      'Author',
      'Status',
      'Progress',
      'Notes',
      'ISBN',
      'Genre',
      'Total Pages',
      'Current Page',
      'Rating',
      'Published Date',
      'Date Added',
      'Date Modified',
      'Date Started',
      'Date Finished'
    ];

    const rows = books.map(book => [
      this.escapeCSV(book.title),
      this.escapeCSV(book.author),
      this.escapeCSV(book.status),
      book.progress?.toString() || '0',
      this.escapeCSV(book.notes || ''),
      this.escapeCSV(book.isbn || ''),
      this.escapeCSV(book.genre || ''),
      book.totalPages?.toString() || '',
      book.currentPage?.toString() || '',
      book.rating?.toString() || '',
      this.escapeCSV(book.publishedDate || ''),
      this.formatDate(book.dateAdded),
      this.formatDate(book.dateModified),
      book.dateStarted ? this.formatDate(book.dateStarted) : '',
      book.dateFinished ? this.formatDate(book.dateFinished) : ''
    ]);

    let csvContent = headers.join(',') + '\n';
    csvContent += rows.map(row => row.join(',')).join('\n');

    if (includeMetadata) {
      csvContent += '\n\n# Export Metadata\n';
      csvContent += `# Export Date: ${new Date().toISOString()}\n`;
      csvContent += `# Total Books: ${books.length}\n`;
      csvContent += `# Exported from: Puka Reading Tracker\n`;
    }

    return csvContent;
  }

  /**
   * Export books to JSON format
   */
  static exportToJSON(exportData: ExportData): string {
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download export data as file
   */
  static downloadFile(content: string, filename: string, mimeType: string): ExportResult {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      return {
        success: true,
        filename
      };
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Export books with specified options
   */
  static async exportBooks(
    books: Book[], 
    exportData: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = options.filename || `puka-books-${timestamp}.${options.format}`;
      
      let content: string;
      let mimeType: string;
      
      if (options.format === 'csv') {
        content = this.exportToCSV(books, options.includeMetadata);
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        // Prepare JSON export data
        const jsonExportData: ExportData = {
          books: books,
          metadata: {
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            totalBooks: books.length
          }
        };
        
        if (options.includeSettings && exportData.settings) {
          jsonExportData.settings = exportData.settings;
        }
        
        content = this.exportToJSON(jsonExportData);
        mimeType = 'application/json;charset=utf-8;';
      }
      
      return this.downloadFile(content, filename, mimeType);
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Escape CSV values to handle commas, quotes, and newlines
   */
  private static escapeCSV(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Format date for CSV export
   */
  private static formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Generate Goodreads-compatible CSV export
   */
  static exportToGoodreadsCSV(books: Book[]): string {
    const headers = [
      'Title',
      'Author',
      'My Rating',
      'Average Rating',
      'Publisher',
      'Binding',
      'Number of Pages',
      'Year Published',
      'Original Publication Year',
      'Date Read',
      'Date Added',
      'Bookshelves',
      'My Review'
    ];

    const rows = books.map(book => [
      this.escapeCSV(book.title),
      this.escapeCSV(book.author),
      book.rating?.toString() || '',
      '', // Average Rating (not available)
      '', // Publisher (not available)
      '', // Binding (not available)
      book.totalPages?.toString() || '',
      book.publishedDate || '',
      book.publishedDate || '',
      book.dateFinished ? this.formatDate(book.dateFinished) : '',
      this.formatDate(book.dateAdded),
      this.mapStatusToGoodreadsShelf(book.status),
      this.escapeCSV(book.notes || '')
    ]);

    return headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Map Puka status to Goodreads shelf names
   */
  private static mapStatusToGoodreadsShelf(status: Book['status']): string {
    switch (status) {
      case 'want_to_read':
        return 'to-read';
      case 'currently_reading':
        return 'currently-reading';
      case 'finished':
        return 'read';
      default:
        return 'to-read';
    }
  }

  /**
   * Get available export formats
   */
  static getAvailableFormats(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'csv',
        label: 'CSV (Spreadsheet)',
        description: 'Compatible with Excel, Google Sheets, and most reading apps'
      },
      {
        value: 'json',
        label: 'JSON (Complete Data)',
        description: 'Full data backup including metadata and settings'
      },
      {
        value: 'goodreads-csv',
        label: 'Goodreads CSV',
        description: 'Compatible with Goodreads import format'
      }
    ];
  }

  /**
   * Export in Goodreads-compatible format
   */
  static async exportToGoodreads(books: Book[]): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `goodreads-export-${timestamp}.csv`;
      const content = this.exportToGoodreadsCSV(books);
      
      return this.downloadFile(content, filename, 'text/csv;charset=utf-8;');
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Goodreads export failed'
      };
    }
  }
}