import React, { useState } from 'react'
import { MigrationState } from '@/contexts/AuthContext'

export interface MigrationError {
  id: string
  type: 'book' | 'settings' | 'streaks' | 'network' | 'validation' | 'unknown'
  message: string
  details?: string
  data?: any
  timestamp: Date
  phase?: string
  recoverable: boolean
}

interface MigrationErrorModalProps {
  isOpen: boolean
  onClose: () => void
  migrationState: MigrationState
  errors: MigrationError[]
  onRetry?: () => void
  onSkip?: () => void
  onExportLogs?: () => void
}

const errorTypeLabels = {
  book: 'Book Migration',
  settings: 'Settings Migration', 
  streaks: 'Streaks Migration',
  network: 'Network Error',
  validation: 'Data Validation',
  unknown: 'Unknown Error'
}

const errorTypeIcons = {
  book: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  streaks: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  network: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  validation: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  unknown: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export const MigrationErrorModal: React.FC<MigrationErrorModalProps> = ({
  isOpen,
  onClose,
  migrationState,
  errors,
  onRetry,
  onSkip,
  onExportLogs
}) => {
  const [selectedError, setSelectedError] = useState<MigrationError | null>(null)
  const [showRawData, setShowRawData] = useState(false)

  if (!isOpen) return null

  const recoverableErrors = errors.filter(error => error.recoverable)
  const criticalErrors = errors.filter(error => !error.recoverable)

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const generateErrorReport = () => {
    const report = {
      migrationId: migrationState.migrationId,
      timestamp: new Date().toISOString(),
      migrationState,
      errors: errors.map(error => ({
        ...error,
        timestamp: error.timestamp.toISOString()
      })),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    return JSON.stringify(report, null, 2)
  }

  const downloadErrorReport = () => {
    const report = generateErrorReport()
    const blob = new Blob([report], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `migration-error-report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyErrorReport = async () => {
    try {
      await navigator.clipboard.writeText(generateErrorReport())
      // Could show a toast here
    } catch (error) {
      console.error('Failed to copy error report:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Migration Errors
                </h2>
                <p className="text-sm text-gray-600">
                  {errors.length} error{errors.length !== 1 ? 's' : ''} occurred during migration
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Error List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Error List</h3>
              
              {/* Summary */}
              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-red-50 rounded text-center">
                  <div className="font-medium text-red-900">{criticalErrors.length}</div>
                  <div className="text-red-700">Critical</div>
                </div>
                <div className="p-2 bg-yellow-50 rounded text-center">
                  <div className="font-medium text-yellow-900">{recoverableErrors.length}</div>
                  <div className="text-yellow-700">Recoverable</div>
                </div>
              </div>

              {/* Error Items */}
              <div className="space-y-2">
                {errors.map((error) => (
                  <button
                    key={error.id}
                    onClick={() => setSelectedError(error)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedError?.id === error.id
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {errorTypeIcons[error.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {errorTypeLabels[error.type]}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {error.message}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(error.timestamp)}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                        error.recoverable ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Details */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-4">
              {selectedError ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Error Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {errorTypeLabels[selectedError.type]}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Message</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedError.message}
                      </div>
                    </div>
                    
                    {selectedError.details && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Details</label>
                        <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedError.details}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Timestamp</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {formatTimestamp(selectedError.timestamp)}
                      </div>
                    </div>
                    
                    {selectedError.phase && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Migration Phase</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {selectedError.phase}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Recoverable</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedError.recoverable ? 'Yes' : 'No'}
                      </div>
                    </div>
                    
                    {selectedError.data && (
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Raw Data</label>
                          <button
                            onClick={() => setShowRawData(!showRawData)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {showRawData ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        {showRawData && (
                          <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border overflow-auto max-h-32">
                            <pre>{JSON.stringify(selectedError.data, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select an error to view details
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <button
                onClick={downloadErrorReport}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Download Report
              </button>
              <button
                onClick={copyErrorReport}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Copy Report
              </button>
              {onExportLogs && (
                <button
                  onClick={onExportLogs}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Export Full Logs
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Skip Migration
                </button>
              )}
              {onRetry && recoverableErrors.length > 0 && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Retry Migration
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MigrationErrorModal