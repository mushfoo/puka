import { useState } from 'react'
import { useSyncStatus, useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAuth } from '@/components/auth'

interface SyncStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function SyncStatusIndicator({ 
  className = '',
  showDetails = false 
}: SyncStatusIndicatorProps) {
  const { isAuthenticated, canSync } = useAuth()
  const { 
    isActive, 
    inProgress, 
    conflictsCount, 
    lastSyncTime, 
    hasError, 
    error 
  } = useSyncStatus()
  
  const [showConflictModal, setShowConflictModal] = useState(false)

  // Don't show anything if not authenticated
  if (!isAuthenticated || !canSync) {
    return null
  }

  // Determine status and appearance
  const getStatusInfo = () => {
    if (hasError) {
      return {
        icon: '⚠️',
        text: 'Sync Error',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    }

    if (conflictsCount > 0) {
      return {
        icon: '🔄',
        text: `${conflictsCount} Conflict${conflictsCount > 1 ? 's' : ''}`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      }
    }

    if (inProgress) {
      return {
        icon: '↻',
        text: 'Syncing...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    }

    if (isActive) {
      return {
        icon: '✓',
        text: 'Synced',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    }

    return {
      icon: '○',
      text: 'Offline',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  }

  const statusInfo = getStatusInfo()

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <>
      <div className={`inline-flex items-center ${className}`}>
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border
            ${statusInfo.color} ${statusInfo.bgColor} ${statusInfo.borderColor}
            ${conflictsCount > 0 || hasError ? 'cursor-pointer hover:opacity-80' : ''}
          `}
          onClick={conflictsCount > 0 ? () => setShowConflictModal(true) : undefined}
          title={
            hasError ? `Sync error: ${error?.message}` :
            conflictsCount > 0 ? 'Click to resolve conflicts' :
            `Last sync: ${formatLastSync(lastSyncTime)}`
          }
        >
          <span className={inProgress ? 'animate-spin' : ''}>{statusInfo.icon}</span>
          <span>{statusInfo.text}</span>
        </div>

        {showDetails && (
          <div className="ml-2 text-xs text-gray-500">
            {formatLastSync(lastSyncTime)}
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <ConflictResolutionModal onClose={() => setShowConflictModal(false)} />
      )}
    </>
  )
}

function ConflictResolutionModal({ onClose }: { onClose: () => void }) {
  const { conflicts, resolveConflict } = useRealtimeSync()

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    try {
      await resolveConflict(conflictId, resolution)
      
      // Close modal if no more conflicts
      if (conflicts.length <= 1) {
        onClose()
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Sync Conflicts
            </h2>
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

          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="font-medium text-gray-900 capitalize">
                    {conflict.type} Conflict
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Changes detected on multiple devices. Choose which version to keep:
                  </p>
                </div>

                {conflict.type === 'book' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded p-3">
                        <h4 className="font-medium text-sm text-gray-900 mb-2">
                          Local Version
                        </h4>
                        <p className="text-sm">{conflict.localData.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Progress: {conflict.localData.progress}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Modified: {formatDate(conflict.lastModified.local)}
                        </p>
                      </div>

                      <div className="border rounded p-3">
                        <h4 className="font-medium text-sm text-gray-900 mb-2">
                          Cloud Version
                        </h4>
                        <p className="text-sm">{conflict.remoteData.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Progress: {conflict.remoteData.progress}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Modified: {formatDate(conflict.lastModified.remote)}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'local')}
                        className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        Keep Local
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.id, 'remote')}
                        className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                      >
                        Keep Cloud
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {conflicts.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✓</div>
              <p className="text-gray-600">All conflicts resolved!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export default SyncStatusIndicator