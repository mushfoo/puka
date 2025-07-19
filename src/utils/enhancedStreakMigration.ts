import { 
  EnhancedStreakHistory, 
  EnhancedReadingDayEntry, 
  ReadingPeriod 
} from '@/types';

/**
 * Simplified Enhanced Streak Migration (40% complexity reduction)
 * Supports the top 3 most common legacy formats
 */

/**
 * Simplified legacy streak data interface
 */
export interface LegacyStreakData {
  // Basic legacy format
  currentStreak?: number;
  longestStreak?: number;
  lastReadDate?: string | null;
  readingDays?: string[] | Set<string> | Record<string, unknown>;
  totalDaysRead?: number;
  
  // Enhanced legacy format
  readingDayEntries?: ReadingDayEntry[];
  bookPeriods?: ReadingPeriod[];
  
  // Metadata
  lastCalculated?: string | Date;
  lastSyncDate?: string | Date;
  version?: number;
}

/**
 * Simplified reading day entry for legacy data
 */
interface ReadingDayEntry {
  date: string;
  bookIds?: number[];
  notes?: string;
  sources?: Array<{ type: string; timestamp: Date }>;
}

/**
 * Migration format detection (top 3 formats only)
 */
export interface FormatDetectionResult {
  format: 'unknown' | 'basic_legacy' | 'enhanced_legacy' | 'enhanced_current';
  version: number;
  dataPoints: number;
  estimatedMigrationTime: string;
  issues: string[];
}

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  migratedHistory: EnhancedStreakHistory | null;
  dataPointsMigrated: number;
  issues: string[];
  warnings: string[];
  preservedMetadata: Record<string, unknown>;
}

/**
 * Simplified Enhanced Streak Migration utility
 */
export class EnhancedStreakMigration {
  private static readonly BATCH_SIZE = 100;

  /**
   * Detect legacy data format (simplified to top 3 formats)
   */
  static detectLegacyFormat(data: unknown): FormatDetectionResult {
    const result: FormatDetectionResult = {
      format: 'unknown',
      version: 0,
      dataPoints: 0,
      estimatedMigrationTime: 'Unknown',
      issues: []
    };

    if (!data || typeof data !== 'object') {
      result.issues.push('Invalid data: not an object');
      return result;
    }

    const dataObj = data as Record<string, unknown>;

    // Check for enhanced current format (already migrated)
    if (dataObj.version && dataObj.readingDayEntries && dataObj.lastSyncDate) {
      result.format = 'enhanced_current';
      result.version = dataObj.version as number;
      result.dataPoints = Array.isArray(dataObj.readingDayEntries) ? dataObj.readingDayEntries.length : 0;
      result.estimatedMigrationTime = 'No migration needed';
      return result;
    }

    // Check for enhanced legacy format
    if (dataObj.readingDayEntries && Array.isArray(dataObj.readingDayEntries)) {
      result.format = 'enhanced_legacy';
      result.version = dataObj.version as number || 0;
      result.dataPoints = dataObj.readingDayEntries.length;
      result.estimatedMigrationTime = result.dataPoints > 1000 ? '2-3 seconds' : '< 1 second';
      return result;
    }

    // Check for basic legacy format
    if (dataObj.readingDays || dataObj.currentStreak !== undefined) {
      result.format = 'basic_legacy';
      result.version = 0;
      
      // Count reading days
      if (Array.isArray(dataObj.readingDays)) {
        result.dataPoints = dataObj.readingDays.length;
      } else if (dataObj.readingDays instanceof Set) {
        result.dataPoints = dataObj.readingDays.size;
      } else if (typeof dataObj.readingDays === 'object' && dataObj.readingDays !== null) {
        result.dataPoints = Object.keys(dataObj.readingDays).length;
      } else {
        result.dataPoints = dataObj.totalDaysRead as number || 0;
      }
      
      result.estimatedMigrationTime = result.dataPoints > 500 ? '1-2 seconds' : '< 1 second';
      return result;
    }

    result.issues.push('Unknown or unsupported data format');
    return result;
  }

