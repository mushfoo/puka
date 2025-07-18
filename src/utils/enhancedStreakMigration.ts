import { 
  StreakHistory, 
  EnhancedStreakHistory, 
  EnhancedReadingDayEntry, 
  ReadingPeriod,
  ReadingDayEntry,
  ReadingDataSource,
  ReadingDayMap 
} from '@/types';
import { formatDateToISO } from './readingPeriodExtractor';

/**
 * Enhanced streak history migration utilities
 * Provides comprehensive migration support for multiple legacy formats
 */

/**
 * Legacy streak format variants that may exist in localStorage
 */
export interface LegacyStreakData {
  // Basic legacy format from original app
  currentStreak?: number;
  longestStreak?: number;
  lastReadDate?: string | null;
  readingDays?: string[] | Set<string> | Record<string, any>;
  totalDaysRead?: number;
  
  // Enhanced legacy format with reading day entries
  readingDayEntries?: ReadingDayEntry[];
  readingDayMap?: ReadingDayMap | Record<string, ReadingDayEntry>;
  
  // Reading periods from book completion tracking
  bookPeriods?: ReadingPeriod[];
  
  // Metadata fields
  lastCalculated?: string | Date;
  lastSyncDate?: string | Date;
  version?: number;
  
  // Additional fields that may exist
  [key: string]: any;
}

/**
 * Migration format detection result
 */
export interface FormatDetectionResult {
  format: 'unknown' | 'basic_legacy' | 'enhanced_legacy' | 'reading_day_map' | 'enhanced_current';
  version: number;
  dataPoints: number;
  hasReadingDayEntries: boolean;
  hasBookPeriods: boolean;
  hasMetadata: boolean;
  estimatedMigrationTime: string;
  issues: string[];
  warnings: string[];
}

/**
 * Migration execution result
 */
export interface MigrationExecutionResult {
  success: boolean;
  migratedHistory: EnhancedStreakHistory | null;
  dataPointsMigrated: number;
  executionTimeMs: number;
  issues: string[];
  warnings: string[];
  preservedMetadata: Record<string, any>;
}

/**
 * Migration statistics
 */
export interface MigrationStats {
  totalReadingDays: number;
  preservedBookPeriods: number;
  migratedReadingDayEntries: number;
  recoveredMetadata: number;
  dataIntegrityScore: number; // 0-100
}

/**
 * Enhanced streak history migration class
 * Handles detection, validation, and migration of multiple legacy formats
 */
export class EnhancedStreakMigration {
  private static readonly CURRENT_VERSION = 1;
  private static readonly MIGRATION_BATCH_SIZE = 100;
  
