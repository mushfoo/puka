import { Book, ReadingPeriod } from '@/types';

/**
 * Utility functions for extracting and processing reading periods from books
 */

/**
 * Extract reading periods from books that have both start and end dates
 */
export function extractReadingPeriods(books: Book[]): ReadingPeriod[] {
  const periods: ReadingPeriod[] = [];
  
  for (const book of books) {
    // Only process books with both start and finish dates
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
    
    // Ensure start date is not after end date
    if (startDate > endDate) {
      console.warn(`Start date is after end date for book "${book.title}": start=${startDate.toDateString()}, end=${endDate.toDateString()}`);
      continue;
    }
    
    const totalDays = calculateDaysBetween(startDate, endDate) + 1; // +1 to include both start and end dates
    
    periods.push({
      bookId: book.id,
      title: book.title,
      author: book.author, 
      startDate,
      endDate,
      totalDays
    });
  }
  
  return periods;
}

/**
 * Generate all reading days from a set of reading periods
 * Days with overlapping books still count as single reading days
 */
export function generateReadingDays(periods: ReadingPeriod[]): Set<string> {
  const readingDays = new Set<string>();
  
  for (const period of periods) {
    const currentDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    // Add each day in the period
    while (currentDate <= endDate) {
      readingDays.add(formatDateToISO(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return readingDays;
}

/**
 * Calculate consecutive reading streaks from a set of reading days
 */
export function calculateStreaksFromDays(readingDays: Set<string>): {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
} {
  if (readingDays.size === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null
    };
  }
  
  // Convert to sorted array of dates
  const sortedDates = Array.from(readingDays)
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1; // Start with 1 for the first date
  let lastReadDate = sortedDates[sortedDates.length - 1];
  
  // Calculate streaks by checking consecutive dates
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currentDate = sortedDates[i];
    const dayDifference = calculateDaysBetween(prevDate, currentDate);
    
    if (dayDifference === 1) {
      // Consecutive day - continue streak
      tempStreak++;
    } else {
      // Gap found - record streak and reset
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  // Don't forget the final streak
  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate current streak (from today backwards)
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  
  // Check if we read today or yesterday (allow 1-day gap for current streak)
  let checkDate = new Date(today);
  let foundRecent = false;
  
  // Check today and yesterday
  for (let i = 0; i < 2; i++) {
    if (readingDays.has(formatDateToISO(checkDate))) {
      foundRecent = true;
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  if (foundRecent) {
    // Count backwards from the most recent reading day
    currentStreak = 0;
    checkDate = new Date(today);
    
    // Go back day by day and count consecutive reading days
    for (let i = 0; i < 365; i++) { // Check up to a year
      if (readingDays.has(formatDateToISO(checkDate))) {
        currentStreak++;
      } else if (currentStreak > 0) {
        // Found a gap after starting the count
        break;
      }
      // If currentStreak is still 0, keep looking for the start
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    lastReadDate
  };
}

/**
 * Calculate number of days between two dates (inclusive of start, exclusive of end)
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset time to avoid timezone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  return Math.round((end.getTime() - start.getTime()) / oneDay);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validate reading periods for potential issues
 */
export function validateReadingPeriods(periods: ReadingPeriod[]): {
  valid: ReadingPeriod[];
  warnings: { period: ReadingPeriod; message: string }[];
} {
  const valid: ReadingPeriod[] = [];
  const warnings: { period: ReadingPeriod; message: string }[] = [];
  
  const maxReasonableDays = 365; // Maximum days for a single book
  
  for (const period of periods) {
    // Check for unreasonably long reading periods
    if (period.totalDays > maxReasonableDays) {
      warnings.push({
        period,
        message: `Very long reading period (${period.totalDays} days). Consider checking dates.`
      });
    }
    
    // Check for very short periods (same day finish)
    if (period.totalDays === 1) {
      warnings.push({
        period,
        message: `Book completed in one day. This is fine but unusual.` 
      });
      // This is still valid, just noteworthy
    }
    
    // Check for future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (period.endDate > today) {
      warnings.push({
        period,
        message: `End date is in the future (${period.endDate.toDateString()}).`
      });
    }
    
    // Even with warnings, we still consider the period valid unless it's clearly wrong
    // Users can review warnings and decide
    valid.push(period);
  }
  
  return { valid, warnings };
}

/**
 * Get reading period statistics
 */
export function getReadingPeriodStats(periods: ReadingPeriod[]): {
  totalBooks: number;
  totalDays: number;
  uniqueDays: number;
  averageDaysPerBook: number;
  overlappingPeriods: number;
} {
  const readingDays = generateReadingDays(periods);
  const totalDays = periods.reduce((sum, period) => sum + period.totalDays, 0);
  
  // Count overlapping periods
  let overlappingPeriods = 0;
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const period1 = periods[i];
      const period2 = periods[j];
      
      // Check if periods overlap
      if (period1.startDate <= period2.endDate && period2.startDate <= period1.endDate) {
        overlappingPeriods++;
      }
    }
  }
  
  return {
    totalBooks: periods.length,
    totalDays,
    uniqueDays: readingDays.size,
    averageDaysPerBook: periods.length > 0 ? Math.round(totalDays / periods.length) : 0,
    overlappingPeriods
  };
}