import React from 'react'

// Mock AuthContext for tests
export const useAuth = () => ({
  user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
  isAuthenticated: true,
  loading: false,
  canSync: true,
  showMigrationPrompt: false,
  dismissMigrationPrompt: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
})

export const useOptionalAuth = () => ({
  user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
  isAuthenticated: true,
  loading: false,
  canSync: true,
  showMigrationPrompt: false,
  dismissMigrationPrompt: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid='auth-provider'>{children}</div>
)