  /**
   * Detect the format of legacy streak data
   * @param data - Raw legacy streak data
   * @returns Format detection result with migration recommendations
   */
  static detectLegacyFormat(data: any): FormatDetectionResult {
    const result: FormatDetectionResult = {
      format: 'unknown',
      version: 0,
      dataPoints: 0,
      hasReadingDayEntries: false,
      hasBookPeriods: false,
      hasMetadata: false,
      estimatedMigrationTime: '< 1 second',
      issues: [],
      warnings: []
    };

    if (!data || typeof data !== 'object') {
      result.issues.push('Invalid data: not an object');
      return result;
    }

    // Check for enhanced current format (already migrated)
    if (data.version && data.readingDayEntries && data.lastSyncDate) {
      result.format = 'enhanced_current';
      result.version = data.version;
      result.hasReadingDayEntries = true;
      result.hasBookPeriods = Array.isArray(data.bookPeriods) && data.bookPeriods.length > 0;
      result.hasMetadata = true;
      result.dataPoints = data.readingDayEntries.length;
      result.estimatedMigrationTime = 'No migration needed';
      return result;
    }

    // Check for enhanced legacy format
    if (data.readingDayEntries && Array.isArray(data.readingDayEntries)) {
      result.format = 'enhanced_legacy';
      result.version = data.version || 0;
      result.hasReadingDayEntries = true;
      result.hasBookPeriods = Array.isArray(data.bookPeriods) && data.bookPeriods.length > 0;
      result.hasMetadata = !!(data.lastCalculated || data.lastSyncDate);
      result.dataPoints = data.readingDayEntries.length;
      result.estimatedMigrationTime = result.dataPoints > 1000 ? '2-3 seconds' : '< 1 second';
      return result;
    }

    // Check for reading day map format
    if (data.readingDayMap || (data.readingDayEntries && typeof data.readingDayEntries === 'object' && !Array.isArray(data.readingDayEntries))) {
      result.format = 'reading_day_map';
      result.version = 0;
      result.hasReadingDayEntries = true;
      result.hasBookPeriods = Array.isArray(data.bookPeriods) && data.bookPeriods.length > 0;
      result.hasMetadata = !!(data.lastCalculated || data.lastSyncDate);
      
      const mapData = data.readingDayMap || data.readingDayEntries;
      result.dataPoints = Object.keys(mapData).length;
      result.estimatedMigrationTime = result.dataPoints > 500 ? '1-2 seconds' : '< 1 second';
      return result;
    }

    // Check for basic legacy format
    if (data.readingDays || data.currentStreak !== undefined || data.longestStreak !== undefined) {
      result.format = 'basic_legacy';
      result.version = 0;
      result.hasReadingDayEntries = false;
      result.hasBookPeriods = Array.isArray(data.bookPeriods) && data.bookPeriods.length > 0;
      result.hasMetadata = !!(data.lastCalculated || data.lastReadDate);
      
      // Count reading days
      if (data.readingDays) {
        if (Array.isArray(data.readingDays)) {
          result.dataPoints = data.readingDays.length;
        } else if (data.readingDays instanceof Set) {
          result.dataPoints = data.readingDays.size;
        } else if (typeof data.readingDays === 'object') {
          result.dataPoints = Object.keys(data.readingDays).length;
        }
      }
      
      result.estimatedMigrationTime = result.dataPoints > 2000 ? '3-5 seconds' : '< 2 seconds';
      
      // Add warnings for basic format
      if (result.dataPoints > 0 && !result.hasBookPeriods) {
        result.warnings.push('Reading days found but no book periods - some metadata may be lost');
      }
      
      return result;
    }

    // Unknown format
    result.issues.push('Unknown or unsupported data format');
    return result;
  }

