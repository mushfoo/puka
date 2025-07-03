import { 
  Book, 
  StreakHistory, 
  EnhancedStreakHistory,
  ReadingDayMap, 
  ReadingDayEntry, 
  ReadingDataSource 
} from '@/types';
import { formatDateToLocalISO } from '@/utils/readingPeriodExtractor';

/**
 * Service for merging and managing reading data from multiple sources
 * 
 * Handles data from:
 * - Manual "I read today" entries from streak history
 * - Book completion dates (dateStarted, dateFinished)  
 * - Progress update timestamps
 */
export class ReadingDataService {
  /**
   * Merge reading data from multiple sources into a unified ReadingDayMap
   * 
   * @param streakHistory - Historical reading day data from manual entries
   * @param books - Array of books with dates and progress information
   * @returns ReadingDayMap with merged data from all sources
   */
  static mergeReadingData(
    streakHistory: StreakHistory | EnhancedStreakHistory | null,
    books: Book[]
  ): ReadingDayMap {
    const readingDayMap: ReadingDayMap = new Map();

    // Process manual entries from streak history
    if (streakHistory) {
      this.processManualEntries(readingDayMap, streakHistory);
    }

    // Process book completion dates
    this.processBookCompletions(readingDayMap, books);

    // Process progress update timestamps
    this.processProgressUpdates(readingDayMap, books);

    // Resolve conflicts and consolidate data
    this.consolidateReadingDays(readingDayMap);

    return readingDayMap;
  }

  /**
   * Get reading days within a specific date range
   * 
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @param readingData - Merged reading data map
   * @returns Array of ReadingDayEntry objects within the range
   */
  static getReadingDaysInRange(
    startDate: string,
    endDate: string,
    readingData: ReadingDayMap
  ): ReadingDayEntry[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: ReadingDayEntry[] = [];

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }

    if (start > end) {
      throw new Error('Start date must be before or equal to end date.');
    }

    // Iterate through all entries and filter by date range
    for (const [dateStr, entry] of readingData.entries()) {
      const entryDate = new Date(dateStr);
      
      if (entryDate >= start && entryDate <= end) {
        results.push(entry);
      }
    }

    // Sort by date ascending
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Resolve conflicts between different data sources using priority rules
   * 
   * Priority order:
   * 1. Manual entries (highest priority)
   * 2. Book completion dates
   * 3. Progress update timestamps (lowest priority)
   * 
   * @param entries - Array of ReadingDayEntry objects with potential conflicts
   * @returns Single resolved ReadingDayEntry
   */
  static resolveConflicts(entries: ReadingDayEntry[]): ReadingDayEntry {
    if (entries.length === 0) {
      throw new Error('Cannot resolve conflicts for empty array');
    }

    if (entries.length === 1) {
      return entries[0];
    }

    // Merge all entries for the same date
    const merged: ReadingDayEntry = {
      date: entries[0].date,
      sources: [],
      bookIds: [],
      notes: undefined
    };

    // Collect all sources and book IDs
    const allSources: ReadingDataSource[] = [];
    const allBookIds = new Set<number>();
    const notes: string[] = [];

    for (const entry of entries) {
      allSources.push(...entry.sources);
      entry.bookIds.forEach(id => allBookIds.add(id));
      if (entry.notes) {
        notes.push(entry.notes);
      }
    }

    // Sort sources by priority (manual > book_completion > progress_update)
    const priorityOrder = { 'manual': 3, 'book_completion': 2, 'progress_update': 1 };
    allSources.sort((a, b) => priorityOrder[b.type] - priorityOrder[a.type]);

    // Remove duplicate sources for the same book
    const uniqueSources = this.deduplicateSources(allSources);

    merged.sources = uniqueSources;
    merged.bookIds = Array.from(allBookIds).sort((a, b) => a - b);
    merged.notes = notes.length > 0 ? notes.join('; ') : undefined;

    return merged;
  }

