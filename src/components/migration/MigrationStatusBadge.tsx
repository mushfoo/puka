import React from 'react'
import { MigrationState } from '@/contexts/AuthContext'

interface MigrationStatusBadgeProps {
  migrationState: MigrationState
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const statusConfig = {
  none: {
    label: 'Not started',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    )
  },
  available: {
    label: 'Ready to sync',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )
  },
  in_progress: {
    label: 'Syncing...',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  },
  completed: {
    label: 'Synced',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  failed: {
    label: 'Sync failed',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
}

export const MigrationStatusBadge: React.FC<MigrationStatusBadgeProps> = ({
  migrationState,
  className = '',
  size = 'sm',
  showLabel = true
}) => {
  const config = statusConfig[migrationState.status]
  const sizeClass = sizeClasses[size]

  if (!showLabel) {
    return (
      <div 
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${config.color} ${className}`}
        title={config.label}
      >
        {config.icon}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center space-x-1.5 rounded-full border font-medium ${config.color} ${sizeClass} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
      
      {/* Additional info for some states */}
      {migrationState.status === 'failed' && migrationState.errorMessage && (
        <span className="ml-1 text-xs opacity-75" title={migrationState.errorMessage}>
          (Click for details)
        </span>
      )}
      
      {migrationState.skipCount > 0 && migrationState.status !== 'completed' && (
        <span className="ml-1 text-xs opacity-75">
          (Skipped {migrationState.skipCount}x)
        </span>
      )}
    </div>
  )
}

export default MigrationStatusBadge