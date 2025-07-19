import React, { useState } from 'react'
import { MigrationPromptData } from '@/contexts/AuthContext'
import { useDataExport } from '@/hooks/useDataExport'
import ExportOptionsModal from './ExportOptionsModal'

interface MigrationPromptCardProps {
  data: MigrationPromptData
  onStartMigration: () => void
  onExportFirst: () => void
  onSkip: () => void
  onDismiss: () => void
  isExporting?: boolean
  className?: string
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const MigrationPromptCard: React.FC<MigrationPromptCardProps> = ({
  data,
  onStartMigration,
  onExportFirst,
  onSkip,
  onDismiss,
  isExporting = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const { createPreMigrationBackup, isExporting: isCreatingBackup } = useDataExport()

  const handleQuickExport = async () => {
    try {
      const result = await createPreMigrationBackup()
      if (result.success) {
        onExportFirst()
      }
    } catch (error) {
      console.error('Quick export failed:', error)
    }
  }

  const handleCustomExport = () => {
    setShowExportModal(true)
  }

  const handleExportComplete = (success: boolean, _filename?: string) => {
    if (success) {
      onExportFirst()
    }
  }

  const currentlyExporting = isExporting || isCreatingBackup

  return (
    <>
      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportComplete={handleExportComplete}
        title="Export Before Migration"
        description="Create a backup of your data before starting the migration process."
        showQuickBackup={true}
      />
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sync Your Books to Cloud
            </h3>
            <p className="text-sm text-gray-600">
              We found books stored locally on your device
            </p>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
          <div className="text-2xl font-bold text-blue-600">{data.booksCount}</div>
          <div className="text-sm text-gray-600">Books</div>
        </div>
        <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
          <div className="text-2xl font-bold text-green-600">{data.streaksCount}</div>
          <div className="text-sm text-gray-600">Reading Days</div>
        </div>
        <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
          <div className="text-2xl font-bold text-purple-600">
            {data.hasSettings ? '✓' : '—'}
          </div>
          <div className="text-sm text-gray-600">Settings</div>
        </div>
      </div>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center justify-between w-full p-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
      >
        <span>Migration details</span>
        <svg 
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-blue-100 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Data size:</span>
            <span className="font-medium">{formatSize(data.estimatedSize)}</span>
          </div>
          {data.lastModified && (
            <div className="flex justify-between">
              <span className="text-gray-600">Last updated:</span>
              <span className="font-medium">{formatDate(data.lastModified)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Estimated time:</span>
            <span className="font-medium">
              {data.booksCount < 10 ? '< 1 minute' : `~${Math.ceil(data.booksCount / 10)} minutes`}
            </span>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">Benefits of syncing:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Access your books from any device
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Automatic backups and sync
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Never lose your reading progress
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onStartMigration}
          disabled={currentlyExporting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {currentlyExporting ? 'Preparing...' : 'Sync My Books'}
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleQuickExport}
            disabled={currentlyExporting}
            className="flex items-center justify-center bg-white border border-blue-300 text-blue-700 py-2 px-4 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isCreatingBackup ? (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Exporting...
              </span>
            ) : (
              'Quick Backup'
            )}
          </button>
          
          <button
            onClick={handleCustomExport}
            disabled={currentlyExporting}
            className="flex items-center justify-center bg-white border border-purple-300 text-purple-700 py-2 px-4 rounded-md hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Export Options
          </button>
        </div>
        
        <div className="flex space-x-3 mt-2">
          <button
            onClick={onSkip}
            disabled={currentlyExporting}
            className="flex-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-center py-2"
          >
            Maybe Later
          </button>
        </div>
      </div>

      {/* Safety Note */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <strong>Your local data will remain safe.</strong> We'll keep a backup on your device even after syncing.
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default MigrationPromptCard