  /**
   * Process manual "I read today" entries from streak history
   */
  private static processManualEntries(
    readingDayMap: ReadingDayMap,
    streakHistory: StreakHistory | EnhancedStreakHistory
  ): void {
    // Ensure readingDays exists and is iterable (it should be a Set)
    if (!streakHistory.readingDays) {
      console.warn('streakHistory.readingDays is undefined, skipping manual entries');
      return;
    }

    // Convert to array if it's not already iterable (defensive programming)
    let readingDays: Iterable<string>;
    try {
      if (Array.isArray(streakHistory.readingDays)) {
        readingDays = streakHistory.readingDays;
      } else if (streakHistory.readingDays instanceof Set) {
        readingDays = streakHistory.readingDays;
      } else {
        // Handle case where readingDays might be serialized differently
        console.warn('Unexpected readingDays type:', typeof streakHistory.readingDays);
        readingDays = Array.from(streakHistory.readingDays as any);
      }
    } catch (error) {
      console.error('Error processing readingDays:', error);
      return;
    }

    for (const dateStr of readingDays) {
      const source: ReadingDataSource = {
        type: 'manual',
        timestamp: new Date(), // Use current time as approximation
        metadata: {}
      };

      const entry: ReadingDayEntry = {
        date: dateStr,
        sources: [source],
        bookIds: [],
        notes: 'Manual entry'
      };

      this.addOrMergeEntry(readingDayMap, dateStr, entry);
    }
  }

  /**
   * Process book completion dates (dateStarted to dateFinished)
   */
  private static processBookCompletions(
    readingDayMap: ReadingDayMap,
    books: Book[]
  ): void {
    for (const book of books) {
      if (!book.dateStarted || !book.dateFinished) {
        continue;
      }

      const startDate = new Date(book.dateStarted);
      const endDate = new Date(book.dateFinished);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(`Invalid dates for book "${book.title}": start=${book.dateStarted}, end=${book.dateFinished}`);
        continue;
      }

      if (startDate > endDate) {
        console.warn(`Start date after end date for book "${book.title}"`);
        continue;
      }

      // Generate reading days for the entire period
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatDateToLocalISO(currentDate);
        
        const source: ReadingDataSource = {
          type: 'book_completion',
          timestamp: book.dateFinished,
          bookId: book.id,
          metadata: {
            progress: currentDate.getTime() === endDate.getTime() ? 100 : undefined,
            pages: book.totalPages
          }
        };

        const entry: ReadingDayEntry = {
          date: dateStr,
          sources: [source],
          bookIds: [book.id],
          notes: `Reading "${book.title}"`
        };

        this.addOrMergeEntry(readingDayMap, dateStr, entry);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  /**
   * Process progress update timestamps
   */
  private static processProgressUpdates(
    readingDayMap: ReadingDayMap,
    books: Book[]
  ): void {
    const today = new Date();
    const todayStr = formatDateToLocalISO(today);

    for (const book of books) {
      // Check for books modified recently that might indicate reading activity
      if (book.dateModified && book.progress > 0) {
        const modifiedDate = new Date(book.dateModified);
        const modifiedDateStr = formatDateToLocalISO(modifiedDate);

        // Only count as reading activity if modified within the last 7 days
        // and has made progress
        const daysSinceModified = Math.floor(
          (today.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceModified <= 7) {
          const source: ReadingDataSource = {
            type: 'progress_update',
            timestamp: modifiedDate,
            bookId: book.id,
            metadata: {
              progress: book.progress,
              pages: book.currentPage
            }
          };

          const entry: ReadingDayEntry = {
            date: modifiedDateStr,
            sources: [source],
            bookIds: [book.id],
            notes: `Progress update: ${book.progress}%`
          };

          this.addOrMergeEntry(readingDayMap, modifiedDateStr, entry);
        }
      }

      // Special handling for today's reading activity
      if (book.dateModified) {
        const modifiedDate = new Date(book.dateModified);
        const modifiedDateStr = formatDateToLocalISO(modifiedDate);
        
        if (modifiedDateStr === todayStr && book.progress > 0) {
          const source: ReadingDataSource = {
            type: 'progress_update',
            timestamp: modifiedDate,
            bookId: book.id,
            metadata: {
              progress: book.progress,
              pages: book.currentPage
            }
          };

          const entry: ReadingDayEntry = {
            date: todayStr,
            sources: [source],
            bookIds: [book.id],
            notes: `Today's reading: ${book.title}`
          };

          this.addOrMergeEntry(readingDayMap, todayStr, entry);
        }
      }
    }
  }

  /**
   * Add or merge an entry into the reading day map
   */
  private static addOrMergeEntry(
    readingDayMap: ReadingDayMap,
    dateStr: string,
    newEntry: ReadingDayEntry
  ): void {
    const existingEntry = readingDayMap.get(dateStr);
    
    if (existingEntry) {
      // Merge with existing entry
      const merged = this.resolveConflicts([existingEntry, newEntry]);
      readingDayMap.set(dateStr, merged);
    } else {
      // Add new entry
      readingDayMap.set(dateStr, newEntry);
    }
  }

  /**
   * Consolidate and clean up reading days after initial processing
   */
  private static consolidateReadingDays(readingDayMap: ReadingDayMap): void {
    // Apply any final cleanup and optimization
    for (const [dateStr, entry] of readingDayMap.entries()) {
      // Remove duplicate book IDs
      entry.bookIds = Array.from(new Set(entry.bookIds)).sort((a, b) => a - b);
      
      // Deduplicate sources
      entry.sources = this.deduplicateSources(entry.sources);
      
      // Update the map with cleaned entry
      readingDayMap.set(dateStr, entry);
    }
  }

  /**
   * Remove duplicate sources, keeping highest priority ones
   */
  private static deduplicateSources(sources: ReadingDataSource[]): ReadingDataSource[] {
    const priorityOrder = { 'manual': 3, 'book_completion': 2, 'progress_update': 1 };
    const sourceMap = new Map<string, ReadingDataSource>();

    for (const source of sources) {
      const key = `${source.type}-${source.bookId || 'no-book'}`;
      const existing = sourceMap.get(key);

      if (!existing || priorityOrder[source.type] > priorityOrder[existing.type]) {
        sourceMap.set(key, source);
      }
    }

    return Array.from(sourceMap.values())
      .sort((a, b) => priorityOrder[b.type] - priorityOrder[a.type]);
  }

  /**
   * Get reading statistics from merged data
   */
  static getReadingStatistics(readingData: ReadingDayMap): {
    totalReadingDays: number;
    totalBooks: number;
    sourceBreakdown: Record<string, number>;
    dateRange: { earliest: string | null; latest: string | null };
  } {
    const sourceBreakdown: Record<string, number> = {
      manual: 0,
      book_completion: 0,
      progress_update: 0
    };

    const allBookIds = new Set<number>();
    const dates = Array.from(readingData.keys()).sort();

    for (const entry of readingData.values()) {
      entry.bookIds.forEach(id => allBookIds.add(id));
      
      // Count sources (deduplicated by type)
      const sourceTypes = new Set(entry.sources.map(s => s.type));
      for (const type of sourceTypes) {
        sourceBreakdown[type]++;
      }
    }

    return {
      totalReadingDays: readingData.size,
      totalBooks: allBookIds.size,
      sourceBreakdown,
      dateRange: {
        earliest: dates.length > 0 ? dates[0] : null,
        latest: dates.length > 0 ? dates[dates.length - 1] : null
      }
    };
  }

  /**
   * Validate reading data for consistency
   */
  static validateReadingData(readingData: ReadingDayMap): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [dateStr, entry] of readingData.entries()) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push(`Invalid date format: ${dateStr}`);
      }

      // Validate entry structure
      if (!entry.sources || entry.sources.length === 0) {
        errors.push(`No sources for date: ${dateStr}`);
      }

      if (!entry.bookIds || !Array.isArray(entry.bookIds)) {
        errors.push(`Invalid bookIds for date: ${dateStr}`);
      }

      // Check for future dates
      const entryDate = new Date(dateStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (entryDate > today) {
        warnings.push(`Future date detected: ${dateStr}`);
      }

      // Check for very old dates (potential data issues)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (entryDate < twoYearsAgo) {
        warnings.push(`Very old reading date: ${dateStr} (${entryDate.toDateString()})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}