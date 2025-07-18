import React, { useState, useEffect } from 'react'
import { useDataExport } from '@/hooks/useDataExport'
import { ExportOptions } from '@/services/export/DataExportService'

interface ExportOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  onExportComplete?: (success: boolean, filename?: string) => void
  title?: string
  description?: string
  defaultOptions?: Partial<ExportOptions>
  showQuickBackup?: boolean
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  onExportComplete,
  title = 'Export Your Data',
  description = 'Choose what data you want to export and in which format.',
  defaultOptions = {},
  showQuickBackup = true
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    includeBooks: true,
    includeSettings: true,
    includeStreaks: true,
    includeMetadata: true,
    format: 'json',
    ...defaultOptions
  })
  
  const [availability, setAvailability] = useState({
    hasBooks: false,
    hasSettings: false,
    hasStreaks: false,
    totalItems: 0
  })
  
  const [estimate, setEstimate] = useState({
    estimatedSize: 0,
    itemCount: { books: 0, streaks: 0, settings: 0 }
  })

  const {
    exportState,
    startExport,
    createPreMigrationBackup,
    exportBooksCSV,
    checkDataAvailability,
    estimateExportSize,
    clearExportState
  } = useDataExport()

  // Check data availability when modal opens
  useEffect(() => {
    if (isOpen) {
      checkDataAvailability().then(setAvailability)
    }
  }, [isOpen, checkDataAvailability])

  // Update estimate when options change
  useEffect(() => {
    if (isOpen) {
      estimateExportSize(options).then(setEstimate)
    }
  }, [isOpen, options, estimateExportSize])

  // Handle export completion
  useEffect(() => {
    if (exportState.result) {
      const { success, filename } = exportState.result
      onExportComplete?.(success, filename)
      
      if (success) {
        // Auto-close modal after successful export (with delay)
        setTimeout(() => {
          onClose()
          clearExportState()
        }, 2000)
      }
    }
  }, [exportState.result, onExportComplete, onClose, clearExportState])

  const handleExport = async () => {
    try {
      await startExport(options)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleQuickBackup = async () => {
    try {
      await createPreMigrationBackup()
    } catch (error) {
      console.error('Quick backup failed:', error)
    }
  }

  const handleQuickCSV = async () => {
    try {
      await exportBooksCSV()
    } catch (error) {
      console.error('CSV export failed:', error)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const canExport = () => {
    return (options.includeBooks && availability.hasBooks) ||
           (options.includeSettings && availability.hasSettings) ||
           (options.includeStreaks && availability.hasStreaks)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
            {!exportState.isExporting && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Export in Progress */}
          {exportState.isExporting && (
            <div className="mb-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Creating Export...
                </h3>
                <p className="text-gray-600 mb-4">
                  {exportState.currentStep}
                </p>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportState.progress}%` }}
                />
              </div>
              <div className="text-center text-sm text-gray-600 mt-2">
                {exportState.progress}%
              </div>
            </div>
          )}

          {/* Success State */}
          {exportState.result?.success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-medium text-green-900">Export Successful!</h4>
                  <p className="text-sm text-green-800">
                    Saved as {exportState.result.filename} ({formatSize(exportState.result.size)})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {exportState.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div>
                  <h4 className="font-medium text-red-900">Export Failed</h4>
                  <p className="text-sm text-red-800">{exportState.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {!exportState.isExporting && !exportState.result && showQuickBackup && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleQuickBackup}
                  className="flex items-center justify-between p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Complete Backup</div>
                      <div className="text-sm text-gray-600">All data in JSON format</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {availability.hasBooks && (
                  <button
                    onClick={handleQuickCSV}
                    className="flex items-center justify-between p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Books as CSV</div>
                        <div className="text-sm text-gray-600">Spreadsheet compatible</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Custom Export Options */}
          {!exportState.isExporting && !exportState.result && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Custom Export</h3>
              
              {/* Data Selection */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center">
                  <input
                    id="includeBooks"
                    type="checkbox"
                    checked={options.includeBooks}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeBooks: e.target.checked }))}
                    disabled={!availability.hasBooks}
                    className="mr-3"
                  />
                  <label htmlFor="includeBooks" className="flex-1">
                    <span className="font-medium text-gray-900">Books</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({availability.hasBooks ? estimate.itemCount.books : 0} items)
                    </span>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="includeStreaks"
                    type="checkbox"
                    checked={options.includeStreaks}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeStreaks: e.target.checked }))}
                    disabled={!availability.hasStreaks}
                    className="mr-3"
                  />
                  <label htmlFor="includeStreaks" className="flex-1">
                    <span className="font-medium text-gray-900">Reading Streaks</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({availability.hasStreaks ? estimate.itemCount.streaks : 0} days)
                    </span>
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="includeSettings"
                    type="checkbox"
                    checked={options.includeSettings}
                    onChange={(e) => setOptions(prev => ({ ...prev, includeSettings: e.target.checked }))}
                    disabled={!availability.hasSettings}
                    className="mr-3"
                  />
                  <label htmlFor="includeSettings" className="flex-1">
                    <span className="font-medium text-gray-900">Settings</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({availability.hasSettings ? 1 : 0} item)
                    </span>
                  </label>
                </div>
              </div>

              {/* Format Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOptions(prev => ({ ...prev, format: 'json' }))}
                    className={`p-2 border rounded-md text-sm font-medium transition-colors ${
                      options.format === 'json'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setOptions(prev => ({ ...prev, format: 'csv' }))}
                    disabled={!options.includeBooks}
                    className={`p-2 border rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      options.format === 'csv'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    CSV (Books only)
                  </button>
                </div>
              </div>

              {/* Estimate */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Estimated size:</strong> {formatSize(estimate.estimatedSize)}
                </div>
              </div>

              {/* Custom Export Button */}
              <button
                onClick={handleExport}
                disabled={!canExport()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Create Custom Export
              </button>
            </div>
          )}

          {/* Footer */}
          {!exportState.isExporting && (
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {exportState.result ? 'Done' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExportOptionsModal