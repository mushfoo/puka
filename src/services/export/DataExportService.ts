import { Book, StreakHistory, EnhancedStreakHistory } from '@/types'

export interface ExportOptions {
  includeBooks: boolean
  includeSettings: boolean
  includeStreaks: boolean
  includeMetadata: boolean
  format: 'json' | 'csv'
  filename?: string
  compression?: boolean
}

export interface ExportResult {
  success: boolean
  filename: string
  size: number
  itemCount: {
    books: number
    streaks: number
    settings: number
  }
  error?: string
}

export interface ExportData {
  metadata: {
    exportedAt: string
    version: string
    source: 'localStorage' | 'database'
    includeTypes: string[]
    totalSize: number
  }
  books?: Book[]
  settings?: any
  streakHistory?: StreakHistory
  enhancedStreakHistory?: EnhancedStreakHistory
}

class DataExportService {
  private readonly VERSION = '1.0.0'

  /**
   * Export data from localStorage with specified options
   */
  async exportLocalData(options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const finalOptions: ExportOptions = {
      includeBooks: true,
      includeSettings: true,
      includeStreaks: true,
      includeMetadata: true,
      format: 'json',
      ...options
    }

    try {
      const exportData = await this.collectLocalData(finalOptions)
      const result = await this.createExportFile(exportData, finalOptions)
      return result
    } catch (error) {
      console.error('Export failed:', error)
      return {
        success: false,
        filename: '',
        size: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Quick export for pre-migration backup
   */
  async createPreMigrationBackup(): Promise<ExportResult> {
    const filename = `puka-backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`
    
    return this.exportLocalData({
      includeBooks: true,
      includeSettings: true,
      includeStreaks: true,
      includeMetadata: true,
      format: 'json',
      filename
    })
  }

  /**
   * Export data in CSV format for books
   */
  async exportBooksAsCSV(): Promise<ExportResult> {
    try {
      const books = await this.getLocalBooks()
      if (books.length === 0) {
        throw new Error('No books found to export')
      }

      const csvContent = this.convertBooksToCSV(books)
      const filename = `puka-books-${Date.now()}.csv`
      
      this.downloadFile(csvContent, filename, 'text/csv')

      return {
        success: true,
        filename,
        size: csvContent.length,
        itemCount: { books: books.length, streaks: 0, settings: 0 }
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        size: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 },
        error: error instanceof Error ? error.message : 'CSV export failed'
      }
    }
  }

  /**
   * Estimate export size before creating the file
   */
  async estimateExportSize(options: Partial<ExportOptions> = {}): Promise<{
    estimatedSize: number
    itemCount: { books: number; streaks: number; settings: number }
  }> {
    try {
      const exportData = await this.collectLocalData({
        includeBooks: true,
        includeSettings: true,
        includeStreaks: true,
        includeMetadata: true,
        format: 'json',
        ...options
      })

      const jsonString = JSON.stringify(exportData, null, 2)
      return {
        estimatedSize: jsonString.length,
        itemCount: {
          books: exportData.books?.length || 0,
          streaks: this.countStreakEntries(exportData),
          settings: exportData.settings ? 1 : 0
        }
      }
    } catch (error) {
      console.error('Failed to estimate export size:', error)
      return {
        estimatedSize: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 }
      }
    }
  }

  /**
   * Check if there's data available to export
   */
  async hasDataToExport(): Promise<{
    hasBooks: boolean
    hasSettings: boolean
    hasStreaks: boolean
    totalItems: number
  }> {
    try {
      const books = await this.getLocalBooks()
      const settings = this.getLocalSettings()
      const streaks = this.getLocalStreaks()

      return {
        hasBooks: books.length > 0,
        hasSettings: !!settings,
        hasStreaks: this.countStreakEntries({ streakHistory: streaks.basic, enhancedStreakHistory: streaks.enhanced }) > 0,
        totalItems: books.length + (settings ? 1 : 0) + this.countStreakEntries({ streakHistory: streaks.basic, enhancedStreakHistory: streaks.enhanced })
      }
    } catch (error) {
      console.error('Failed to check export data:', error)
      return { hasBooks: false, hasSettings: false, hasStreaks: false, totalItems: 0 }
    }
  }

  /**
   * Collect data from localStorage based on options
   */
  private async collectLocalData(options: ExportOptions): Promise<ExportData> {
    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: this.VERSION,
        source: 'localStorage',
        includeTypes: [],
        totalSize: 0
      }
    }

    if (options.includeBooks) {
      exportData.books = await this.getLocalBooks()
      exportData.metadata.includeTypes.push('books')
    }

    if (options.includeSettings) {
      const settings = this.getLocalSettings()
      if (settings) {
        exportData.settings = settings
        exportData.metadata.includeTypes.push('settings')
      }
    }

    if (options.includeStreaks) {
      const streaks = this.getLocalStreaks()
      if (streaks.basic) {
        exportData.streakHistory = streaks.basic
        exportData.metadata.includeTypes.push('streakHistory')
      }
      if (streaks.enhanced) {
        exportData.enhancedStreakHistory = streaks.enhanced
        exportData.metadata.includeTypes.push('enhancedStreakHistory')
      }
    }

    // Calculate total size
    exportData.metadata.totalSize = JSON.stringify(exportData).length

    return exportData
  }

  /**
   * Get books from localStorage
   */
  private async getLocalBooks(): Promise<Book[]> {
    try {
      const booksData = localStorage.getItem('puka-books')
      if (!booksData) return []

      const books = JSON.parse(booksData)
      if (!Array.isArray(books)) return []

      // Convert date strings back to Date objects
      return books.map((book: any) => ({
        ...book,
        dateAdded: new Date(book.dateAdded),
        dateModified: book.dateModified ? new Date(book.dateModified) : undefined,
        dateStarted: book.dateStarted ? new Date(book.dateStarted) : undefined,
        dateFinished: book.dateFinished ? new Date(book.dateFinished) : undefined
      }))
    } catch (error) {
      console.error('Failed to get local books:', error)
      return []
    }
  }

  /**
   * Get settings from localStorage
   */
  private getLocalSettings(): any | null {
    try {
      const settingsData = localStorage.getItem('puka-settings')
      return settingsData ? JSON.parse(settingsData) : null
    } catch (error) {
      console.error('Failed to get local settings:', error)
      return null
    }
  }

  /**
   * Get streak data from localStorage
   */
  private getLocalStreaks(): {
    basic: StreakHistory | null
    enhanced: EnhancedStreakHistory | null
  } {
    try {
      let basic: StreakHistory | null = null
      let enhanced: EnhancedStreakHistory | null = null

      // Get basic streak history
      const basicData = localStorage.getItem('puka-streak-history')
      if (basicData) {
        basic = JSON.parse(basicData)
        if (basic) {
          basic.lastCalculated = new Date(basic.lastCalculated)
          basic.readingDays = new Set(basic.readingDays)
        }
      }

      // Get enhanced streak history
      const enhancedData = localStorage.getItem('puka-enhanced-streak-history')
      if (enhancedData) {
        enhanced = JSON.parse(enhancedData)
        if (enhanced) {
          enhanced.lastCalculated = new Date(enhanced.lastCalculated)
          enhanced.lastSyncDate = new Date(enhanced.lastSyncDate)
          enhanced.readingDays = new Set(enhanced.readingDays)
          enhanced.readingDayEntries = enhanced.readingDayEntries.map(entry => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            modifiedAt: new Date(entry.modifiedAt)
          }))
        }
      }

      return { basic, enhanced }
    } catch (error) {
      console.error('Failed to get local streaks:', error)
      return { basic: null, enhanced: null }
    }
  }

  /**
   * Count total streak entries
   */
  private countStreakEntries(data: Partial<ExportData>): number {
    let count = 0
    
    if (data.streakHistory?.readingDays) {
      count += data.streakHistory.readingDays.size
    }
    
    if (data.enhancedStreakHistory?.readingDayEntries) {
      count = Math.max(count, data.enhancedStreakHistory.readingDayEntries.length)
    }
    
    return count
  }

  /**
   * Create and download export file
   */
  private async createExportFile(exportData: ExportData, options: ExportOptions): Promise<ExportResult> {
    let content: string
    let mimeType: string
    let filename: string

    if (options.format === 'csv' && exportData.books) {
      content = this.convertBooksToCSV(exportData.books)
      mimeType = 'text/csv'
      filename = options.filename || `puka-books-${Date.now()}.csv`
    } else {
      content = JSON.stringify(exportData, this.jsonReplacer, 2)
      mimeType = 'application/json'
      filename = options.filename || `puka-export-${Date.now()}.json`
    }

    this.downloadFile(content, filename, mimeType)

    return {
      success: true,
      filename,
      size: content.length,
      itemCount: {
        books: exportData.books?.length || 0,
        streaks: this.countStreakEntries(exportData),
        settings: exportData.settings ? 1 : 0
      }
    }
  }

  /**
   * Convert books to CSV format
   */
  private convertBooksToCSV(books: Book[]): string {
    if (books.length === 0) return ''

    const headers = [
      'id', 'title', 'author', 'status', 'progress', 'notes',
      'dateAdded', 'dateModified', 'dateStarted', 'dateFinished',
      'isbn', 'coverUrl', 'tags', 'rating', 'totalPages', 'currentPage',
      'genre', 'publishedDate'
    ]

    const csvRows = [headers.join(',')]

    books.forEach(book => {
      const row = headers.map(header => {
        let value = book[header as keyof Book]
        
        if (value instanceof Date) {
          value = value.toISOString()
        } else if (Array.isArray(value)) {
          value = value.join(';')
        } else if (value === null || value === undefined) {
          value = ''
        }
        
        // Escape CSV values
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }

  /**
   * JSON replacer to handle special objects like Set
   */
  private jsonReplacer(key: string, value: any): any {
    if (value instanceof Set) {
      return Array.from(value)
    }
    if (value instanceof Date) {
      return value.toISOString()
    }
    return value
  }

  /**
   * Download file to user's device
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
}

// Export singleton instance
export const dataExportService = new DataExportService()
export default dataExportService