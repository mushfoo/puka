import React from 'react'

export interface MigrationProgressData {
  phase: 'preparing' | 'books' | 'settings' | 'streaks' | 'cleanup' | 'complete' | 'error'
  totalItems: number
  completedItems: number
  currentItem?: string
  message: string
  percentage: number
  estimatedTimeRemaining?: number
  booksProcessed?: number
  streaksProcessed?: number
  settingsProcessed?: boolean
}

interface MigrationProgressIndicatorProps {
  progress: MigrationProgressData
  compact?: boolean
  showDetails?: boolean
  className?: string
}

const phaseLabels = {
  preparing: 'Preparing migration...',
  books: 'Migrating books',
  settings: 'Migrating settings',
  streaks: 'Migrating reading streaks',
  cleanup: 'Finalizing migration',
  complete: 'Migration complete',
  error: 'Migration error'
}

const phaseIcons = {
  preparing: (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  books: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  streaks: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  cleanup: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  complete: (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}m remaining`
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MigrationProgressIndicator: React.FC<MigrationProgressIndicatorProps> = ({
  progress,
  compact = false,
  showDetails = true,
  className = ''
}) => {
  const isError = progress.phase === 'error'
  const isComplete = progress.phase === 'complete'
  
  const progressBarColor = isError 
    ? 'bg-red-500'
    : isComplete
      ? 'bg-green-500'
      : 'bg-blue-500'

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex-shrink-0">
          {phaseIcons[progress.phase]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {progress.message}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${progressBarColor}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {Math.round(progress.percentage)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            isError ? 'bg-red-100' : isComplete ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {phaseIcons[progress.phase]}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {phaseLabels[progress.phase]}
            </h3>
            <p className="text-sm text-gray-600">
              {progress.message}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(progress.percentage)}%
          </div>
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <div className="text-sm text-gray-500">
              {formatTimeRemaining(progress.estimatedTimeRemaining)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progress.completedItems} of {progress.totalItems} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Current Item */}
      {progress.currentItem && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-600 mb-1">Currently processing:</div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {progress.currentItem}
          </div>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {typeof progress.booksProcessed === 'number' && (
            <div>
              <span className="text-gray-600">Books:</span>
              <span className="ml-2 font-medium">{progress.booksProcessed}</span>
            </div>
          )}
          {typeof progress.streaksProcessed === 'number' && (
            <div>
              <span className="text-gray-600">Streaks:</span>
              <span className="ml-2 font-medium">{progress.streaksProcessed}</span>
            </div>
          )}
          {typeof progress.settingsProcessed === 'boolean' && (
            <div>
              <span className="text-gray-600">Settings:</span>
              <span className="ml-2 font-medium">
                {progress.settingsProcessed ? 'Migrated' : 'Pending'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MigrationProgressIndicator