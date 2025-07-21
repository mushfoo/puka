import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentStorageServiceType } from '@/services/storage'

interface SyncStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export function SyncStatusIndicator({
  className = '',
  showDetails = true,
}: SyncStatusIndicatorProps) {
  const { canSync, isAuthenticated } = useAuth()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Check storage service type and sync status
  useEffect(() => {
    const checkSyncStatus = () => {
      if (!isAuthenticated) {
        setSyncStatus('offline')
        return
      }

      const storageType = getCurrentStorageServiceType()
      if (storageType === 'database') {
        setSyncStatus('idle')
        setLastSyncTime(new Date())
        console.log('✅ Cloud sync active - DatabaseStorageService in use')
      } else {
        setSyncStatus('offline')
        console.log(
          '⚠️ Using local storage - DatabaseStorageService not active'
        )
      }
    }

    checkSyncStatus()

    // Check sync status more frequently (every 10 seconds)
    const interval = setInterval(checkSyncStatus, 10000)

    return () => clearInterval(interval)
  }, [isAuthenticated, canSync])

  if (!canSync && !isAuthenticated) {
    return null
  }

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'bg-blue-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      case 'offline':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...'
      case 'error':
        return 'Sync Error'
      case 'offline':
        return 'Offline'
      default:
        return lastSyncTime
          ? `Synced ${lastSyncTime.toLocaleTimeString()}`
          : 'Synced'
    }
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <svg className='w-3 h-3 animate-spin' fill='none' viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        )
      case 'error':
        return (
          <svg
            className='w-3 h-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        )
      case 'offline':
        return (
          <svg
            className='w-3 h-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12'
            />
          </svg>
        )
      default:
        return (
          <svg
            className='w-3 h-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        )
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      {showDetails && (
        <div className='flex items-center gap-1'>
          {getStatusIcon()}
          <span className='text-xs text-text-secondary'>{getStatusText()}</span>
        </div>
      )}
    </div>
  )
}

export default SyncStatusIndicator
