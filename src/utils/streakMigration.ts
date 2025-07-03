import { StreakHistory, EnhancedStreakHistory, EnhancedReadingDayEntry } from '@/types';
import { formatDateToISO } from './readingPeriodExtractor';

/**
 * Current data model version for EnhancedStreakHistory
 * Increment this when making breaking changes to the data structure
 */
export const CURRENT_STREAK_HISTORY_VERSION = 1;

/**
 * Migration utilities for reading streak data
 * Handles backward compatibility and data model upgrades
 */

/**
 * Migrate legacy StreakHistory to EnhancedStreakHistory
 * Converts existing reading days to ReadingDayEntry objects
 * 
 * @param legacyHistory - The legacy StreakHistory to migrate
 * @returns Migrated EnhancedStreakHistory with version and detailed entries
 */
export function migrateStreakHistory(legacyHistory: StreakHistory): EnhancedStreakHistory {
  const now = new Date();
  
  // Convert legacy reading days to EnhancedReadingDayEntry objects
  let readingDaysArray: string[] = [];
  try {
    if (Array.isArray(legacyHistory.readingDays)) {
      readingDaysArray = legacyHistory.readingDays;
    } else if (legacyHistory.readingDays instanceof Set) {
      readingDaysArray = Array.from(legacyHistory.readingDays);
    } else if (typeof legacyHistory.readingDays === 'object' && legacyHistory.readingDays !== null) {
      console.warn('StreakMigration: readingDays appears to be serialized, attempting to extract values');
      readingDaysArray = Object.values(legacyHistory.readingDays as any).filter(v => typeof v === 'string');
    } else {
      console.warn('StreakMigration: Unexpected readingDays type:', typeof legacyHistory.readingDays);
      readingDaysArray = [];
    }
  } catch (error) {
    console.error('StreakMigration: Error processing readingDays:', error);
    readingDaysArray = [];
  }
  
  const readingDayEntries: EnhancedReadingDayEntry[] = readingDaysArray.map(dateStr => ({
    date: dateStr,
    source: 'book' as const, // Assume legacy days came from book completion
    bookIds: findBookIdsForDate(dateStr, legacyHistory.bookPeriods),
    notes: undefined,
    createdAt: legacyHistory.lastCalculated, // Use last calculated as best estimate
    modifiedAt: legacyHistory.lastCalculated
  }));

  return {
    // Preserve all legacy fields (ensure readingDays is a proper Set)
    readingDays: new Set(readingDaysArray),
    bookPeriods: legacyHistory.bookPeriods,
    lastCalculated: legacyHistory.lastCalculated,
    
    // Add new enhanced fields
    readingDayEntries,
    lastSyncDate: now,
    version: CURRENT_STREAK_HISTORY_VERSION
  };
}

/**
 * Check if a streak history object is already enhanced
 * 
 * @param history - The streak history to check
 * @returns True if the history is already enhanced
 */
export function isEnhancedStreakHistory(history: StreakHistory | EnhancedStreakHistory): history is EnhancedStreakHistory {
  return 'readingDayEntries' in history && 'version' in history;
}

/**
 * Ensure a streak history is in enhanced format
 * Migrates if necessary, or returns as-is if already enhanced
 * 
 * @param history - The streak history to ensure is enhanced
 * @returns EnhancedStreakHistory ready for use
 */
export function ensureEnhancedStreakHistory(history: StreakHistory | EnhancedStreakHistory): EnhancedStreakHistory {
  if (isEnhancedStreakHistory(history)) {
    // Check if version needs updating
    if (history.version < CURRENT_STREAK_HISTORY_VERSION) {
      return upgradeStreakHistoryVersion(history);
    }
    return history;
  }
  
  return migrateStreakHistory(history);
}

/**
 * Upgrade an enhanced streak history to the current version
 * Handles version-specific migrations
 * 
 * @param history - The enhanced history to upgrade
 * @returns Updated EnhancedStreakHistory
 */
