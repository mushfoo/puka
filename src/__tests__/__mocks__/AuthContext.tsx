import React from 'react'
import { vi } from 'vitest'

// Mock AuthContext for tests
export const useAuth = () => ({
  user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
  isAuthenticated: true,
  loading: false,
  canSync: true,
  showMigrationPrompt: false,
  dismissMigrationPrompt: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
})

export const useOptionalAuth = () => ({
  user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
  isAuthenticated: true,
  loading: false,
  canSync: true,
  showMigrationPrompt: false,
  dismissMigrationPrompt: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid='auth-provider'>{children}</div>
)
