import { Book } from '@/types';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
  todayProgress: number;
  dailyGoal: number;
  hasReadToday: boolean;
}

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