export function upgradeStreakHistoryVersion(history: EnhancedStreakHistory): EnhancedStreakHistory {
  let upgradedHistory = { ...history };
  
  // Future version migrations would go here
  // For now, just update version and sync date
  upgradedHistory.version = CURRENT_STREAK_HISTORY_VERSION;
  upgradedHistory.lastSyncDate = new Date();
  
  return upgradedHistory;
}

/**
 * Create a new empty EnhancedStreakHistory
 * Used when no existing history is available
 * 
 * @returns New empty EnhancedStreakHistory
 */
export function createEmptyEnhancedStreakHistory(): EnhancedStreakHistory {
  const now = new Date();
  
  return {
    readingDays: new Set<string>(),
    bookPeriods: [],
    lastCalculated: now,
    readingDayEntries: [],
    lastSyncDate: now,
    version: CURRENT_STREAK_HISTORY_VERSION
  };
}

/**
 * Synchronize readingDays Set with readingDayEntries array
 * Ensures both data structures are consistent
 * 
 * @param history - The enhanced history to synchronize
 * @returns Synchronized EnhancedStreakHistory
 */
export function synchronizeReadingDays(history: EnhancedStreakHistory): EnhancedStreakHistory {
  // Extract unique dates from readingDayEntries
  const datesFromEntries = new Set(history.readingDayEntries.map(entry => entry.date));
  
  // Merge with existing readingDays for backward compatibility
  let existingReadingDays: string[] = [];
  try {
    if (Array.isArray(history.readingDays)) {
      existingReadingDays = history.readingDays;
    } else if (history.readingDays instanceof Set) {
      existingReadingDays = Array.from(history.readingDays);
    } else if (typeof history.readingDays === 'object' && history.readingDays !== null) {
      console.warn('SynchronizeReadingDays: readingDays appears to be serialized, attempting to extract values');
      existingReadingDays = Object.values(history.readingDays as any).filter(v => typeof v === 'string');
    }
  } catch (error) {
    console.error('SynchronizeReadingDays: Error processing readingDays:', error);
    existingReadingDays = [];
  }
  
  const allReadingDays = new Set([...existingReadingDays, ...datesFromEntries]);
  
  return {
    ...history,
    readingDays: allReadingDays,
    lastSyncDate: new Date()
  };
}

/**
 * Add a new reading day entry to enhanced streak history
 * Maintains synchronization between readingDayEntries and readingDays
 * 
 * @param history - The enhanced history to update
 * @param entry - The new reading day entry to add
 * @returns Updated EnhancedStreakHistory
 */
export function addReadingDayEntry(
  history: EnhancedStreakHistory, 
  entry: Omit<EnhancedReadingDayEntry, 'createdAt' | 'modifiedAt'>
): EnhancedStreakHistory {
  const now = new Date();
  
  // Create full entry with timestamps
  const fullEntry: EnhancedReadingDayEntry = {
    ...entry,
    createdAt: now,
    modifiedAt: now
  };
  
  // Check if entry for this date already exists
  const existingIndex = history.readingDayEntries.findIndex(existing => existing.date === entry.date);
  
  let updatedEntries: EnhancedReadingDayEntry[];
  if (existingIndex >= 0) {
    // Update existing entry
    updatedEntries = [...history.readingDayEntries];
    updatedEntries[existingIndex] = {
      ...updatedEntries[existingIndex],
      ...entry,
      modifiedAt: now
    };
  } else {
    // Add new entry
    updatedEntries = [...history.readingDayEntries, fullEntry];
  }
  
  // Update history
  const updatedHistory: EnhancedStreakHistory = {
    ...history,
    readingDayEntries: updatedEntries,
    readingDays: new Set([...Array.from(history.readingDays instanceof Set ? history.readingDays : []), entry.date]),
    lastSyncDate: now
  };
  
  return synchronizeReadingDays(updatedHistory);
}

