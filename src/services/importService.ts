import Papa from "papaparse";
import { Book, StreakImportResult } from "@/types";
import {
  ImportData,
  ImportError,
  ImportOptions,
} from "./storage/StorageService";
import {
  extractReadingPeriods,
  generateReadingDays,
  validateReadingPeriods,
  getReadingPeriodStats,
} from "@/utils/readingPeriodExtractor";
import { processStreakImport } from "@/utils/streakCalculator";
// import { processStreakImport } from '@/utils/streakCalculator'; // Disabled for now

export interface ColumnMapping {
  [key: string]: string; // CSV column name -> Book field name
}

export interface ImportFormat {
  id: string;
  name: string;
  description: string;
  columnMapping: ColumnMapping;
  statusMapping?: { [key: string]: Book["status"] };
  dateFormat?: string;
}

export interface ParsedImportData {
  books: Partial<Book>[];
  errors: ImportError[];
  totalRows: number;
  validRows: number;
}

export interface ImportPreview {
  success: boolean;
  totalRows: number;
  validRows: number;
  errors: ImportError[];
  sampleBooks: Partial<Book>[];
  suggestedFormat?: ImportFormat;
  columns: string[];
  streakPreview?: StreakPreview;
}

export interface StreakPreview {
  periodsFound: number;
  totalDaysToAdd: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
  warnings: { message: string }[];
  stats: {
    booksWithDates: number;
    averageDaysPerBook: number;
    overlappingPeriods: number;
  };
}

/**
 * Service for importing book data from various formats
 */
export class ImportService {
  private static readonly SUPPORTED_FORMATS: ImportFormat[] = [
    {
      id: "puka-native",
      name: "Puka Native CSV",
      description: "Native Puka export format",
      columnMapping: {
        Title: "title",
        Author: "author",
        Status: "status",
        Progress: "progress",
        Notes: "notes",
        ISBN: "isbn",
        Genre: "genre",
        "Total Pages": "totalPages",
        "Current Page": "currentPage",
        Rating: "rating",
        "Published Date": "publishedDate",
        "Date Added": "dateAdded",
        "Date Modified": "dateModified",
        "Date Started": "dateStarted",
        "Date Finished": "dateFinished",
      },
      statusMapping: {
        want_to_read: "want_to_read",
        currently_reading: "currently_reading",
        finished: "finished",
      },
    },
    {
      id: "goodreads",
      name: "Goodreads CSV",
      description: "Standard Goodreads export format",
      columnMapping: {
        Title: "title",
        Author: "author",
        "My Rating": "rating",
        "Number of Pages": "totalPages",
        "Year Published": "publishedDate",
        "Date Read": "dateFinished",
        "Date Added": "dateAdded",
        Bookshelves: "status",
        "My Review": "notes",
      },
      statusMapping: {
        "to-read": "want_to_read",
        "want-to-read": "want_to_read",
        "currently-reading": "currently_reading",
        reading: "currently_reading",
        read: "finished",
        finished: "finished",
      },
    },
    {
      id: "generic",
      name: "Generic CSV",
      description: "Generic CSV with flexible column mapping",
      columnMapping: {}, // Will be filled by user mapping
    },
  ];

