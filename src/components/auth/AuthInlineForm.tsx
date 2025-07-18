import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

type AuthTab = 'signin' | 'signup'

export function AuthInlineForm() {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin')
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

      if (result.user) {
        // Auth success - component will unmount as user becomes authenticated
        resetForm();
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-surface rounded-lg shadow-xl p-6 border border-border'>
      {/* Tab Navigation */}
      <div className='flex border-b border-border mb-6'>
        <button
          onClick={() => handleTabChange('signin')}
          className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'signin'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}>
          Sign In
        </button>
        <button
          onClick={() => handleTabChange('signup')}
          className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'signup'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}>
          Sign Up
        </button>
      </div>

      {/* Error Messages */}
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
            className='block text-sm font-medium text-text-primary mb-1'>
            Email
          </label>
          <input
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className='w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary'
            placeholder='Enter your email'
          />
        </div>

        {activeTab === 'signup' && (
          <div>
            <label
              htmlFor='name'
              className='block text-sm font-medium text-text-primary mb-1'>
              Name
            </label>
            <input
              id='name'
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className='w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary'
              placeholder='Enter your name'
            />
          </div>
        )}

        <div>
          <label
            htmlFor='password'
            className='block text-sm font-medium text-text-primary mb-1'>
            Password
          </label>
          <input
            id='password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className='w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary'
            placeholder='Enter your password'
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-2 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'>
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

    </div>
  )
}

export default AuthInlineForm