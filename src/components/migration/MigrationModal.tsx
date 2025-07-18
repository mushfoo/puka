import { useState, useEffect } from 'react'
import { useDataMigration } from '@/hooks/useDataMigration'
import { useAuth } from '@/contexts/AuthContext'
import MigrationProgressIndicator, { MigrationProgressData } from './MigrationProgressIndicator'
import MigrationPromptCard from './MigrationPromptCard'

interface MigrationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: (success: boolean) => void
}

type MigrationStep = 'intro' | 'options' | 'progress' | 'result'

export function MigrationModal({ isOpen, onClose, onComplete }: MigrationModalProps) {
  const [currentStep, setCurrentStep] = useState<MigrationStep>('intro')
  const [migrationOptions, setMigrationOptions] = useState({
    skipDuplicates: true,
    preserveLocalData: true,
    batchSize: 10
  })
  const [estimatedInfo, setEstimatedInfo] = useState<{
    totalBooks: number
    estimatedDuration: number
    estimatedSize: number
  } | null>(null)

  const {
    isAvailable,
    inProgress,
    progress,
    result,
    error,
    startMigration,
    estimateMigration,
    clearResult,
    clearError
  } = useDataMigration()

  // Get migration estimate when modal opens
  useEffect(() => {
    if (isOpen && isAvailable && !estimatedInfo) {
      estimateMigration()
        .then(setEstimatedInfo)
        .catch(console.error)
    }
  }, [isOpen, isAvailable, estimatedInfo, estimateMigration])

  // Handle migration completion
  useEffect(() => {
    if (result) {
      setCurrentStep('result')
      onComplete?.(result.success)
    }
  }, [result, onComplete])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('intro')
      clearResult()
      clearError()
    }
  }, [isOpen, clearResult, clearError])

  const handleStartMigration = async () => {
    try {
      setCurrentStep('progress')
      await startMigration(migrationOptions)
    } catch (error) {
      console.error('Migration failed:', error)
    }
  }

  const handleClose = () => {
    if (!inProgress) {
      onClose()
    }
  }

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.ceil(milliseconds / 1000)
    if (seconds < 60) return `${seconds} seconds`
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  if (!isOpen || !isAvailable) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Sync Your Books to Cloud
            </h2>
            {!inProgress && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step: Introduction */}
          {currentStep === 'intro' && (
            <div>
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">
                  We found books stored locally on your device. Let's sync them to the cloud so you can access them from anywhere!
                </p>

                {estimatedInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-blue-900 mb-2">Migration Summary</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>{estimatedInfo.totalBooks}</strong> books to sync</li>
                      <li>• Estimated time: <strong>{formatDuration(estimatedInfo.estimatedDuration)}</strong></li>
                      <li>• Data size: <strong>{formatSize(estimatedInfo.estimatedSize)}</strong></li>
                    </ul>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">What happens next?</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ Your local books will be safely copied to the cloud</li>
                    <li>✓ Your reading progress and streaks will be preserved</li>
                    <li>✓ You'll be able to access your books from any device</li>
                    <li>✓ Your local data will remain as a backup</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('options')}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Continue
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          )}

          {/* Step: Migration Options */}
          {currentStep === 'options' && (
            <div>
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-4">Migration Options</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <input
                      id="skipDuplicates"
                      type="checkbox"
                      checked={migrationOptions.skipDuplicates}
                      onChange={(e) => setMigrationOptions(prev => ({
                        ...prev,
                        skipDuplicates: e.target.checked
                      }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <label htmlFor="skipDuplicates" className="font-medium text-gray-900">
                        Skip duplicate books
                      </label>
                      <p className="text-sm text-gray-600">
                        Don't sync books that already exist in your cloud library
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <input
                      id="preserveLocal"
                      type="checkbox"
                      checked={migrationOptions.preserveLocalData}
                      onChange={(e) => setMigrationOptions(prev => ({
                        ...prev,
                        preserveLocalData: e.target.checked
                      }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <label htmlFor="preserveLocal" className="font-medium text-gray-900">
                        Keep local backup
                      </label>
                      <p className="text-sm text-gray-600">
                        Recommended: Keep your books stored locally as a backup
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('intro')}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartMigration}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Start Migration
                </button>
              </div>
            </div>
          )}

          {/* Step: Migration Progress */}
          {currentStep === 'progress' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Syncing Your Books...
                </h3>
                <p className="text-gray-600">
                  This may take a few minutes. Please don't close this window.
                </p>
              </div>

              {progress && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{progress.message}</span>
                      <span>{Math.round(progress.percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {progress.currentItem && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Current:</span> {progress.currentItem}
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Progress:</span> {progress.completedItems} of {progress.totalItems} items
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Migration Result */}
          {currentStep === 'result' && result && (
            <div>
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  result.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {result.success ? (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {result.success ? 'Migration Complete!' : 'Migration Had Issues'}
                </h3>
                <p className="text-gray-600">
                  {result.success 
                    ? 'Your books have been successfully synced to the cloud.'
                    : 'Some books could not be synced. Check the details below.'
                  }
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Books synced:</span>
                  <span className="font-medium">{result.booksImported}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Skipped:</span>
                  <span className="font-medium">{result.skipped}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duplicates found:</span>
                  <span className="font-medium">{result.duplicates}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duration:</span>
                  <span className="font-medium">{formatDuration(result.duration)}</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>• ... and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                {result.success ? 'Great!' : 'Continue Anyway'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MigrationModal