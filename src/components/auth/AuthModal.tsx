import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
  title?: string
  subtitle?: string
}

type AuthTab = 'signin' | 'signup' | 'reset'

export function AuthModal({ 
  isOpen, 
  onClose, 
  defaultTab = 'signin',
  title = 'Sync Your Reading Progress',
  subtitle = 'Create an account to sync your books across devices'
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { signUp, signIn, signInWithMagicLink, resetPassword } = useAuth()

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError(null)
    setMessage(null)
    setLoading(false)
  }

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (activeTab === 'signup') {
        const { user, error } = await signUp(email, password)
        if (error) {
          setError(error.message)
        } else if (user) {
          setMessage('Check your email for a confirmation link!')
          setTimeout(() => onClose(), 2000)
        }
      } else if (activeTab === 'signin') {
        const { user, error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else if (user) {
          onClose()
        }
      } else if (activeTab === 'reset') {
        const { error } = await resetPassword(email)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Check your email for password reset instructions!')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const { error } = await signInWithMagicLink(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a magic link!')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
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

          {/* Tab Navigation */}
          {activeTab !== 'reset' && (
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => handleTabChange('signin')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'signin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleTabChange('signup')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'signup'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {activeTab !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : (
                activeTab === 'signup' ? 'Create Account' :
                activeTab === 'signin' ? 'Sign In' :
                'Reset Password'
              )}
            </button>
          </form>

          {/* Alternative Actions */}
          {activeTab !== 'reset' && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="w-full mt-4 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Magic Link
              </button>

              <div className="mt-4 text-center">
                {activeTab === 'signin' ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('reset')}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Forgot your password?
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    By creating an account, you agree to sync your reading data securely.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Privacy & Data</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Your reading data is stored securely and privately</li>
              <li>• You can export your data at any time</li>
              <li>• Delete your account and all data whenever you want</li>
              <li>• No ads, no tracking, no data selling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal