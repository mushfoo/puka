import { useState, useCallback } from 'react'
import { dataExportService, ExportOptions, ExportResult } from '@/services/export/DataExportService'
import { migrationPersistenceService } from '@/services/migration/MigrationPersistenceService'

export interface ExportState {
  isExporting: boolean
  progress: number
  currentStep: string
  result: ExportResult | null
  error: string | null
}

export function useDataExport() {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    currentStep: '',
    result: null,
    error: null
  })

  const startExport = useCallback(async (options?: Partial<ExportOptions>): Promise<ExportResult> => {
    setExportState({
      isExporting: true,
      progress: 0,
      currentStep: 'Initializing export...',
      result: null,
      error: null
    })

    try {
      // Step 1: Check data availability
      setExportState(prev => ({
        ...prev,
        progress: 20,
        currentStep: 'Checking available data...'
      }))

      const availability = await dataExportService.hasDataToExport()
      if (availability.totalItems === 0) {
        throw new Error('No data found to export')
      }

      // Step 2: Estimate export size
      setExportState(prev => ({
        ...prev,
        progress: 40,
        currentStep: 'Calculating export size...'
      }))

      const estimate = await dataExportService.estimateExportSize(options)

      // Step 3: Export data
      setExportState(prev => ({
        ...prev,
        progress: 60,
        currentStep: 'Creating export file...'
      }))

      const result = await dataExportService.exportLocalData(options)

      if (!result.success) {
        throw new Error(result.error || 'Export failed')
      }

      // Step 4: Complete
      setExportState(prev => ({
        ...prev,
        progress: 100,
        currentStep: 'Export complete!',
        result,
        isExporting: false
      }))

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      
      setExportState(prev => ({
        ...prev,
        isExporting: false,
        error: errorMessage,
        currentStep: 'Export failed'
      }))

      return {
        success: false,
        filename: '',
        size: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 },
        error: errorMessage
      }
    }
  }, [])

  const createPreMigrationBackup = useCallback(async (): Promise<ExportResult> => {
    setExportState({
      isExporting: true,
      progress: 0,
      currentStep: 'Creating pre-migration backup...',
      result: null,
      error: null
    })

    try {
      // Step 1: Check data
      setExportState(prev => ({
        ...prev,
        progress: 25,
        currentStep: 'Scanning local data...'
      }))

      const availability = await dataExportService.hasDataToExport()
      
      // Step 2: Create backup
      setExportState(prev => ({
        ...prev,
        progress: 75,
        currentStep: 'Creating backup file...'
      }))

      const result = await dataExportService.createPreMigrationBackup()

      if (result.success) {
        // Update user preferences to indicate backup was created
        migrationPersistenceService.setAutoExportPreference(true)
        
        setExportState(prev => ({
          ...prev,
          progress: 100,
          currentStep: 'Backup created successfully!',
          result,
          isExporting: false
        }))
      } else {
        throw new Error(result.error || 'Backup creation failed')
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup creation failed'
      
      setExportState(prev => ({
        ...prev,
        isExporting: false,
        error: errorMessage,
        currentStep: 'Backup failed'
      }))

      return {
        success: false,
        filename: '',
        size: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 },
        error: errorMessage
      }
    }
  }, [])

  const exportBooks = useCallback(async (): Promise<ExportResult> => {
    return startExport({
      includeBooks: true,
      includeSettings: false,
      includeStreaks: false,
      format: 'json'
    })
  }, [startExport])

  const exportBooksCSV = useCallback(async (): Promise<ExportResult> => {
    setExportState({
      isExporting: true,
      progress: 0,
      currentStep: 'Exporting books to CSV...',
      result: null,
      error: null
    })

    try {
      setExportState(prev => ({
        ...prev,
        progress: 50,
        currentStep: 'Converting to CSV format...'
      }))

      const result = await dataExportService.exportBooksAsCSV()

      setExportState(prev => ({
        ...prev,
        progress: 100,
        currentStep: result.success ? 'CSV export complete!' : 'CSV export failed',
        result,
        isExporting: false,
        error: result.success ? null : (result.error || 'CSV export failed')
      }))

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CSV export failed'
      
      setExportState(prev => ({
        ...prev,
        isExporting: false,
        error: errorMessage,
        currentStep: 'CSV export failed'
      }))

      return {
        success: false,
        filename: '',
        size: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 },
        error: errorMessage
      }
    }
  }, [])

  const exportAll = useCallback(async (): Promise<ExportResult> => {
    return startExport({
      includeBooks: true,
      includeSettings: true,
      includeStreaks: true,
      format: 'json'
    })
  }, [startExport])

  const estimateExportSize = useCallback(async (options?: Partial<ExportOptions>) => {
    try {
      return await dataExportService.estimateExportSize(options)
    } catch (error) {
      console.error('Failed to estimate export size:', error)
      return {
        estimatedSize: 0,
        itemCount: { books: 0, streaks: 0, settings: 0 }
      }
    }
  }, [])

  const checkDataAvailability = useCallback(async () => {
    try {
      return await dataExportService.hasDataToExport()
    } catch (error) {
      console.error('Failed to check data availability:', error)
      return { hasBooks: false, hasSettings: false, hasStreaks: false, totalItems: 0 }
    }
  }, [])

  const clearExportState = useCallback(() => {
    setExportState({
      isExporting: false,
      progress: 0,
      currentStep: '',
      result: null,
      error: null
    })
  }, [])

  const retryLastExport = useCallback(async (): Promise<ExportResult> => {
    // This would require storing the last export options
    // For now, just do a full export
    return exportAll()
  }, [exportAll])

  return {
    exportState,
    startExport,
    createPreMigrationBackup,
    exportBooks,
    exportBooksCSV,
    exportAll,
    estimateExportSize,
    checkDataAvailability,
    clearExportState,
    retryLastExport,
    
    // Convenience getters
    isExporting: exportState.isExporting,
    progress: exportState.progress,
    currentStep: exportState.currentStep,
    result: exportState.result,
    error: exportState.error,
    hasError: !!exportState.error,
    isComplete: !exportState.isExporting && !!exportState.result && exportState.result.success
  }
}

export default useDataExport