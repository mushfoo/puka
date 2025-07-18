import { useState, useCallback } from 'react'
import { ToastMessage } from '@/types'
// import { MigrationState } from '@/contexts/AuthContext' // Currently unused

export interface MigrationToastOptions {
  duration?: number
  dismissible?: boolean
  showProgress?: boolean
  showRetry?: boolean
  onRetry?: () => void
  onViewDetails?: () => void
}

export interface MigrationToast extends ToastMessage {
  migrationId?: string
  phase?: string
  progress?: number
  errorDetails?: string[]
  retryCount?: number
}

export function useMigrationToasts() {
  const [toasts, setToasts] = useState<MigrationToast[]>([])

  const addToast = useCallback((toast: Omit<MigrationToast, 'id'>) => {
    const id = `migration-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: MigrationToast = {
      id,
      ...toast
    }
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<MigrationToast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const clearMigrationToasts = useCallback((migrationId?: string) => {
    if (migrationId) {
      setToasts(prev => prev.filter(toast => toast.migrationId !== migrationId))
    } else {
      setToasts(prev => prev.filter(toast => !toast.migrationId))
    }
  }, [])

  // Migration-specific toast helpers
  const showMigrationStarted = useCallback((migrationId: string, options?: MigrationToastOptions) => {
    return addToast({
      type: 'info',
      title: 'Migration Started',
      message: 'Your books are being synced to the cloud...',
      migrationId,
      duration: options?.duration || 5000,
      dismissible: options?.dismissible ?? true,
      action: options?.onViewDetails ? {
        label: 'View Progress',
        onClick: options.onViewDetails
      } : undefined
    })
  }, [addToast])

  const showMigrationProgress = useCallback((migrationId: string, phase: string, progress: number, message: string) => {
    const existingToast = toasts.find(t => t.migrationId === migrationId && t.type === 'info')
    
    if (existingToast) {
      updateToast(existingToast.id, {
        message,
        phase,
        progress,
        title: `Migration ${Math.round(progress)}% Complete`
      })
    } else {
      return addToast({
        type: 'info',
        title: `Migration ${Math.round(progress)}% Complete`,
        message,
        migrationId,
        phase,
        progress,
        duration: 0, // Don't auto-dismiss progress toasts
        dismissible: false
      })
    }
  }, [toasts, updateToast, addToast])

  const showMigrationSuccess = useCallback((
    migrationId: string, 
    booksCount: number, 
    streaksCount: number,
    options?: MigrationToastOptions
  ) => {
    // Remove any existing progress toasts
    clearMigrationToasts(migrationId)
    
    return addToast({
      type: 'success',
      title: 'Migration Complete!',
      message: `Successfully synced ${booksCount} books and ${streaksCount} reading days to the cloud.`,
      migrationId,
      duration: options?.duration || 8000,
      dismissible: options?.dismissible ?? true,
      action: options?.onViewDetails ? {
        label: 'View Details',
        onClick: options.onViewDetails
      } : undefined
    })
  }, [addToast, clearMigrationToasts])

  const showMigrationError = useCallback((
    migrationId: string, 
    error: string, 
    errorDetails?: string[],
    options?: MigrationToastOptions
  ) => {
    // Remove any existing progress toasts
    clearMigrationToasts(migrationId)
    
    return addToast({
      type: 'error',
      title: 'Migration Failed',
      message: error,
      migrationId,
      errorDetails,
      duration: options?.duration || 0, // Don't auto-dismiss error toasts
      dismissible: options?.dismissible ?? true,
      action: options?.showRetry && options?.onRetry ? {
        label: 'Retry',
        onClick: options.onRetry
      } : options?.onViewDetails ? {
        label: 'View Details',
        onClick: options.onViewDetails
      } : undefined
    })
  }, [addToast, clearMigrationToasts])

  const showMigrationWarning = useCallback((
    migrationId: string, 
    message: string, 
    details?: string,
    options?: MigrationToastOptions
  ) => {
    return addToast({
      type: 'warning',
      title: 'Migration Warning',
      message,
      migrationId,
      duration: options?.duration || 8000,
      dismissible: options?.dismissible ?? true,
      action: options?.onViewDetails ? {
        label: 'Details',
        onClick: options.onViewDetails
      } : undefined
    })
  }, [addToast])

  const showExportStarted = useCallback((options?: MigrationToastOptions) => {
    return addToast({
      type: 'info',
      title: 'Export Started',
      message: 'Creating backup of your local data...',
      duration: options?.duration || 3000,
      dismissible: options?.dismissible ?? true
    })
  }, [addToast])

  const showExportSuccess = useCallback((fileName: string, options?: MigrationToastOptions) => {
    return addToast({
      type: 'success',
      title: 'Export Complete',
      message: `Your data has been exported to ${fileName}`,
      duration: options?.duration || 6000,
      dismissible: options?.dismissible ?? true
    })
  }, [addToast])

  const showExportError = useCallback((error: string, options?: MigrationToastOptions) => {
    return addToast({
      type: 'error',
      title: 'Export Failed',
      message: error,
      duration: options?.duration || 8000,
      dismissible: options?.dismissible ?? true,
      action: options?.onRetry ? {
        label: 'Retry',
        onClick: options.onRetry
      } : undefined
    })
  }, [addToast])

  const showMigrationSkipped = useCallback((skipCount: number) => {
    return addToast({
      type: 'info',
      title: 'Migration Skipped',
      message: skipCount >= 3 
        ? "We won't ask again for a while. You can always start migration from settings."
        : "You can always sync your books later from the settings menu.",
      duration: 6000,
      dismissible: true
    })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts,
    clearMigrationToasts,
    
    // Migration-specific helpers
    showMigrationStarted,
    showMigrationProgress,
    showMigrationSuccess,
    showMigrationError,
    showMigrationWarning,
    showExportStarted,
    showExportSuccess,
    showExportError,
    showMigrationSkipped
  }
}

export default useMigrationToasts