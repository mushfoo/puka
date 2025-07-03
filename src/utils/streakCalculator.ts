import { Book, StreakData, StreakHistory, StreakImportResult } from '@/types';
import { 
  extractReadingPeriods, 
  generateReadingDays, 
  calculateStreaksFromDays,
  formatDateToISO 
} from './readingPeriodExtractor';
import { ReadingDataService } from '@/services/ReadingDataService';

export interface ProgressEntry {
  date: Date;
  oldProgress: number;
  newProgress: number;
  pagesRead: number;
}

/**
 * Calculate reading streak based on book progress updates
 */
export function calculateStreak(books: Book[], dailyGoal: number = 30): StreakData {
  // Get all progress updates from books
  const progressEntries: ProgressEntry[] = [];
  
  for (const book of books) {
    // Add date when book was started reading
    if (book.dateStarted && book.progress > 0) {
      progressEntries.push({
        date: new Date(book.dateStarted),
        oldProgress: 0,
        newProgress: book.progress,
        pagesRead: book.totalPages ? Math.round((book.progress / 100) * book.totalPages) : 0
      });
    }
    
    // Add date when book was finished
    if (book.dateFinished && book.progress === 100) {
      progressEntries.push({
        date: new Date(book.dateFinished),
        oldProgress: 99, // Assume it was almost done
        newProgress: 100,
        pagesRead: book.totalPages ? Math.round(book.totalPages * 0.01) : 1 // Assume 1% was read to finish
      });
    }
    
    // For books modified today, add an entry
    if (book.dateModified) {
      const modifiedDate = new Date(book.dateModified);
      const today = new Date();
      if (isSameDay(modifiedDate, today) && book.progress > 0) {
        progressEntries.push({
          date: modifiedDate,
          oldProgress: Math.max(0, book.progress - 10), // Estimate previous progress
          newProgress: book.progress,
          pagesRead: book.totalPages ? Math.round(((book.progress - Math.max(0, book.progress - 10)) / 100) * book.totalPages) : 1
        });
      }
    }
  }
  
  // Sort entries by date
  progressEntries.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Group entries by date
  const dailyProgress = new Map<string, number>();
  
  for (const entry of progressEntries) {
    const dateKey = entry.date.toDateString();
    const currentPages = dailyProgress.get(dateKey) || 0;
    dailyProgress.set(dateKey, currentPages + entry.pagesRead);
  }
  
  // Calculate current streak
  const today = new Date();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastReadDate: Date | null = null;
  
  // Check from today backwards
  for (let i = 0; i < 365; i++) { // Check up to a year
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateKey = checkDate.toDateString();
    
    if (dailyProgress.has(dateKey) && dailyProgress.get(dateKey)! > 0) {
      if (i === 0 || tempStreak > 0) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      }
      if (!lastReadDate || checkDate > lastReadDate) {
        lastReadDate = checkDate;
      }
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 0;
    }
  }
  
  // Update longest streak if current streak is longer
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }
  
  // Calculate today's progress
  const todayKey = today.toDateString();
  const todayProgress = dailyProgress.get(todayKey) || 0;
  const hasReadToday = todayProgress > 0;
  
  return {
    currentStreak,
    longestStreak,
    lastReadDate,
    todayProgress,
    dailyGoal,
    hasReadToday
  };
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

/**
 * Track a progress update for streak calculation
 */
export function trackProgressUpdate(
  book: Book, 
  oldProgress: number, 
  newProgress: number
): ProgressEntry {
  const pagesRead = book.totalPages 
    ? Math.round(((newProgress - oldProgress) / 100) * book.totalPages)
    : Math.max(1, Math.round((newProgress - oldProgress) / 10)); // Estimate if no page count
    
  return {
    date: new Date(),
    oldProgress,
    newProgress,
    pagesRead: Math.max(0, pagesRead)
  };
}

/**
 * Calculate streaks from imported books with reading periods
 */
export function calculateStreakFromImport(books: Book[], dailyGoal: number = 30): StreakImportResult {
  // Get current streak data before import
  const currentStreakData = calculateStreak(books, dailyGoal);
  const oldCurrentStreak = currentStreakData.currentStreak;
  const oldLongestStreak = currentStreakData.longestStreak;
  
  // Extract reading periods from imported books
  const readingPeriods = extractReadingPeriods(books);
  const readingDays = generateReadingDays(readingPeriods);
  
  // Calculate new streaks from reading periods
  const { currentStreak, longestStreak } = calculateStreaksFromDays(readingDays);
  
  return {
    periodsProcessed: readingPeriods.length,
    daysAdded: readingDays.size,
    readingDaysGenerated: readingDays,
    newCurrentStreak: currentStreak,
    newLongestStreak: longestStreak,
    oldCurrentStreak,
    oldLongestStreak
  };
}

/**
 * Calculate streaks from both existing books and reading periods
 */
