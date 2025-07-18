import React, { useEffect, useState } from 'react'
import { MigrationToast } from '@/hooks/useMigrationToasts'

interface MigrationToastProps {
  toast: MigrationToast
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

const MigrationToastComponent: React.FC<MigrationToastProps> = ({
  toast,
  onDismiss,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50)
    
    let dismissTimer: NodeJS.Timeout | undefined
    if (toast.duration && toast.duration > 0) {
      dismissTimer = setTimeout(() => {
        handleDismiss()
      }, toast.duration)
    }

    return () => {
      clearTimeout(showTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [toast.duration])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300)
  }

  const getToastStyles = () => {
    const baseStyles = "fixed z-50 min-w-80 max-w-md p-4 rounded-lg shadow-lg border transform transition-all duration-300 ease-in-out"
    
    const positionStyles = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4', 
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    }

    const typeStyles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800', 
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    }

    const animationClass = isLeaving 
      ? 'opacity-0 scale-95 translate-y-2' 
      : isVisible 
        ? 'opacity-100 scale-100 translate-y-0' 
        : 'opacity-0 scale-95 -translate-y-2'

    return `${baseStyles} ${positionStyles[position]} ${typeStyles[toast.type]} ${animationClass}`
  }

  const getIcon = () => {
    const iconClass = "w-5 h-5 flex-shrink-0"
    
    switch (toast.type) {
      case 'success':
        return (
          <svg className={`${iconClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className={`${iconClass} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        if (toast.phase && typeof toast.progress === 'number') {
          // Show spinning icon for in-progress migrations
          return (
            <svg className={`${iconClass} text-blue-600 animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        }
        return (
          <svg className={`${iconClass} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div 
      className={getToastStyles()}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-medium text-sm mb-1">
              {toast.title}
            </div>
          )}
          <div className="text-sm">
            {toast.message}
          </div>
          
          {/* Progress bar for migration progress */}
          {typeof toast.progress === 'number' && toast.progress >= 0 && toast.progress <= 100 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{toast.phase || 'Processing'}</span>
                <span>{Math.round(toast.progress)}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-1.5">
                <div 
                  className="bg-current h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${toast.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Error details */}
          {toast.errorDetails && toast.errorDetails.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs underline hover:no-underline"
              >
                {showDetails ? 'Hide' : 'Show'} details
              </button>
              {showDetails && (
                <div className="mt-1 text-xs opacity-90 space-y-1">
                  {toast.errorDetails.slice(0, 3).map((detail, index) => (
                    <div key={index} className="truncate">• {detail}</div>
                  ))}
                  {toast.errorDetails.length > 3 && (
                    <div>• ... and {toast.errorDetails.length - 3} more errors</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {toast.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Action button if provided */}
      {toast.action && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <button
            onClick={() => {
              toast.action!.onClick()
              if (toast.type !== 'error') {
                handleDismiss()
              }
            }}
            className="text-sm font-medium hover:underline focus:outline-none focus:underline"
          >
            {toast.action.label}
          </button>
        </div>
      )}
      
      {/* Retry indicator */}
      {toast.retryCount && toast.retryCount > 0 && (
        <div className="mt-2 text-xs opacity-75">
          Attempt {toast.retryCount + 1}
        </div>
      )}
    </div>
  )
}

export default MigrationToastComponent