  /**
   * Migrate legacy streak data to enhanced format
   * @param data - Raw legacy streak data
   * @returns Migration execution result
   */
  static async migrateLegacyStreakData(data: LegacyStreakData): Promise<MigrationExecutionResult> {
    const startTime = Date.now();
    const result: MigrationExecutionResult = {
      success: false,
      migratedHistory: null,
      dataPointsMigrated: 0,
      executionTimeMs: 0,
      issues: [],
      warnings: [],
      preservedMetadata: {}
    };

    try {
      // Detect format first
      const detection = this.detectLegacyFormat(data);
      
      if (detection.format === 'unknown') {
        result.issues.push('Cannot migrate unknown data format');
        return result;
      }

      if (detection.format === 'enhanced_current') {
        result.success = true;
        result.migratedHistory = data as EnhancedStreakHistory;
        result.dataPointsMigrated = detection.dataPoints;
        result.warnings.push('Data already in enhanced format');
        return result;
      }

      // Perform migration based on detected format
      let migratedHistory: EnhancedStreakHistory;
      
      switch (detection.format) {
        case 'basic_legacy':
          migratedHistory = await this.migrateBasicLegacyFormat(data);
          break;
        case 'enhanced_legacy':
          migratedHistory = await this.migrateEnhancedLegacyFormat(data);
          break;
        case 'reading_day_map':
          migratedHistory = await this.migrateReadingDayMapFormat(data);
          break;
        default:
          throw new Error(`Migration not implemented for format: ${detection.format}`);
      }

      // Validate migrated data
      const validation = this.validateMigratedData(migratedHistory);
      if (!validation.isValid) {
        result.issues.push(...validation.issues);
        result.warnings.push(...validation.warnings);
        
        if (validation.issues.length > 0) {
          result.success = false;
          return result;
        }
      }

      // Preserve metadata
      result.preservedMetadata = this.extractPreservableMetadata(data);

      result.success = true;
      result.migratedHistory = migratedHistory;
      result.dataPointsMigrated = migratedHistory.readingDayEntries.length;
      result.warnings.push(...validation.warnings);
      
    } catch (error) {
      result.issues.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Enhanced streak migration failed:', error);
    } finally {
      result.executionTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Migrate basic legacy format (simple reading days array)
   */
  private static async migrateBasicLegacyFormat(data: LegacyStreakData): Promise<EnhancedStreakHistory> {
    const now = new Date();
    
    // Extract reading days from various formats
    const readingDays = this.extractReadingDays(data.readingDays);
    
    // Create reading day entries from basic data
    const readingDayEntries: EnhancedReadingDayEntry[] = readingDays.map(dateStr => {
      const createdAt = data.lastCalculated ? new Date(data.lastCalculated) : now;
      const bookIds = this.findBookIdsForDate(dateStr, data.bookPeriods || []);
      
      return {
        date: dateStr,
        source: bookIds.length > 0 ? 'book' : 'manual',
        bookIds: bookIds.length > 0 ? bookIds : undefined,
        notes: undefined,
        createdAt,
        modifiedAt: createdAt
      };
    });

    return {
      readingDays: new Set(readingDays),
      bookPeriods: data.bookPeriods || [],
      lastCalculated: data.lastCalculated ? new Date(data.lastCalculated) : now,
      readingDayEntries,
      lastSyncDate: now,
      version: this.CURRENT_VERSION
    };
  }

  /**
   * Migrate enhanced legacy format (has reading day entries but old structure)
   */
  private static async migrateEnhancedLegacyFormat(data: LegacyStreakData): Promise<EnhancedStreakHistory> {
    const now = new Date();
    
    // Convert existing reading day entries to enhanced format
    const readingDayEntries: EnhancedReadingDayEntry[] = [];
    
    if (data.readingDayEntries && Array.isArray(data.readingDayEntries)) {
      for (const entry of data.readingDayEntries) {
        const enhancedEntry: EnhancedReadingDayEntry = {
          date: entry.date,
          source: this.inferSourceFromLegacyEntry(entry),
          bookIds: entry.bookIds && entry.bookIds.length > 0 ? entry.bookIds : undefined,
          notes: entry.notes,
          createdAt: this.extractCreatedAtFromLegacyEntry(entry, data.lastCalculated),
          modifiedAt: this.extractModifiedAtFromLegacyEntry(entry, data.lastCalculated)
        };
        
        readingDayEntries.push(enhancedEntry);
      }
    }

    // Extract reading days from the entries
    const readingDays = new Set(readingDayEntries.map(entry => entry.date));
    
    // Merge with any additional reading days
    const additionalReadingDays = this.extractReadingDays(data.readingDays);
    additionalReadingDays.forEach(date => readingDays.add(date));

    return {
      readingDays,
      bookPeriods: data.bookPeriods || [],
      lastCalculated: data.lastCalculated ? new Date(data.lastCalculated) : now,
      readingDayEntries,
      lastSyncDate: now,
      version: this.CURRENT_VERSION
    };
  }

  /**
   * Migrate reading day map format (Map or Record structure)
   */
  private static async migrateReadingDayMapFormat(data: LegacyStreakData): Promise<EnhancedStreakHistory> {
    const now = new Date();
    const readingDayEntries: EnhancedReadingDayEntry[] = [];
    
    const mapData = data.readingDayMap || data.readingDayEntries;
    
    if (mapData && typeof mapData === 'object') {
      for (const [date, entry] of Object.entries(mapData)) {
        if (entry && typeof entry === 'object') {
          const enhancedEntry: EnhancedReadingDayEntry = {
            date: entry.date || date,
            source: this.inferSourceFromLegacyEntry(entry),
            bookIds: entry.bookIds && entry.bookIds.length > 0 ? entry.bookIds : undefined,
            notes: entry.notes,
            createdAt: this.extractCreatedAtFromLegacyEntry(entry, data.lastCalculated),
            modifiedAt: this.extractModifiedAtFromLegacyEntry(entry, data.lastCalculated)
          };
          
          readingDayEntries.push(enhancedEntry);
        }
      }
    }

    const readingDays = new Set(readingDayEntries.map(entry => entry.date));

    return {
      readingDays,
      bookPeriods: data.bookPeriods || [],
      lastCalculated: data.lastCalculated ? new Date(data.lastCalculated) : now,
      readingDayEntries,
      lastSyncDate: now,
      version: this.CURRENT_VERSION
    };
  }

  /**
   * Extract reading days from various formats
   */
  private static extractReadingDays(readingDays: any): string[] {
    if (!readingDays) return [];
    
    if (Array.isArray(readingDays)) {
      return readingDays.filter(day => typeof day === 'string');
    }
    
    if (readingDays instanceof Set) {
      return Array.from(readingDays).filter(day => typeof day === 'string');
    }
    
    if (typeof readingDays === 'object') {
      // Handle serialized Set or other object formats
      const values = Object.values(readingDays);
      return values.filter(day => typeof day === 'string');
    }
    
    return [];
  }

  /**
   * Infer source type from legacy entry
   */
  private static inferSourceFromLegacyEntry(entry: any): 'manual' | 'book' | 'progress' {
    if (!entry) return 'manual';
    
    if (entry.sources && Array.isArray(entry.sources)) {
      // Check sources array for type hints
      const sourceTypes = entry.sources.map((s: any) => s.type).filter(Boolean);
      if (sourceTypes.includes('book_completion')) return 'book';
      if (sourceTypes.includes('progress_update')) return 'progress';
    }
    
    if (entry.bookIds && entry.bookIds.length > 0) {
      return 'book';
    }
    
    return 'manual';
  }

  /**
   * Extract created timestamp from legacy entry
   */
  private static extractCreatedAtFromLegacyEntry(entry: any, fallbackDate: any): Date {
    if (entry.sources && Array.isArray(entry.sources) && entry.sources.length > 0) {
      const firstSource = entry.sources[0];
      if (firstSource.timestamp) {
        return new Date(firstSource.timestamp);
      }
    }
    
    if (fallbackDate) {
      return new Date(fallbackDate);
    }
    
    return new Date();
  }

  /**
   * Extract modified timestamp from legacy entry
   */
  private static extractModifiedAtFromLegacyEntry(entry: any, fallbackDate: any): Date {
    if (entry.sources && Array.isArray(entry.sources) && entry.sources.length > 0) {
      const lastSource = entry.sources[entry.sources.length - 1];
      if (lastSource.timestamp) {
        return new Date(lastSource.timestamp);
      }
    }
    
    if (fallbackDate) {
      return new Date(fallbackDate);
    }
    
    return new Date();
  }

  /**
   * Find book IDs for a specific date
   */
  private static findBookIdsForDate(date: string, bookPeriods: ReadingPeriod[]): number[] {
    const checkDate = new Date(date);
    
    return bookPeriods
      .filter(period => {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        return checkDate >= startDate && checkDate <= endDate;
      })
      .map(period => period.bookId);
  }

  /**
   * Extract preservable metadata from legacy data
   */
  private static extractPreservableMetadata(data: LegacyStreakData): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    if (data.currentStreak !== undefined) {
      metadata.legacyCurrentStreak = data.currentStreak;
    }
    
    if (data.longestStreak !== undefined) {
      metadata.legacyLongestStreak = data.longestStreak;
    }
    
    if (data.lastReadDate) {
      metadata.legacyLastReadDate = data.lastReadDate;
    }
    
    if (data.totalDaysRead !== undefined) {
      metadata.legacyTotalDaysRead = data.totalDaysRead;
    }
    
    // Preserve any custom fields
    for (const [key, value] of Object.entries(data)) {
      if (!['readingDays', 'readingDayEntries', 'bookPeriods', 'lastCalculated', 'lastSyncDate', 'version'].includes(key)) {
        metadata[`legacy_${key}`] = value;
      }
    }
    
    return metadata;
  }

  /**
   * Validate migrated data integrity
   */
  private static validateMigratedData(history: EnhancedStreakHistory): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check basic structure
    if (!history.readingDayEntries || !Array.isArray(history.readingDayEntries)) {
      issues.push('Missing or invalid readingDayEntries array');
    }
    
    if (!history.readingDays || !(history.readingDays instanceof Set)) {
      issues.push('Missing or invalid readingDays Set');
    }
    
    if (!history.version || history.version !== this.CURRENT_VERSION) {
      warnings.push(`Version mismatch: expected ${this.CURRENT_VERSION}, got ${history.version}`);
    }
    
    // Check data consistency
    if (history.readingDayEntries && history.readingDays) {
      const entryDates = new Set(history.readingDayEntries.map(entry => entry.date));
      const readingDaysArray = Array.from(history.readingDays);
      
      const missingFromEntries = readingDaysArray.filter(date => !entryDates.has(date));
      const missingFromDays = Array.from(entryDates).filter(date => !history.readingDays.has(date));
      
      if (missingFromEntries.length > 0) {
        warnings.push(`${missingFromEntries.length} reading days missing from entries`);
      }
      
      if (missingFromDays.length > 0) {
        warnings.push(`${missingFromDays.length} entries missing from reading days`);
      }
    }
    
    // Check for duplicate dates
    if (history.readingDayEntries) {
      const dates = history.readingDayEntries.map(entry => entry.date);
      const uniqueDates = new Set(dates);
      if (dates.length !== uniqueDates.size) {
        issues.push('Duplicate reading day entries found');
      }
    }
    
    // Check date format
    if (history.readingDayEntries) {
      const invalidDates = history.readingDayEntries.filter(entry => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        return !dateRegex.test(entry.date);
      });
      
      if (invalidDates.length > 0) {
        issues.push(`${invalidDates.length} entries have invalid date format`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(
    original: LegacyStreakData,
    migrated: EnhancedStreakHistory
  ): MigrationStats {
    const originalReadingDays = this.extractReadingDays(original.readingDays);
    
    return {
      totalReadingDays: migrated.readingDays.size,
      preservedBookPeriods: migrated.bookPeriods.length,
      migratedReadingDayEntries: migrated.readingDayEntries.length,
      recoveredMetadata: Object.keys(this.extractPreservableMetadata(original)).length,
      dataIntegrityScore: this.calculateDataIntegrityScore(original, migrated)
    };
  }

  /**
   * Calculate data integrity score (0-100)
   */
  private static calculateDataIntegrityScore(
    original: LegacyStreakData,
    migrated: EnhancedStreakHistory
  ): number {
    let score = 100;
    
    // Check reading days preservation
    const originalReadingDays = this.extractReadingDays(original.readingDays);
    const migratedReadingDays = Array.from(migrated.readingDays);
    
    if (originalReadingDays.length > 0) {
      const preservedDays = originalReadingDays.filter(day => migratedReadingDays.includes(day));
      const preservationRate = preservedDays.length / originalReadingDays.length;
      score *= preservationRate;
    }
    
    // Check book periods preservation
    if (original.bookPeriods && original.bookPeriods.length > 0) {
      const preservationRate = migrated.bookPeriods.length / original.bookPeriods.length;
      score *= preservationRate;
    }
    
    // Check metadata preservation
    const validation = this.validateMigratedData(migrated);
    if (validation.issues.length > 0) {
      score *= 0.8; // Penalize for data issues
    }
    
    if (validation.warnings.length > 0) {
      score *= 0.95; // Minor penalty for warnings
    }
    
    return Math.max(0, Math.min(100, score));
  }
}