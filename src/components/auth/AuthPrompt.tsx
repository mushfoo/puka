import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from './AuthModal'
import { MigrationModal } from '@/components/migration'
import { useMigrationStatus } from '@/hooks/useDataMigration'

interface AuthPromptProps {
  onDismiss?: () => void
}

export function AuthPrompt({ onDismiss }: AuthPromptProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const { showAuthPrompt, dismissAuthPrompt, hasLocalData, isAuthenticated } = useAuth()
  const { isAvailable: migrationAvailable } = useMigrationStatus()

  const handleDismiss = () => {
    dismissAuthPrompt()
    onDismiss?.()
  }

  const handleGetStarted = () => {
    setShowAuthModal(true)
  }

  const handleModalClose = () => {
    setShowAuthModal(false)
  }

  const handleMigrationModalClose = () => {
    setShowMigrationModal(false)
  }

  const handleMigrationComplete = (success: boolean) => {
    setShowMigrationModal(false)
    if (success) {
      dismissAuthPrompt()
    }
  }

  // Show migration modal when user becomes authenticated and has migration available
  useEffect(() => {
    if (isAuthenticated && migrationAvailable && !showMigrationModal && !showAuthModal) {
      setShowMigrationModal(true)
    }
  }, [isAuthenticated, migrationAvailable, showMigrationModal, showAuthModal])

  if (!showAuthPrompt || !hasLocalData) {
    return null
  }

  return (
    <>
      {/* Slide-in notification */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40 animate-slide-up">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Sync Your Books
                </h3>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-600 mb-4">
            You have books saved locally. Create an account to sync them across all your devices!
          </p>

          {/* Benefits */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Access your books on phone and desktop
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Automatic backup of your reading progress
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Private and secure - your data only
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleGetStarted}
              className="flex-1 bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Get Started
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Maybe Later
            </button>
          </div>

          {/* Fine print */}
          <p className="text-xs text-gray-400 mt-2 text-center">
            Free forever • No ads • Export anytime
          </p>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleModalClose}
        defaultTab="signup"
        title="Sync Your Reading Progress"
        subtitle="Your books will be safely synced across all devices"
      />

      {/* Migration Modal */}
      <MigrationModal
        isOpen={showMigrationModal}
        onClose={handleMigrationModalClose}
        onComplete={handleMigrationComplete}
      />

      {/* CSS for animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

export default AuthPrompt