export function calculateStreakWithHistory(
  books: Book[], 
  streakHistory?: StreakHistory,
  dailyGoal: number = 30
): StreakData {
  // Use ReadingDataService to get the same merged data that the calendar uses
  const mergedReadingData = ReadingDataService.mergeReadingData(streakHistory || null, books);
  
  // Extract all reading days from the merged data
  const allReadingDays = new Set<string>(mergedReadingData.keys());
  
  // Calculate final streaks from merged data
  const { currentStreak, longestStreak, lastReadDate } = calculateStreaksFromDays(allReadingDays);
  
  // Calculate today's progress from merged data
  const today = new Date();
  const todayKey = formatDateToISO(today);
  const todayEntry = mergedReadingData.get(todayKey);
  const todayProgress = todayEntry?.sources.reduce((total, source) => {
    return total + (source.metadata?.progress || 0);
  }, 0) || 0;
  const hasReadToday = allReadingDays.has(todayKey);
  
  return {
    currentStreak,
    longestStreak,
    lastReadDate,
    todayProgress,
    dailyGoal,
    hasReadToday
  };
}

/**
 * Process imported books and merge with existing streak history
 */
export function processStreakImport(
  importedBooks: Book[],
  existingBooks: Book[],
  existingHistory?: StreakHistory,
  dailyGoal: number = 30
): StreakImportResult {
  // Calculate current state before import
  const oldStreakData = calculateStreakWithHistory(existingBooks, existingHistory, dailyGoal);
  
  // Extract reading periods from imported books
  const importedPeriods = extractReadingPeriods(importedBooks);
  const importedReadingDays = generateReadingDays(importedPeriods);
  
  // Merge all books for new calculation
  const allBooks = [...existingBooks, ...importedBooks];
  
  // Create updated history
  let existingReadingDays: string[] = [];
  if (existingHistory?.readingDays) {
    try {
      if (Array.isArray(existingHistory.readingDays)) {
        existingReadingDays = existingHistory.readingDays;
      } else if (existingHistory.readingDays instanceof Set) {
        existingReadingDays = Array.from(existingHistory.readingDays);
      } else if (typeof existingHistory.readingDays === 'object') {
        console.warn('ProcessStreakImport: readingDays appears to be serialized, attempting to extract values');
        existingReadingDays = Object.values(existingHistory.readingDays as any).filter(v => typeof v === 'string');
      }
    } catch (error) {
      console.error('ProcessStreakImport: Error processing existingHistory.readingDays:', error);
      existingReadingDays = [];
    }
  }

  const updatedHistory: StreakHistory = {
    readingDays: new Set([
      ...existingReadingDays,
      ...importedReadingDays
    ]),
    bookPeriods: [
      ...(existingHistory?.bookPeriods || []),
      ...importedPeriods
    ],
    lastCalculated: new Date()
  };
  
  // Calculate new streak data
  const newStreakData = calculateStreakWithHistory(allBooks, updatedHistory, dailyGoal);
  
  return {
    periodsProcessed: importedPeriods.length,
    daysAdded: importedReadingDays.size,
    readingDaysGenerated: importedReadingDays,
    newCurrentStreak: newStreakData.currentStreak,
    newLongestStreak: newStreakData.longestStreak,
    oldCurrentStreak: oldStreakData.currentStreak,
    oldLongestStreak: oldStreakData.longestStreak
  };
}

/**
 * Create streak history from existing books
 */
export function createStreakHistoryFromBooks(books: Book[]): StreakHistory {
  const periods = extractReadingPeriods(books);
  const readingDays = generateReadingDays(periods);
  
  // Also add reading days from progress entries
  const progressEntries = getProgressEntriesFromBooks(books);
  const additionalDays = new Set<string>();
  
  for (const entry of progressEntries) {
    additionalDays.add(formatDateToISO(entry.date));
  }
  
  // Merge all reading days
  additionalDays.forEach(day => readingDays.add(day));
  
  return {
    readingDays,
    bookPeriods: periods,
    lastCalculated: new Date()
  };
}

/**
 * Extract progress entries from books (existing logic)
 */
function getProgressEntriesFromBooks(books: Book[]): ProgressEntry[] {
  const progressEntries: ProgressEntry[] = [];
  
  for (const book of books) {
    // Add date when book was started reading
    if (book.dateStarted && book.progress > 0) {
      progressEntries.push({
        date: new Date(book.dateStarted),
        oldProgress: 0,
        newProgress: book.progress,
        pagesRead: book.totalPages ? Math.round((book.progress / 100) * book.totalPages) : 0
      });
    }
    
    // Add date when book was finished
    if (book.dateFinished && book.progress === 100) {
      progressEntries.push({
        date: new Date(book.dateFinished),
        oldProgress: 99,
        newProgress: 100,
        pagesRead: book.totalPages ? Math.round(book.totalPages * 0.01) : 1
      });
    }
    
    // For books modified today, add an entry
    if (book.dateModified) {
      const modifiedDate = new Date(book.dateModified);
      const today = new Date();
      if (isSameDay(modifiedDate, today) && book.progress > 0) {
        progressEntries.push({
          date: modifiedDate,
          oldProgress: Math.max(0, book.progress - 10),
          newProgress: book.progress,
          pagesRead: book.totalPages ? Math.round(((book.progress - Math.max(0, book.progress - 10)) / 100) * book.totalPages) : 1
        });
      }
    }
  }
  
  return progressEntries;
}