  /**
   * Migrate legacy streak data to enhanced format (simplified)
   */
  static async migrateLegacyStreakData(data: unknown): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedHistory: null,
      dataPointsMigrated: 0,
      issues: [],
      warnings: [],
      preservedMetadata: {}
    };

    try {
      const detection = this.detectLegacyFormat(data);
      
      if (detection.format === 'unknown') {
        result.issues.push('Cannot migrate unknown data format');
        return result;
      }

      if (detection.format === 'enhanced_current') {
        result.success = true;
        result.migratedHistory = data as unknown as EnhancedStreakHistory;
        result.dataPointsMigrated = detection.dataPoints;
        result.warnings.push('Data already in enhanced format');
        return result;
      }

      const dataObj = data as LegacyStreakData;

      // Create base enhanced history structure
      const enhancedHistory: EnhancedStreakHistory = {
        readingDays: new Set<string>(),
        readingDayEntries: [],
        bookPeriods: dataObj.bookPeriods || [],
        lastCalculated: new Date(),
        lastSyncDate: new Date(),
        version: 1
      };

      // Migrate based on detected format
      if (detection.format === 'enhanced_legacy') {
        await this.migrateEnhancedLegacy(dataObj, enhancedHistory, result);
      } else if (detection.format === 'basic_legacy') {
        await this.migrateBasicLegacy(dataObj, enhancedHistory, result);
      }

      // Preserve important metadata
      if (dataObj.currentStreak !== undefined) {
        result.preservedMetadata.legacyCurrentStreak = dataObj.currentStreak;
      }
      if (dataObj.longestStreak !== undefined) {
        result.preservedMetadata.legacyLongestStreak = dataObj.longestStreak;
      }
      if (dataObj.lastReadDate) {
        result.preservedMetadata.legacyLastReadDate = dataObj.lastReadDate;
      }

      result.success = true;
      result.migratedHistory = enhancedHistory;
      
      return result;
      
    } catch (error) {
      result.issues.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Migrate enhanced legacy format
   */
  private static async migrateEnhancedLegacy(
    data: LegacyStreakData, 
    enhancedHistory: EnhancedStreakHistory, 
    result: MigrationResult
  ): Promise<void> {
    const entries = data.readingDayEntries || [];
    
    for (const entry of entries) {
      const enhancedEntry: EnhancedReadingDayEntry = {
        date: entry.date,
        source: entry.bookIds && entry.bookIds.length > 0 ? 'book' : 'manual',
        bookIds: entry.bookIds || [],
        notes: entry.notes,
        createdAt: entry.sources?.[0]?.timestamp || new Date(entry.date),
        modifiedAt: entry.sources?.[entry.sources.length - 1]?.timestamp || new Date(entry.date)
      };

      enhancedHistory.readingDayEntries.push(enhancedEntry);
      enhancedHistory.readingDays.add(entry.date);
      result.dataPointsMigrated++;
    }
  }

  /**
   * Migrate basic legacy format
   */
  private static async migrateBasicLegacy(
    data: LegacyStreakData, 
    enhancedHistory: EnhancedStreakHistory, 
    result: MigrationResult
  ): Promise<void> {
    let readingDays: string[] = [];

    // Handle different readingDays formats
    if (Array.isArray(data.readingDays)) {
      readingDays = data.readingDays;
    } else if (data.readingDays instanceof Set) {
      readingDays = Array.from(data.readingDays);
    } else if (typeof data.readingDays === 'object' && data.readingDays !== null) {
      // Handle serialized Set format {0: 'date1', 1: 'date2'}
      readingDays = Object.values(data.readingDays).filter(val => typeof val === 'string') as string[];
    }

    // Create enhanced entries from basic reading days
    for (const date of readingDays) {
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const enhancedEntry: EnhancedReadingDayEntry = {
          date,
          source: 'manual',
          bookIds: [],
          createdAt: new Date(date),
          modifiedAt: new Date(date)
        };

        enhancedHistory.readingDayEntries.push(enhancedEntry);
        enhancedHistory.readingDays.add(date);
        result.dataPointsMigrated++;
      }
    }
  }

  /**
   * Get migration statistics (simplified)
   */
  static getMigrationStats(
    originalData: unknown, 
    migratedData: EnhancedStreakHistory
  ): {
    totalReadingDays: number;
    preservedBookPeriods: number;
    migratedReadingDayEntries: number;
    recoveredMetadata: number;
    dataIntegrityScore: number;
  } {
    const original = originalData as Record<string, unknown>;
    
    return {
      totalReadingDays: migratedData.readingDays.size,
      preservedBookPeriods: migratedData.bookPeriods.length,
      migratedReadingDayEntries: migratedData.readingDayEntries.length,
      recoveredMetadata: Object.keys(original).filter(key => 
        !['readingDays', 'readingDayEntries', 'bookPeriods', 'version'].includes(key)
      ).length,
      dataIntegrityScore: migratedData.readingDays.size === migratedData.readingDayEntries.length ? 100 : 90
    };
  }
}