import { 
  EnhancedStreakHistory, 
  EnhancedReadingDayEntry, 
  ReadingPeriod, 
  Book 
} from '@/types';
import { formatDateToISO } from './readingPeriodExtractor';

/**
 * Data integrity validation result
 */
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 integrity score
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: string[];
  fixableIssues: FixableIssue[];
}

/**
 * Data integrity issue (critical problems)
 */
export interface ValidationIssue {
  type: 'critical' | 'error' | 'warning';
  category: 'structure' | 'consistency' | 'format' | 'logic' | 'performance';
  message: string;
  affectedItems: string[];
  impact: 'high' | 'medium' | 'low';
  fixable: boolean;
}

/**
 * Data integrity warning (non-critical issues)
 */
export interface ValidationWarning {
  type: 'data_loss' | 'inconsistency' | 'performance' | 'best_practice';
  message: string;
  affectedItems: string[];
  recommendation: string;
}

/**
 * Fixable issue that can be automatically corrected
 */
export interface FixableIssue {
  type: 'duplicate_entries' | 'missing_dates' | 'invalid_formats' | 'orphaned_data';
  message: string;
  fix: () => void;
  estimatedImpact: string;
}

/**
 * Validation statistics
 */
export interface ValidationStats {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  duplicateEntries: number;
  futureEntries: number;
  missingMetadata: number;
  consistencyScore: number;
  dataQualityScore: number;
}

/**
 * Comprehensive data integrity validator for enhanced streak history
 */
export class DataIntegrityValidator {
  private static readonly MAX_FUTURE_DAYS = 1; // Allow 1 day in future for timezone issues
  private static readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly MIN_DATE = new Date('2000-01-01');
  private static readonly MAX_DATE = new Date('2100-12-31');

  /**
   * Validate enhanced streak history data integrity
   */
  static validateEnhancedStreakHistory(
    history: EnhancedStreakHistory,
    books?: Book[]
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      score: 100,
      issues: [],
      warnings: [],
      recommendations: [],
      fixableIssues: []
    };

    // Perform comprehensive validation
    this.validateStructure(history, result);
    this.validateDataConsistency(history, result);
    this.validateDateFormats(history, result);
    this.validateLogicalConsistency(history, result);
    this.validatePerformanceOptimizations(history, result);
    
    if (books) {
      this.validateBookReferences(history, books, result);
    }

    // Calculate overall score
    result.score = this.calculateIntegrityScore(result);
    result.isValid = result.issues.filter(i => i.type === 'critical' || i.type === 'error').length === 0;

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    return result;
  }

  /**
   * Validate basic data structure
   */
  private static validateStructure(history: EnhancedStreakHistory, result: ValidationResult): void {
    // Check required fields
    if (!history.readingDayEntries || !Array.isArray(history.readingDayEntries)) {
      result.issues.push({
        type: 'critical',
        category: 'structure',
        message: 'Missing or invalid readingDayEntries array',
        affectedItems: ['readingDayEntries'],
        impact: 'high',
        fixable: false
      });
    }

    if (!history.readingDays || !(history.readingDays instanceof Set)) {
      result.issues.push({
        type: 'critical',
        category: 'structure',
        message: 'Missing or invalid readingDays Set',
        affectedItems: ['readingDays'],
        impact: 'high',
        fixable: true
      });
    }

    if (!history.bookPeriods || !Array.isArray(history.bookPeriods)) {
      result.warnings.push({
        type: 'inconsistency',
        message: 'Missing or invalid bookPeriods array',
        affectedItems: ['bookPeriods'],
        recommendation: 'Initialize empty bookPeriods array'
      });
    }

    // Check version
    if (!history.version || typeof history.version !== 'number') {
      result.issues.push({
        type: 'error',
        category: 'structure',
        message: 'Missing or invalid version number',
        affectedItems: ['version'],
        impact: 'medium',
        fixable: true
      });
    }

    // Check timestamps
    if (!history.lastSyncDate || !(history.lastSyncDate instanceof Date)) {
      result.issues.push({
        type: 'error',
        category: 'structure',
        message: 'Missing or invalid lastSyncDate',
        affectedItems: ['lastSyncDate'],
        impact: 'medium',
        fixable: true
      });
    }

    if (!history.lastCalculated || !(history.lastCalculated instanceof Date)) {
      result.issues.push({
        type: 'error',
        category: 'structure',
        message: 'Missing or invalid lastCalculated date',
        affectedItems: ['lastCalculated'],
        impact: 'medium',
        fixable: true
      });
    }
  }

  /**
   * Validate data consistency between different structures
   */
  private static validateDataConsistency(history: EnhancedStreakHistory, result: ValidationResult): void {
    if (!history.readingDayEntries || !history.readingDays) return;

    // Check consistency between readingDayEntries and readingDays
    const entryDates = new Set(history.readingDayEntries.map(entry => entry.date));
    const readingDaysArray = Array.from(history.readingDays);
    
    const missingFromEntries = readingDaysArray.filter(date => !entryDates.has(date));
    const missingFromDays = Array.from(entryDates).filter(date => !history.readingDays.has(date));
    
    if (missingFromEntries.length > 0) {
      result.issues.push({
        type: 'error',
        category: 'consistency',
        message: `${missingFromEntries.length} reading days missing from detailed entries`,
        affectedItems: missingFromEntries,
        impact: 'high',
        fixable: true
      });
      
      result.fixableIssues.push({
        type: 'missing_dates',
        message: `Add ${missingFromEntries.length} missing reading day entries`,
        fix: () => {
          // Implementation would add missing entries
        },
        estimatedImpact: `Create ${missingFromEntries.length} new reading day entries`
      });
    }
    
    if (missingFromDays.length > 0) {
      result.issues.push({
        type: 'error',
        category: 'consistency',
        message: `${missingFromDays.length} detailed entries missing from reading days set`,
        affectedItems: missingFromDays,
        impact: 'high',
        fixable: true
      });
      
      result.fixableIssues.push({
        type: 'missing_dates',
        message: `Add ${missingFromDays.length} dates to reading days set`,
        fix: () => {
          // Implementation would add missing dates
        },
        estimatedImpact: `Add ${missingFromDays.length} dates to reading days set`
      });
    }

    // Check for duplicate entries
    const dates = history.readingDayEntries.map(entry => entry.date);
    const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index);
    
    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      result.issues.push({
        type: 'error',
        category: 'consistency',
        message: `Duplicate reading day entries found for ${uniqueDuplicates.length} dates`,
        affectedItems: uniqueDuplicates,
        impact: 'high',
        fixable: true
      });
      
      result.fixableIssues.push({
        type: 'duplicate_entries',
        message: `Remove duplicate entries for ${uniqueDuplicates.length} dates`,
        fix: () => {
          // Implementation would remove duplicates
        },
        estimatedImpact: `Remove ${duplicates.length} duplicate entries`
      });
    }
  }

  /**
   * Validate date formats and ranges
   */
  private static validateDateFormats(history: EnhancedStreakHistory, result: ValidationResult): void {
    if (!history.readingDayEntries) return;

    const today = formatDateToISO(new Date());
    const futureThreshold = new Date();
    futureThreshold.setDate(futureThreshold.getDate() + this.MAX_FUTURE_DAYS);
    const futureThresholdStr = formatDateToISO(futureThreshold);

    const invalidDates: string[] = [];
    const futureDates: string[] = [];
    const ancientDates: string[] = [];
    const invalidTimestamps: string[] = [];

    for (const entry of history.readingDayEntries) {
      // Check date format
      if (!this.DATE_REGEX.test(entry.date)) {
        invalidDates.push(entry.date);
        continue;
      }

      // Check date range
      const entryDate = new Date(entry.date);
      if (entryDate < this.MIN_DATE) {
        ancientDates.push(entry.date);
      } else if (entry.date > futureThresholdStr) {
        futureDates.push(entry.date);
      }

      // Check timestamps
      if (!(entry.createdAt instanceof Date) || isNaN(entry.createdAt.getTime())) {
        invalidTimestamps.push(entry.date);
      }
      
      if (!(entry.modifiedAt instanceof Date) || isNaN(entry.modifiedAt.getTime())) {
        invalidTimestamps.push(entry.date);
      }
    }

    if (invalidDates.length > 0) {
      result.issues.push({
        type: 'error',
        category: 'format',
        message: `${invalidDates.length} entries have invalid date format`,
        affectedItems: invalidDates,
        impact: 'high',
        fixable: true
      });
    }

    if (futureDates.length > 0) {
      result.warnings.push({
        type: 'data_loss',
        message: `${futureDates.length} entries have future dates`,
        affectedItems: futureDates,
        recommendation: 'Review future dates for accuracy'
      });
    }

    if (ancientDates.length > 0) {
      result.warnings.push({
        type: 'data_loss',
        message: `${ancientDates.length} entries have unusually old dates`,
        affectedItems: ancientDates,
        recommendation: 'Verify ancient dates are correct'
      });
    }

    if (invalidTimestamps.length > 0) {
      result.issues.push({
        type: 'error',
        category: 'format',
        message: `${invalidTimestamps.length} entries have invalid timestamps`,
        affectedItems: invalidTimestamps,
        impact: 'medium',
        fixable: true
      });
    }
  }

  /**
   * Validate logical consistency
   */
  private static validateLogicalConsistency(history: EnhancedStreakHistory, result: ValidationResult): void {
    if (!history.readingDayEntries) return;

    // Check for entries with modifiedAt before createdAt
    const illogicalTimestamps: string[] = [];
    
    for (const entry of history.readingDayEntries) {
      if (entry.modifiedAt < entry.createdAt) {
        illogicalTimestamps.push(entry.date);
      }
    }

    if (illogicalTimestamps.length > 0) {
      result.issues.push({
        type: 'error',
        category: 'logic',
        message: `${illogicalTimestamps.length} entries have modifiedAt before createdAt`,
        affectedItems: illogicalTimestamps,
        impact: 'medium',
        fixable: true
      });
    }

    // Check for entries with empty bookIds but source='book'
    const inconsistentSources: string[] = [];
    
    for (const entry of history.readingDayEntries) {
      if (entry.source === 'book' && (!entry.bookIds || entry.bookIds.length === 0)) {
        inconsistentSources.push(entry.date);
      }
    }

    if (inconsistentSources.length > 0) {
      result.warnings.push({
        type: 'inconsistency',
        message: `${inconsistentSources.length} entries marked as 'book' source but have no book IDs`,
        affectedItems: inconsistentSources,
        recommendation: 'Review source classification or add book IDs'
      });
    }
  }

  /**
   * Validate performance optimization opportunities
   */
  private static validatePerformanceOptimizations(history: EnhancedStreakHistory, result: ValidationResult): void {
    if (!history.readingDayEntries) return;

    // Check for large number of entries
    if (history.readingDayEntries.length > 10000) {
      result.warnings.push({
        type: 'performance',
        message: `Large number of reading day entries (${history.readingDayEntries.length})`,
        affectedItems: ['readingDayEntries'],
        recommendation: 'Consider data archival for very old entries'
      });
    }

    // Check for entries with very long notes
    const entriesWithLongNotes = history.readingDayEntries.filter(
      entry => entry.notes && entry.notes.length > 1000
    );

    if (entriesWithLongNotes.length > 0) {
      result.warnings.push({
        type: 'performance',
        message: `${entriesWithLongNotes.length} entries have very long notes`,
        affectedItems: entriesWithLongNotes.map(e => e.date),
        recommendation: 'Consider truncating or moving long notes to separate storage'
      });
    }

    // Check for excessive book periods
    if (history.bookPeriods.length > 1000) {
      result.warnings.push({
        type: 'performance',
        message: `Large number of book periods (${history.bookPeriods.length})`,
        affectedItems: ['bookPeriods'],
        recommendation: 'Consider periodic cleanup of old book periods'
      });
    }
  }

  /**
   * Validate book references
   */
  private static validateBookReferences(
    history: EnhancedStreakHistory,
    books: Book[],
    result: ValidationResult
  ): void {
    if (!history.readingDayEntries) return;

    const bookIds = new Set(books.map(book => book.id));
    const orphanedReferences: string[] = [];

    for (const entry of history.readingDayEntries) {
      if (entry.bookIds) {
        const missingBooks = entry.bookIds.filter(id => !bookIds.has(id));
        if (missingBooks.length > 0) {
          orphanedReferences.push(entry.date);
        }
      }
    }

    if (orphanedReferences.length > 0) {
      result.warnings.push({
        type: 'inconsistency',
        message: `${orphanedReferences.length} entries reference non-existent books`,
        affectedItems: orphanedReferences,
        recommendation: 'Clean up orphaned book references'
      });
    }
  }

  /**
   * Calculate overall integrity score
   */
  private static calculateIntegrityScore(result: ValidationResult): number {
    let score = 100;

    // Penalize for critical issues
    const criticalIssues = result.issues.filter(i => i.type === 'critical');
    score -= criticalIssues.length * 25;

    // Penalize for errors
    const errorIssues = result.issues.filter(i => i.type === 'error');
    score -= errorIssues.length * 10;

    // Minor penalty for warnings
    score -= result.warnings.length * 2;

    // Bonus for fixable issues (shows recoverability)
    if (result.fixableIssues.length > 0) {
      score += Math.min(10, result.fixableIssues.length * 2);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on validation results
   */
  private static generateRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = [];

    // High priority recommendations
    const criticalIssues = result.issues.filter(i => i.type === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical data structure issues immediately');
    }

    const errorIssues = result.issues.filter(i => i.type === 'error');
    if (errorIssues.length > 0) {
      recommendations.push('Fix data consistency errors to prevent data loss');
    }

    // Fixable issues
    if (result.fixableIssues.length > 0) {
      recommendations.push(`Consider running auto-fix for ${result.fixableIssues.length} fixable issues`);
    }

    // Performance recommendations
    const performanceWarnings = result.warnings.filter(w => w.type === 'performance');
    if (performanceWarnings.length > 0) {
      recommendations.push('Optimize data structure for better performance');
    }

    // Data quality recommendations
    const dataQualityWarnings = result.warnings.filter(w => w.type === 'data_loss' || w.type === 'inconsistency');
    if (dataQualityWarnings.length > 0) {
      recommendations.push('Review data quality issues to improve accuracy');
    }

    // Overall health
    if (result.score >= 95) {
      recommendations.push('Data integrity is excellent - no action needed');
    } else if (result.score >= 85) {
      recommendations.push('Data integrity is good - minor cleanup recommended');
    } else if (result.score >= 70) {
      recommendations.push('Data integrity needs attention - schedule maintenance');
    } else {
      recommendations.push('Data integrity is poor - immediate action required');
    }

    return recommendations;
  }

  /**
   * Generate validation statistics
   */
  static getValidationStats(history: EnhancedStreakHistory): ValidationStats {
    const validation = this.validateEnhancedStreakHistory(history);
    
    const totalEntries = history.readingDayEntries?.length || 0;
    const invalidEntries = validation.issues.filter(i => i.category === 'format').length;
    const validEntries = totalEntries - invalidEntries;
    
    const duplicateEntries = validation.issues
      .filter(i => i.message.includes('Duplicate'))
      .reduce((sum, issue) => sum + issue.affectedItems.length, 0);
    
    const futureEntries = validation.warnings
      .filter(w => w.message.includes('future'))
      .reduce((sum, warning) => sum + warning.affectedItems.length, 0);
    
    const missingMetadata = validation.issues
      .filter(i => i.message.includes('Missing'))
      .reduce((sum, issue) => sum + issue.affectedItems.length, 0);

    return {
      totalEntries,
      validEntries,
      invalidEntries,
      duplicateEntries,
      futureEntries,
      missingMetadata,
      consistencyScore: Math.max(0, 100 - validation.issues.length * 10),
      dataQualityScore: validation.score
    };
  }

  /**
   * Auto-fix fixable issues
   */
  static autoFixIssues(history: EnhancedStreakHistory): {
    fixed: number;
    failed: number;
    updatedHistory: EnhancedStreakHistory;
  } {
    let fixed = 0;
    let failed = 0;
    let updatedHistory = { ...history };

    try {
      // Fix missing or invalid readingDays Set
      if (!updatedHistory.readingDays || !(updatedHistory.readingDays instanceof Set)) {
        updatedHistory.readingDays = new Set(updatedHistory.readingDayEntries?.map(e => e.date) || []);
        fixed++;
      }

      // Fix missing version
      if (!updatedHistory.version) {
        updatedHistory.version = 1;
        fixed++;
      }

      // Fix missing timestamps
      const now = new Date();
      if (!updatedHistory.lastSyncDate) {
        updatedHistory.lastSyncDate = now;
        fixed++;
      }

      if (!updatedHistory.lastCalculated) {
        updatedHistory.lastCalculated = now;
        fixed++;
      }

      // Remove duplicate entries
      if (updatedHistory.readingDayEntries) {
        const uniqueEntries = new Map<string, EnhancedReadingDayEntry>();
        
        for (const entry of updatedHistory.readingDayEntries) {
          const existing = uniqueEntries.get(entry.date);
          if (!existing || entry.modifiedAt > existing.modifiedAt) {
            uniqueEntries.set(entry.date, entry);
          }
        }
        
        const originalLength = updatedHistory.readingDayEntries.length;
        updatedHistory.readingDayEntries = Array.from(uniqueEntries.values());
        
        if (originalLength > updatedHistory.readingDayEntries.length) {
          fixed++;
        }
      }

      // Synchronize readingDays with readingDayEntries
      const entryDates = new Set(updatedHistory.readingDayEntries?.map(e => e.date) || []);
      const readingDaysArray = Array.from(updatedHistory.readingDays);
      
      // Add missing entries
      for (const date of readingDaysArray) {
        if (!entryDates.has(date)) {
          updatedHistory.readingDayEntries = updatedHistory.readingDayEntries || [];
          updatedHistory.readingDayEntries.push({
            date,
            source: 'manual',
            createdAt: now,
            modifiedAt: now
          });
          fixed++;
        }
      }

      // Add missing dates to readingDays
      for (const date of entryDates) {
        if (!updatedHistory.readingDays.has(date)) {
          updatedHistory.readingDays.add(date);
          fixed++;
        }
      }

    } catch (error) {
      console.error('Error auto-fixing issues:', error);
      failed++;
    }

    return {
      fixed,
      failed,
      updatedHistory
    };
  }
}