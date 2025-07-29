import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
  title?: string
  subtitle?: string
}

type AuthTab = 'signin' | 'signup'

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = 'signin',
  title = 'Sync Your Reading Progress',
  subtitle = 'Create an account to sync your books across devices',
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signUp, signIn } = useAuth()

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
    setError(null)
    setLoading(false)
  }

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;

      if (activeTab === 'signup') {
        result = await signUp(email, password, name);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        throw new Error(result.error.error);
      }
      
      // Close modal and reset form on successful authentication
      onClose();
      resetForm();
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
        <div className='p-6'>
          {/* Header */}
          <div className='flex justify-between items-center mb-6'>
            <div>
              <h2 className='text-xl font-semibold text-gray-900'>{title}</h2>
              <p className='text-sm text-gray-600 mt-1'>{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 transition-colors'
              aria-label='Close'>
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className='flex border-b border-gray-200 mb-6'>
            <button
              onClick={() => handleTabChange('signin')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'signin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              Sign In
            </button>
            <button
              onClick={() => handleTabChange('signup')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'signup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              Sign Up
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-sm text-red-700'>{error}</p>
            </div>
          )}


          {/* Auth Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-700 mb-1'>
                Email
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='Enter your email'
              />
            </div>

            {activeTab === 'signup' && (
              <div>
                <label
                  htmlFor='name'
                  className='block text-sm font-medium text-gray-700 mb-1'>
                  Name
                </label>
                <input
                  id='name'
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='Enter your name'
                />
              </div>
            )}

            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-gray-700 mb-1'>
                Password
              </label>
              <input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='Enter your password'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'>
              {loading && (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {loading
                ? 'Processing...'
                : activeTab === 'signup'
                ? 'Create Account'
                : 'Sign In'}
            </button>
          </form>


          {/* Privacy Notice */}
          <div className='mt-6 p-4 bg-gray-50 rounded-md'>
            <h3 className='text-sm font-medium text-gray-900 mb-2'>
              Privacy & Data
            </h3>
            <ul className='text-xs text-gray-600 space-y-1'>
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
