import { 
  Book, 
  StreakHistory, 
  EnhancedStreakHistory,
  EnhancedReadingDayEntry,
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
      
      // Also process enhanced reading day entries if available
      if ('readingDayEntries' in streakHistory && streakHistory.readingDayEntries) {
        this.processEnhancedEntries(readingDayMap, streakHistory.readingDayEntries);
      }
    }

    // Process book reading periods
    this.processBookReadingPeriods(readingDayMap, books);

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
      } else if (typeof streakHistory.readingDays === 'object' && streakHistory.readingDays !== null) {
        // Handle case where readingDays might be a serialized Set (converted to an object)
        console.warn('readingDays appears to be a serialized Set object, attempting to extract values');
        
        // Try different methods to extract values from serialized Set
        if ('values' in streakHistory.readingDays && typeof (streakHistory.readingDays as any).values === 'function') {
          readingDays = (streakHistory.readingDays as any).values();
        } else {
          // Extract values from object (serialized Set often has numeric keys)
          const obj = streakHistory.readingDays as any;
          const values = Object.values(obj).filter(v => typeof v === 'string');
          
          // If Object.values didn't work, try Object.keys (sometimes Set values become keys)
          if (values.length === 0) {
            const keys = Object.keys(obj).filter(k => k !== 'constructor' && k !== 'prototype');
            readingDays = keys.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)); // Only date-like strings
          } else {
            readingDays = values;
          }
          
        }
      } else {
        // Handle case where readingDays might be serialized differently
        console.warn('Unexpected readingDays type:', typeof streakHistory.readingDays);
        try {
          readingDays = Array.from(streakHistory.readingDays as any);
        } catch (e) {
          console.error('Failed to convert readingDays to iterable:', e);
          return;
        }
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
   * Process enhanced reading day entries from enhanced streak history
   */
  private static processEnhancedEntries(
    readingDayMap: ReadingDayMap,
    readingDayEntries: EnhancedReadingDayEntry[]
  ): void {
    
    for (const enhancedEntry of readingDayEntries) {
      const sourceType = enhancedEntry.source === 'manual' ? 'manual' : 
                        enhancedEntry.source === 'book' ? 'book_completion' : 'progress_update';
      
      const source: ReadingDataSource = {
        type: sourceType,
        timestamp: enhancedEntry.createdAt,
        metadata: {}
      };

      const entry: ReadingDayEntry = {
        date: enhancedEntry.date,
        sources: [source],
        bookIds: enhancedEntry.bookIds || [],
        notes: enhancedEntry.notes || undefined
      };

      this.addOrMergeEntry(readingDayMap, enhancedEntry.date, entry);
    }
  }

  /**
   * Process book reading periods (dateStarted to dateFinished or current date)
   * Handles both completed books and currently reading books
   */
  private static processBookReadingPeriods(
    readingDayMap: ReadingDayMap,
    books: Book[],
    timezoneName?: string
  ): void {
    // Use timezone-aware processing if timezone is specified
    if (timezoneName) {
      return this.processBookReadingPeriodsWithTimezone(readingDayMap, books, timezoneName);
    }
    for (const book of books) {
      if (!book.dateStarted) {
        continue;
      }

      const startDate = new Date(book.dateStarted);
      // For currently reading books, use dateModified or today as end date
      const endDate = book.dateFinished 
        ? new Date(book.dateFinished)
        : book.dateModified 
        ? new Date(book.dateModified)
        : new Date(); // Today if no other date available

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(`Invalid dates for book "${book.title}": start=${book.dateStarted}, end=${book.dateFinished || book.dateModified}`);
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
        
        const isCompleted = !!book.dateFinished;
        const isLastDay = currentDate.getTime() === endDate.getTime();
        
        const source: ReadingDataSource = {
          type: isCompleted ? 'book_completion' : 'progress_update',
          timestamp: book.dateFinished || book.dateModified || new Date(),
          bookId: book.id,
          metadata: {
            progress: isCompleted && isLastDay ? 100 : book.progress,
            pages: book.totalPages
          }
        };

        const entry: ReadingDayEntry = {
          date: dateStr,
          sources: [source],
          bookIds: [book.id],
          notes: isCompleted 
            ? `Reading "${book.title}"` 
            : `Currently reading "${book.title}" (${book.progress}%)`
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
      // IMPORTANT: Only create reading day entries for books that were genuinely updated,
      // not for books that were just imported. Skip books that were created today.
      if (book.dateModified && book.progress > 0 && book.dateAdded) {
        const modifiedDate = new Date(book.dateModified);
        const addedDate = new Date(book.dateAdded);
        const modifiedDateStr = formatDateToLocalISO(modifiedDate);

        // Skip if book was just imported (dateAdded and dateModified are the same day)
        const isSameDay = formatDateToLocalISO(modifiedDate) === formatDateToLocalISO(addedDate);
        if (isSameDay) {
          continue; // Don't create reading day entries for newly imported books
        }

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
   * Get extended reading statistics with more detailed analytics
   */
  static getExtendedReadingStatistics(readingData: ReadingDayMap): {
    totalReadingDays: number;
    totalBooks: number;
    sourceBreakdown: Record<string, number>;
    dateRange: { earliest: string | null; latest: string | null };
    readingFrequency: {
      averageDaysPerWeek: number;
      averageDaysPerMonth: number;
      longestGap: number;
      consistency: number; // 0-100 score
    };
    bookStats: {
      avgBooksPerMonth: number;
      mostActiveMonth: string | null;
      mostActiveYear: number | null;
    };
  } {
    const basicStats = this.getReadingStatistics(readingData);
    const dates = Array.from(readingData.keys()).sort();
    
    if (dates.length === 0) {
      return {
        ...basicStats,
        readingFrequency: {
          averageDaysPerWeek: 0,
          averageDaysPerMonth: 0,
          longestGap: 0,
          consistency: 0
        },
        bookStats: {
          avgBooksPerMonth: 0,
          mostActiveMonth: null,
          mostActiveYear: null
        }
      };
    }

    // Calculate reading frequency
    const earliestDate = new Date(dates[0]);
    const latestDate = new Date(dates[dates.length - 1]);
    const totalDays = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);
    const totalMonths = Math.ceil(totalDays / 30);
    
    const averageDaysPerWeek = totalWeeks > 0 ? Math.round((readingData.size / totalWeeks) * 100) / 100 : 0;
    const averageDaysPerMonth = totalMonths > 0 ? Math.round((readingData.size / totalMonths) * 100) / 100 : 0;
    
    // Calculate longest gap between reading days
    let longestGap = 0;
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const gap = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)) - 1;
      longestGap = Math.max(longestGap, gap);
    }
    
    // Calculate consistency score (0-100)
    const expectedReadingDays = Math.ceil(totalDays * 0.7); // Assume 70% reading is ideal
    const consistency = Math.min(100, Math.round((readingData.size / expectedReadingDays) * 100));
    
    // Calculate book statistics
    const monthlyStats = new Map<string, number>();
    const yearlyStats = new Map<number, number>();
    
    for (const entry of readingData.values()) {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const year = date.getFullYear();
      
      monthlyStats.set(monthKey, (monthlyStats.get(monthKey) || 0) + entry.bookIds.length);
      yearlyStats.set(year, (yearlyStats.get(year) || 0) + entry.bookIds.length);
    }
    
    const avgBooksPerMonth = monthlyStats.size > 0 
      ? Math.round((Array.from(monthlyStats.values()).reduce((sum, count) => sum + count, 0) / monthlyStats.size) * 100) / 100 
      : 0;
    
    const mostActiveMonth = monthlyStats.size > 0 
      ? Array.from(monthlyStats.entries()).reduce((max, [month, count]) => 
          count > max.count ? { month, count } : max, 
          { month: '', count: 0 }
        ).month 
      : null;
    
    const mostActiveYear = yearlyStats.size > 0 
      ? Array.from(yearlyStats.entries()).reduce((max, [year, count]) => 
          count > max.count ? { year, count } : max, 
          { year: 0, count: 0 }
        ).year 
      : null;
    
    return {
      ...basicStats,
      readingFrequency: {
        averageDaysPerWeek,
        averageDaysPerMonth,
        longestGap,
        consistency
      },
      bookStats: {
        avgBooksPerMonth,
        mostActiveMonth,
        mostActiveYear
      }
    };
  }

  /**
   * Aggregate reading data by time period
   */
  static aggregateByPeriod(
    readingData: ReadingDayMap,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Map<string, {
    period: string;
    readingDays: number;
    books: Set<number>;
    sources: { manual: number; book_completion: number; progress_update: number };
  }> {
    const aggregated = new Map<string, {
      period: string;
      readingDays: number;
      books: Set<number>;
      sources: { manual: number; book_completion: number; progress_update: number };
    }>();
    
    for (const [dateStr, entry] of readingData.entries()) {
      const date = new Date(dateStr);
      let periodKey: string;
      
      switch (period) {
        case 'daily':
          periodKey = dateStr;
          break;
        case 'weekly': {
          // Get Monday of the week
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          periodKey = formatDateToLocalISO(monday);
          break;
        }
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          periodKey = date.getFullYear().toString();
          break;
        default:
          periodKey = dateStr;
      }
      
      if (!aggregated.has(periodKey)) {
        aggregated.set(periodKey, {
          period: periodKey,
          readingDays: 0,
          books: new Set<number>(),
          sources: { manual: 0, book_completion: 0, progress_update: 0 }
        });
      }
      
      const agg = aggregated.get(periodKey)!;
      agg.readingDays++;
      entry.bookIds.forEach(id => agg.books.add(id));
      
      // Count sources by type
      const sourceTypes = new Set(entry.sources.map(s => s.type));
      for (const type of sourceTypes) {
        agg.sources[type]++;
      }
    }
    
    return aggregated;
  }

  /**
   * Find reading patterns and insights
   */
  static findReadingPatterns(readingData: ReadingDayMap): {
    weekdayPattern: Record<string, number>;
    monthlyTrends: Record<string, number>;
    streakAnalysis: {
      currentStreak: number;
      longestStreak: number;
      averageStreakLength: number;
      totalStreaks: number;
    };
    readingHabits: {
      isConsistentReader: boolean;
      preferredReadingDays: string[];
      readingIntensity: 'light' | 'moderate' | 'heavy';
    };
  } {
    const weekdayPattern: Record<string, number> = {
      'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 
      'Thursday': 0, 'Friday': 0, 'Saturday': 0
    };
    const monthlyTrends: Record<string, number> = {};
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Analyze weekday patterns
    for (const dateStr of readingData.keys()) {
      const date = new Date(dateStr);
      const weekday = weekdays[date.getDay()];
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      
      weekdayPattern[weekday]++;
      monthlyTrends[month] = (monthlyTrends[month] || 0) + 1;
    }
    
    // Analyze streaks
    const sortedDates = Array.from(readingData.keys()).sort();
    const streaks: number[] = [];
    let currentStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const dayDiff = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        streaks.push(tempStreak);
        tempStreak = 1;
      }
    }
    
    if (sortedDates.length > 0) {
      streaks.push(tempStreak);
    }
    
    // Calculate current streak
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = formatDateToLocalISO(today);
    const yesterdayStr = formatDateToLocalISO(yesterday);
    
    if (readingData.has(todayStr) || readingData.has(yesterdayStr)) {
      const startDate = readingData.has(todayStr) ? today : yesterday;
      currentStreak = 1;
      
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (readingData.has(formatDateToLocalISO(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    
    const longestStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
    const averageStreakLength = streaks.length > 0 ? 
      Math.round((streaks.reduce((sum, streak) => sum + streak, 0) / streaks.length) * 100) / 100 : 0;
    
    // Determine reading habits
    const totalDays = readingData.size;
    const isConsistentReader = totalDays > 30 && (currentStreak > 7 || averageStreakLength > 3);
    
    const preferredReadingDays = Object.entries(weekdayPattern)
      .filter(([, count]) => count > totalDays * 0.2) // Days with >20% of total reading
      .map(([day]) => day);
    
    const readingIntensity = totalDays > 100 ? 'heavy' : totalDays > 30 ? 'moderate' : 'light';
    
    return {
      weekdayPattern,
      monthlyTrends,
      streakAnalysis: {
        currentStreak,
        longestStreak,
        averageStreakLength,
        totalStreaks: streaks.length
      },
      readingHabits: {
        isConsistentReader,
        preferredReadingDays,
        readingIntensity
      }
    };
  }

  /**
   * Advanced conflict resolution with weighted scoring
   */
  static resolveConflictsAdvanced(entries: ReadingDayEntry[]): ReadingDayEntry {
    if (entries.length === 0) {
      throw new Error('Cannot resolve conflicts for empty array');
    }

    if (entries.length === 1) {
      return entries[0];
    }

    // Advanced scoring system for conflict resolution
    const scoreSource = (source: ReadingDataSource): number => {
      let score = 0;
      
      // Base priority scores
      switch (source.type) {
        case 'manual':
          score += 100;
          break;
        case 'book_completion':
          score += 80;
          break;
        case 'progress_update':
          score += 40;
          break;
      }
      
      // Recency bonus (more recent sources get higher scores)
      const daysSinceSource = Math.floor((Date.now() - source.timestamp.getTime()) / (1000 * 60 * 60 * 24));
      score += Math.max(0, 20 - daysSinceSource); // Up to 20 points for recent sources
      
      // Metadata completeness bonus
      if (source.metadata && Object.keys(source.metadata).length > 0) {
        score += 5;
      }
      
      // Book association bonus
      if (source.bookId) {
        score += 5;
      }
      
      return score;
    };

    // Merge all entries with weighted scoring
    const merged: ReadingDayEntry = {
      date: entries[0].date,
      sources: [],
      bookIds: [],
      notes: undefined
    };

    // Collect all sources with scores
    const scoredSources: { source: ReadingDataSource; score: number }[] = [];
    const allBookIds = new Set<number>();
    const notes: string[] = [];

    for (const entry of entries) {
      for (const source of entry.sources) {
        scoredSources.push({ source, score: scoreSource(source) });
      }
      entry.bookIds.forEach(id => allBookIds.add(id));
      if (entry.notes) {
        notes.push(entry.notes);
      }
    }

    // Sort sources by score (highest first)
    scoredSources.sort((a, b) => b.score - a.score);

    // Deduplicate sources based on type and book ID
    const uniqueSources = new Map<string, ReadingDataSource>();
    for (const { source } of scoredSources) {
      const key = `${source.type}-${source.bookId || 'no-book'}`;
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, source);
      }
    }

    merged.sources = Array.from(uniqueSources.values());
    merged.bookIds = Array.from(allBookIds).sort((a, b) => a - b);
    merged.notes = notes.length > 0 ? notes.join('; ') : undefined;

    return merged;
  }

  /**
   * Performance-optimized batch processing for large datasets
   */
  static mergeReadingDataBatch(
    streakHistory: StreakHistory | EnhancedStreakHistory | null,
    books: Book[],
    options: {
      chunkSize?: number;
      skipValidation?: boolean;
      timezoneName?: string;
    } = {}
  ): ReadingDayMap {
    const { chunkSize = 1000, skipValidation = false, timezoneName } = options;
    const readingDayMap: ReadingDayMap = new Map();

    // Process data in chunks to avoid memory issues with large datasets
    const processChunk = (items: any[], processor: (chunk: any[]) => void) => {
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        processor(chunk);
      }
    };

    // Process manual entries from streak history
    if (streakHistory) {
      this.processManualEntries(readingDayMap, streakHistory);
      
      // Also process enhanced reading day entries if available
      if ('readingDayEntries' in streakHistory && streakHistory.readingDayEntries) {
        this.processEnhancedEntries(readingDayMap, streakHistory.readingDayEntries);
      }
    }

    // Process books in chunks
    processChunk(books, (bookChunk) => {
      this.processBookReadingPeriods(readingDayMap, bookChunk, timezoneName);
      this.processProgressUpdates(readingDayMap, bookChunk);
    });

    // Skip validation for performance if requested
    if (!skipValidation) {
      this.consolidateReadingDays(readingDayMap);
    }

    return readingDayMap;
  }

  /**
   * Enhanced timezone-aware date processing
   */
  static processBookReadingPeriodsWithTimezone(
    readingDayMap: ReadingDayMap,
    books: Book[],
    timezoneName?: string
  ): void {
    const getLocalizedDate = (date: Date): Date => {
      if (!timezoneName) {
        return date;
      }
      
      try {
        // Use Intl.DateTimeFormat for proper timezone handling
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezoneName,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        
        const parts = formatter.formatToParts(date);
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
        
        return new Date(year, month, day);
      } catch (error) {
        console.warn(`Invalid timezone ${timezoneName}, falling back to local time`);
        return date;
      }
    };

    for (const book of books) {
      if (!book.dateStarted) {
        continue;
      }

      const startDate = getLocalizedDate(new Date(book.dateStarted));
      const endDate = book.dateFinished 
        ? getLocalizedDate(new Date(book.dateFinished))
        : book.dateModified 
        ? getLocalizedDate(new Date(book.dateModified))
        : new Date(); // Today if no other date available

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(`Invalid dates for book "${book.title}": start=${book.dateStarted}, end=${book.dateFinished || book.dateModified}`);
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
        
        const isCompleted = !!book.dateFinished;
        const isLastDay = currentDate.getTime() === endDate.getTime();
        
        const source: ReadingDataSource = {
          type: isCompleted ? 'book_completion' : 'progress_update',
          timestamp: book.dateFinished || book.dateModified || new Date(),
          bookId: book.id,
          metadata: {
            progress: isCompleted && isLastDay ? 100 : book.progress,
            pages: book.totalPages,
            timezone: timezoneName
          }
        };

        const entry: ReadingDayEntry = {
          date: dateStr,
          sources: [source],
          bookIds: [book.id],
          notes: isCompleted 
            ? `Reading "${book.title}"` 
            : `Currently reading "${book.title}" (${book.progress}%)`
        };

        this.addOrMergeEntry(readingDayMap, dateStr, entry);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  /**
   * Bulk operations for large datasets
   */
  static bulkOperations = {
    /**
     * Bulk insert reading days with optimized performance
     */
    insertReadingDays: (
      readingDayMap: ReadingDayMap,
      entries: { date: string; sources: ReadingDataSource[]; bookIds: number[]; notes?: string }[]
    ): void => {
      // Pre-allocate map capacity for better performance
      const batchSize = 100;
      
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        for (const entryData of batch) {
          const entry: ReadingDayEntry = {
            date: entryData.date,
            sources: entryData.sources,
            bookIds: entryData.bookIds,
            notes: entryData.notes
          };
          
          ReadingDataService.addOrMergeEntry(readingDayMap, entryData.date, entry);
        }
      }
    },

    /**
     * Bulk update reading days
     */
    updateReadingDays: (
      readingDayMap: ReadingDayMap,
      updates: { date: string; updater: (entry: ReadingDayEntry) => ReadingDayEntry }[]
    ): void => {
      for (const { date, updater } of updates) {
        const existing = readingDayMap.get(date);
        if (existing) {
          readingDayMap.set(date, updater(existing));
        }
      }
    },

    /**
     * Bulk delete reading days
     */
    deleteReadingDays: (
      readingDayMap: ReadingDayMap,
      dates: string[]
    ): void => {
      for (const date of dates) {
        readingDayMap.delete(date);
      }
    }
  };

  /**
   * Memory-efficient streaming operations for very large datasets
   */
  static streamingOperations = {
    /**
     * Process reading data in streaming fashion to handle very large datasets
     */
    processStreaming: function* (
      readingData: ReadingDayMap,
      processor: (entry: ReadingDayEntry) => ReadingDayEntry | null
    ): Generator<ReadingDayEntry, void, unknown> {
      for (const [, entry] of readingData.entries()) {
        const processed = processor(entry);
        if (processed) {
          yield processed;
        }
      }
    },

    /**
     * Filter reading data in streaming fashion
     */
    filterStreaming: function* (
      readingData: ReadingDayMap,
      predicate: (entry: ReadingDayEntry) => boolean
    ): Generator<ReadingDayEntry, void, unknown> {
      for (const entry of readingData.values()) {
        if (predicate(entry)) {
          yield entry;
        }
      }
    }
  };

  /**
   * Enhanced validation with detailed error reporting
   */
  static validateReadingDataEnhanced(readingData: ReadingDayMap): {
    isValid: boolean;
    errors: { code: string; message: string; date?: string; severity: 'error' | 'warning' }[];
    summary: {
      totalEntries: number;
      validEntries: number;
      errorCount: number;
      warningCount: number;
    };
  } {
    const errors: { code: string; message: string; date?: string; severity: 'error' | 'warning' }[] = [];
    let validEntries = 0;
    
    for (const [dateStr, entry] of readingData.entries()) {
      let entryValid = true;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push({
          code: 'INVALID_DATE_FORMAT',
          message: `Invalid date format: ${dateStr}`,
          date: dateStr,
          severity: 'error'
        });
        entryValid = false;
      }
      
      // Validate entry structure
      if (!entry.sources || entry.sources.length === 0) {
        errors.push({
          code: 'NO_SOURCES',
          message: `No sources for date: ${dateStr}`,
          date: dateStr,
          severity: 'error'
        });
        entryValid = false;
      }
      
      if (!entry.bookIds || !Array.isArray(entry.bookIds)) {
        errors.push({
          code: 'INVALID_BOOK_IDS',
          message: `Invalid bookIds for date: ${dateStr}`,
          date: dateStr,
          severity: 'error'
        });
        entryValid = false;
      }
      
      // Validate sources
      if (entry.sources) {
        for (const source of entry.sources) {
          if (!['manual', 'book_completion', 'progress_update'].includes(source.type)) {
            errors.push({
              code: 'INVALID_SOURCE_TYPE',
              message: `Invalid source type: ${source.type} for date: ${dateStr}`,
              date: dateStr,
              severity: 'error'
            });
            entryValid = false;
          }
          
          if (!source.timestamp || isNaN(source.timestamp.getTime())) {
            errors.push({
              code: 'INVALID_TIMESTAMP',
              message: `Invalid timestamp for date: ${dateStr}`,
              date: dateStr,
              severity: 'error'
            });
            entryValid = false;
          }
        }
      }
      
      // Check for future dates
      const entryDate = new Date(dateStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (entryDate > today) {
        errors.push({
          code: 'FUTURE_DATE',
          message: `Future date detected: ${dateStr}`,
          date: dateStr,
          severity: 'warning'
        });
      }
      
      // Check for very old dates (potential data issues)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      if (entryDate < twoYearsAgo) {
        errors.push({
          code: 'VERY_OLD_DATE',
          message: `Very old reading date: ${dateStr} (${entryDate.toDateString()})`,
          date: dateStr,
          severity: 'warning'
        });
      }
      
      if (entryValid) {
        validEntries++;
      }
    }
    
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    
    return {
      isValid: errorCount === 0,
      errors,
      summary: {
        totalEntries: readingData.size,
        validEntries,
        errorCount,
        warningCount
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