  /**
   * Parse CSV file and return preview data
   */
  static async parseCSVFile(file: File): Promise<ImportPreview> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const preview = this.processParseResults(results);
          resolve(preview);
        },
        error: (error) => {
          resolve({
            success: false,
            totalRows: 0,
            validRows: 0,
            errors: [
              {
                row: 0,
                field: "file",
                message: `Failed to parse CSV: ${error.message}`,
                data: null,
              },
            ],
            sampleBooks: [],
            columns: [],
          });
        },
      });
    });
  }

  /**
   * Parse CSV text content and return preview data
   */
  static parseCSVText(csvText: string): ImportPreview {
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    return this.processParseResults(results);
  }

  /**
   * Process Papa Parse results into preview data
   */
  private static processParseResults(
    results: Papa.ParseResult<any>,
  ): ImportPreview {
    const errors: ImportError[] = [];
    const columns = results.meta.fields || [];

    // Add Papa Parse errors
    if (results.errors.length > 0) {
      results.errors.forEach((error, index) => {
        errors.push({
          row: error.row || index,
          field: "parse",
          message: error.message,
          data: null,
        });
      });
    }

    // Detect format
    const suggestedFormat = this.detectFormat(columns);

    // Process sample data (first 20 rows for preview, or all if fewer)
    const sampleData = results.data.slice(0, Math.min(results.data.length, 20));
    const sampleBooks: Partial<Book>[] = [];

    if (suggestedFormat) {
      sampleData.forEach((row, index) => {
        try {
          const book = this.convertRowToBook(row, suggestedFormat);
          sampleBooks.push(book);
        } catch (error) {
          errors.push({
            row: index,
            field: "conversion",
            message:
              error instanceof Error ? error.message : "Conversion failed",
            data: row,
          });
        }
      });
    }

    // Calculate validRows based on successful conversions for the full dataset
    const totalValidRows = suggestedFormat
      ? this.calculateValidRows(results.data, suggestedFormat)
      : 0;

    return {
      success: results.errors.length === 0,
      totalRows: results.data.length,
      validRows: totalValidRows,
      errors,
      sampleBooks,
      suggestedFormat,
      columns,
    };
  }

  /**
   * Calculate how many rows would be valid for import
   */
  private static calculateValidRows(data: any[], format: ImportFormat): number {
    let validCount = 0;

    data.forEach((row) => {
      try {
        this.convertRowToBook(row, format);
        validCount++;
      } catch (error) {
        // Row is invalid, don't count it
      }
    });
    return validCount;
  }

  /**
   * Detect import format based on column headers
   */
  private static detectFormat(columns: string[]): ImportFormat | undefined {
    if (!columns || columns.length === 0) {
      return this.SUPPORTED_FORMATS.find((f) => f.id === "generic");
    }

    const columnSet = new Set(columns.map((col) => col.toLowerCase().trim()));

    // Check for exact matches first
    for (const format of this.SUPPORTED_FORMATS) {
      if (format.id === "generic") continue;

      const formatColumns = Object.keys(format.columnMapping).map((col) =>
        col.toLowerCase().trim(),
      );
      const matchCount = formatColumns.filter((col) =>
        columnSet.has(col),
      ).length;

      // Format detection debug (can be removed in production)

      // Require at least 3 key columns to match for format detection
      if (matchCount >= 3) {
        const matchPercentage = matchCount / formatColumns.length;
        // If we match 40% or more of the expected columns, consider it a match
        if (matchPercentage >= 0.4) {
          return format;
        }
      }

      // Special check for key columns that strongly indicate a format
      if (format.id === "goodreads") {
        const keyGoodreadsColumns = ["title", "author", "bookshelves"];
        const keyMatches = keyGoodreadsColumns.filter((col) =>
          columnSet.has(col),
        ).length;
        if (keyMatches >= 2) {
          return format;
        }
      }

      if (format.id === "puka-native") {
        const keyPukaColumns = ["title", "author", "status", "progress"];
        const keyMatches = keyPukaColumns.filter((col) =>
          columnSet.has(col),
        ).length;
        if (keyMatches >= 3) {
          return format;
        }
      }
    }

    // If no format matches well, suggest generic format
    return this.SUPPORTED_FORMATS.find((f) => f.id === "generic");
  }

  /**
   * Convert CSV row to Book object
   */
  private static convertRowToBook(
    row: any,
    format: ImportFormat,
  ): Partial<Book> {
    const book: Partial<Book> = {};
    const errors: string[] = [];

    // For generic format, try to map common column names
    if (format.id === "generic") {
      return this.convertGenericRow(row);
    }

    // Map columns to book fields using format mapping
    for (const [csvColumn, bookField] of Object.entries(format.columnMapping)) {
      const value = row[csvColumn];
      if (value === undefined || value === null || value === "") continue;

      try {
        switch (bookField) {
          case "title":
          case "author":
          case "notes":
          case "isbn":
          case "genre":
          case "publishedDate":
            book[bookField] = String(value).trim();
            break;

          case "progress": {
            const progressValue = Number(value);
            if (!isNaN(progressValue)) {
              if (progressValue < 0 || progressValue > 100) {
                throw new Error(
                  `Progress must be between 0 and 100, got ${progressValue}`,
                );
              }
              book.progress = progressValue;
            }
            break;
          }

          case "rating": {
            const ratingValue = Number(value);
            if (!isNaN(ratingValue)) {
              if (ratingValue < 0 || ratingValue > 5) {
                throw new Error(
                  `Rating must be between 0 and 5, got ${ratingValue}`,
                );
              }
              book.rating = ratingValue;
            } else {
              book.rating = undefined;
            }
            break;
          }

          case "totalPages":
          case "currentPage": {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0) {
              book[bookField] = numValue;
            } else {
              book[bookField] = undefined;
            }
            break;
          }

          case "status":
            book.status = this.mapStatus(value, format.statusMapping);
            break;

          case "dateAdded":
          case "dateModified":
          case "dateStarted":
          case "dateFinished": {
            const date = this.parseDate(value);
            if (date) {
              book[bookField] = date;
            }
            break;
          }

          default:
            // Handle custom fields or unknown mappings
            (book as any)[bookField] = value;
        }
      } catch (error) {
        // For validation errors (progress, rating), re-throw to fail the entire row
        if (
          error instanceof Error &&
          (error.message.includes("Progress must be between") ||
            error.message.includes("Rating must be between"))
        ) {
          throw error;
        }
        // For other conversion errors, log and continue
        errors.push(`Failed to convert ${csvColumn}: ${error}`);
      }
    }

    // Set defaults for required fields
    if (!book.title) {
      throw new Error("Title is required");
    }
    if (!book.author) {
      book.author = "Unknown Author";
    }
    if (book.status === undefined) {
      book.status = "want_to_read";
    }
    if (book.progress === undefined) {
      book.progress = 0;
    }

    // Validate progress
    if (book.progress !== undefined) {
      book.progress = Math.max(0, Math.min(100, book.progress));
    }

    // Auto-set status based on progress if not explicitly set
    const statusColumn = this.getCSVColumnForField("status", format);
    if (book.progress !== undefined && statusColumn && !row[statusColumn]) {
      if (book.progress === 0) {
        book.status = "want_to_read";
      } else if (book.progress === 100) {
        book.status = "finished";
      } else {
        book.status = "currently_reading";
      }
    }

    return book;
  }

  /**
   * Convert generic CSV row to Book object by trying common column patterns
   */
  private static convertGenericRow(row: any): Partial<Book> {
    const book: Partial<Book> = {};

    // Common patterns for title
    const titlePatterns = ["title", "book", "book title", "name"];
    const authorPatterns = ["author", "author name", "writer", "by"];
    const statusPatterns = ["status", "shelf", "bookshelves", "reading status"];
    const progressPatterns = [
      "progress",
      "percent",
      "completion",
      "% complete",
    ];
    const ratingPatterns = ["rating", "my rating", "score", "stars"];
    const notesPatterns = ["notes", "review", "my review", "comments"];

    // Find title
    for (const pattern of titlePatterns) {
      const value = this.findColumnValue(row, pattern);
      if (value) {
        book.title = String(value).trim();
        break;
      }
    }

    // Find author
    for (const pattern of authorPatterns) {
      const value = this.findColumnValue(row, pattern);
      if (value) {
        book.author = String(value).trim();
        break;
      }
    }

    // Find status
    for (const pattern of statusPatterns) {
      const value = this.findColumnValue(row, pattern);
      if (value) {
        book.status = this.mapStatus(value);
        break;
      }
    }

    // Find progress
    for (const pattern of progressPatterns) {
      const value = this.findColumnValue(row, pattern);
      if (value) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          if (numValue < 0 || numValue > 100) {
            throw new Error(
              `Progress must be between 0 and 100, got ${numValue}`,
            );
          }
          book.progress = numValue;
        }
        break;
      }
    }

    // Find rating
    for (const pattern of ratingPatterns) {
      const value = this.findColumnValue(row, pattern);
      if (value) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          if (numValue < 0 || numValue > 5) {
            throw new Error(`Rating must be between 0 and 5, got ${numValue}`);
          }
          book.rating = numValue;
        }
        break;
      }
    }

    // Find notes
    for (const pattern of notesPatterns) {
      const value = this.findColumnValue(row, pattern);
      if (value) {
        book.notes = String(value).trim();
        break;
      }
    }

    // Set defaults
    if (!book.title) {
      throw new Error("Title is required");
    }
    if (!book.author) {
      book.author = "Unknown Author";
    }
    if (book.status === undefined) {
      book.status = "want_to_read";
    }
    if (book.progress === undefined) {
      book.progress = 0;
    }

    return book;
  }

  /**
   * Find column value by pattern matching (case-insensitive)
   */
  private static findColumnValue(row: any, pattern: string): any {
    const keys = Object.keys(row);
    for (const key of keys) {
      if (key.toLowerCase().trim() === pattern.toLowerCase().trim()) {
        return row[key];
      }
    }
    return null;
  }

  /**
   * Map status value to Book status
   */
  private static mapStatus(
    value: string,
    statusMapping?: { [key: string]: Book["status"] },
  ): Book["status"] {
    if (!value) return "want_to_read";

    const normalizedValue = value.toLowerCase().trim();

    // Use format-specific mapping if available
    if (statusMapping && statusMapping[normalizedValue]) {
      return statusMapping[normalizedValue];
    }

    // Fallback to common mappings
    if (
      normalizedValue.includes("want") ||
      normalizedValue.includes("to-read")
    ) {
      return "want_to_read";
    }
    if (
      normalizedValue.includes("reading") ||
      normalizedValue.includes("current")
    ) {
      return "currently_reading";
    }
    if (
      normalizedValue.includes("finished") ||
      normalizedValue.includes("read") ||
      normalizedValue.includes("done")
    ) {
      return "finished";
    }

    return "want_to_read";
  }

  /**
   * Parse date string to Date object
   */
  private static parseDate(dateStr: string): Date | undefined {
    if (!dateStr || dateStr.trim() === "") return undefined;

    // Try parsing as ISO date first
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ];

    for (const format of formats) {
      if (format.test(dateStr)) {
        date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Get CSV column name for a book field
   */
  private static getCSVColumnForField(
    field: string,
    format: ImportFormat,
  ): string | undefined {
    for (const [csvColumn, bookField] of Object.entries(format.columnMapping)) {
      if (bookField === field) {
        return csvColumn;
      }
    }
    return undefined;
  }

  /**
   * Import books from parsed data
   */
  static processImportData(
    csvData: any[],
    format: ImportFormat,
    options: ImportOptions = {
      mergeDuplicates: false,
      overwriteExisting: false,
      validateData: true,
      skipInvalid: true,
    },
  ): ParsedImportData {
    const books: Partial<Book>[] = [];
    const errors: ImportError[] = [];
    let validRows = 0;

    csvData.forEach((row, index) => {
      try {
        if (options.validateData) {
          this.validateRow(row, format);
        }

        const book = this.convertRowToBook(row, format);
        const cleanedBook = this.cleanNullValues(book);
        books.push(cleanedBook);
        validRows++;
      } catch (error) {
        errors.push({
          row: index + 1,
          field: "general",
          message: error instanceof Error ? error.message : "Invalid row data",
          data: row,
        });

        if (!options.skipInvalid) {
          throw error;
        }
      }
    });

    console.log("Processed books:", books);

    return {
      books,
      errors,
      totalRows: csvData.length,
      validRows,
    };
  }

  /**
   * Validate CSV row data
   */
  private static validateRow(row: any, format: ImportFormat): void {
    // Check for required fields
    const titleColumn = this.getCSVColumnForField("title", format);
    if (titleColumn && (!row[titleColumn] || row[titleColumn].trim() === "")) {
      throw new Error("Title is required");
    }

    // Validate progress if present
    const progressColumn = this.getCSVColumnForField("progress", format);
    if (progressColumn && row[progressColumn] !== undefined) {
      const progress = Number(row[progressColumn]);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        throw new Error("Progress must be a number between 0 and 100");
      }
    }

    // Validate rating if present
    const ratingColumn = this.getCSVColumnForField("rating", format);
    if (ratingColumn && row[ratingColumn] !== undefined) {
      const rating = Number(row[ratingColumn]);
      if (isNaN(rating) || rating < 0 || rating > 5) {
        throw new Error("Rating must be a number between 0 and 5");
      }
    }
  }

  /**
   * Clean null values from book object, converting them to undefined
   * This allows Zod defaults and optional fields to work properly
   */
  private static cleanNullValues(book: Partial<Book>): Partial<Book> {
    const cleaned: Partial<Book> = {};

    for (const [key, value] of Object.entries(book)) {
      // Convert null, empty strings, and invalid values to undefined
      if (
        value === null ||
        value === "" ||
        value === "null" ||
        value === "NULL"
      ) {
        cleaned[key as keyof Book] = undefined;
      } else {
        (cleaned as any)[key] = value;
      }
    }

    console.log("Cleaned book data:", cleaned);
    return cleaned;
  }

  /**
   * Get supported import formats
   */
  static getSupportedFormats(): ImportFormat[] {
    return [...this.SUPPORTED_FORMATS];
  }

  /**
   * Create custom format from column mapping
   */
  static createCustomFormat(columnMapping: ColumnMapping): ImportFormat {
    return {
      id: "custom",
      name: "Custom Format",
      description: "User-defined column mapping",
      columnMapping,
    };
  }

  /**
   * Convert parsed data to ImportData format
   */
  static createImportData(books: Partial<Book>[]): ImportData {
    return {
      books: books.map((book) => {
        // Remove id and dateAdded if they exist (should be generated by storage)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, dateAdded: _dateAdded, ...cleanBook } = book as any;

        return {
          ...cleanBook,
          // Ensure required fields have defaults
          title: book.title || "Untitled",
          author: book.author || "Unknown Author",
          status: book.status || "want_to_read",
          progress: book.progress ?? 0,
          // Add dateModified if not present
          dateModified: book.dateModified || new Date(),
        };
      }) as Omit<Book, "id" | "dateAdded">[],
    };
  }

  /**
   * Analyze import data for streak information
   */
  static analyzeStreakData(books: Partial<Book>[]): StreakPreview {
    // Convert to Book format for analysis
    const completeBooks = books.map((book) => ({
      ...book,
      id: 0, // Temporary ID for analysis
      title: book.title || "Untitled",
      author: book.author || "Unknown Author",
      status: book.status || "want_to_read",
      progress: book.progress ?? 0,
      dateAdded: new Date(),
    })) as Book[];

    // Extract reading periods
    const periods = extractReadingPeriods(completeBooks);
    const { valid: validPeriods, warnings } = validateReadingPeriods(periods);
    const readingDays = generateReadingDays(validPeriods);
    const stats = getReadingPeriodStats(validPeriods);

    // Find date range
    let earliest: Date | null = null;
    let latest: Date | null = null;

    if (validPeriods.length > 0) {
      const allDates = validPeriods.flatMap((p) => [p.startDate, p.endDate]);
      earliest = new Date(Math.min(...allDates.map((d) => d.getTime())));
      latest = new Date(Math.max(...allDates.map((d) => d.getTime())));
    }

    return {
      periodsFound: validPeriods.length,
      totalDaysToAdd: readingDays.size,
      dateRange: { earliest, latest },
      warnings: warnings.map((w) => ({ message: w.message })),
      stats: {
        booksWithDates: validPeriods.length,
        averageDaysPerBook: stats.averageDaysPerBook,
        overlappingPeriods: stats.overlappingPeriods,
      },
    };
  }

  /**
   * Process import with streak calculation
   */
  static processImportWithStreaks(
    importedBooks: Partial<Book>[],
    _existingBooks: Book[], // Disabled for now - not used without streak import

    _options: ImportOptions = {
      mergeDuplicates: false,
      overwriteExisting: false,
      validateData: true,
      skipInvalid: true,
    },
  ): {
    importData: ParsedImportData;
    streakResult?: StreakImportResult;
  } {
    // Process regular import data
    const completeBooks = importedBooks.map((book) => ({
      ...book,
      id: Math.floor(Math.random() * 1000000), // Generate temporary ID
      title: book.title || "Untitled",
      author: book.author || "Unknown Author",
      status: book.status || "want_to_read",
      progress: book.progress ?? 0,
      dateAdded: new Date(),
    })) as Book[];

    const importData: ParsedImportData = {
      books: completeBooks,
      errors: [],
      totalRows: importedBooks.length,
      validRows: completeBooks.length,
    };

    // Calculate streak impact if books have date information
    // NOTE: Disabled automatic streak import to prevent unwanted reading day creation
    // Reading days should be manually created by users, not auto-generated from imports
    let streakResult: StreakImportResult | undefined;
    const booksWithDates = completeBooks.filter(
      (book) => book.dateStarted && book.dateFinished,
    );

    // Only show preview, don't automatically create reading day entries
    if (booksWithDates.length > 0) {
      // For now, we're not auto-creating reading day entries during import
      // Users can manually mark reading days if needed
      //
      // To re-enable automatic streak import, uncomment:
      try {
        streakResult = processStreakImport(booksWithDates, booksWithDates);
      } catch (error) {
        console.warn("Failed to calculate streak impact:", error);
      }
    }

    return { importData, streakResult };
  }
}