/**
 * Remove a reading day entry from enhanced streak history
 * Maintains synchronization between data structures
 * 
 * @param history - The enhanced history to update
 * @param date - The date to remove (YYYY-MM-DD format)
 * @returns Updated EnhancedStreakHistory
 */
export function removeReadingDayEntry(history: EnhancedStreakHistory, date: string): EnhancedStreakHistory {
  const updatedEntries = history.readingDayEntries.filter(entry => entry.date !== date);
  
  // Rebuild readingDays from remaining entries
  const remainingDates = new Set(updatedEntries.map(entry => entry.date));
  
  const updatedHistory: EnhancedStreakHistory = {
    ...history,
    readingDayEntries: updatedEntries,
    readingDays: remainingDates,
    lastSyncDate: new Date()
  };
  
  return updatedHistory;
}

/**
 * Validate EnhancedStreakHistory data integrity
 * Checks for consistency between different data structures
 * 
 * @param history - The enhanced history to validate
 * @returns Validation result with any issues found
 */
export function validateEnhancedStreakHistory(history: EnhancedStreakHistory): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check version compatibility
  if (history.version > CURRENT_STREAK_HISTORY_VERSION) {
    issues.push(`History version ${history.version} is newer than supported version ${CURRENT_STREAK_HISTORY_VERSION}`);
  }
  
  // Check synchronization between readingDays and readingDayEntries
  const datesFromEntries = new Set(history.readingDayEntries.map(entry => entry.date));
  
  let readingDaysArray: string[] = [];
  try {
    if (Array.isArray(history.readingDays)) {
      readingDaysArray = history.readingDays;
    } else if (history.readingDays instanceof Set) {
      readingDaysArray = Array.from(history.readingDays);
    } else if (typeof history.readingDays === 'object' && history.readingDays !== null) {
      readingDaysArray = Object.values(history.readingDays as any).filter(v => typeof v === 'string');
    }
  } catch (error) {
    issues.push('Failed to process readingDays for validation');
  }
  
  const readingDaysSet = new Set(readingDaysArray);
  const missingInEntries = readingDaysArray.filter(date => !datesFromEntries.has(date));
  const missingInDays = Array.from(datesFromEntries).filter(date => !readingDaysSet.has(date));
  
  if (missingInEntries.length > 0) {
    warnings.push(`${missingInEntries.length} reading days missing from detailed entries`);
  }
  
  if (missingInDays.length > 0) {
    warnings.push(`${missingInDays.length} detailed entries missing from reading days set`);
  }
  
  // Check for duplicate entries
  const entryDates = history.readingDayEntries.map(entry => entry.date);
  const duplicates = entryDates.filter((date, index) => entryDates.indexOf(date) !== index);
  if (duplicates.length > 0) {
    issues.push(`Duplicate reading day entries found: ${duplicates.join(', ')}`);
  }
  
  // Check date format consistency
  const invalidDates = history.readingDayEntries.filter(entry => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return !dateRegex.test(entry.date);
  });
  
  if (invalidDates.length > 0) {
    issues.push(`${invalidDates.length} entries have invalid date format`);
  }
  
  // Check for future dates
  const today = formatDateToISO(new Date());
  const futureDates = history.readingDayEntries.filter(entry => entry.date > today);
  if (futureDates.length > 0) {
    warnings.push(`${futureDates.length} entries have future dates`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Helper function to find book IDs that were being read on a specific date
 * Used during migration to associate legacy reading days with books
 * 
 * @param date - The date to check (YYYY-MM-DD format)
 * @param bookPeriods - Array of reading periods to search
 * @returns Array of book IDs that were being read on the given date
 */
function findBookIdsForDate(date: string, bookPeriods: Array<{bookId: number, startDate: Date, endDate: Date}>): number[] {
  const checkDate = new Date(date);
  
  return bookPeriods
    .filter(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      return checkDate >= startDate && checkDate <= endDate;
    })
    .map(period => period.bookId);
}