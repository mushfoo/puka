import '@testing-library/jest-dom'
import { beforeAll, afterAll, vi } from 'vitest'

// Mock timers for faster tests
vi.useFakeTimers()

// Mock the auth context to always return an authenticated user for tests
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: 'test-session-id',
        userId: 'test-user-id',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        token: 'test-token',
      },
    },
    loading: false,
    signUp: vi.fn().mockResolvedValue({ user: null, error: null }),
    signIn: vi.fn().mockResolvedValue({ user: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    isAuthenticated: true,
    canSync: true,
    showAuthPrompt: false,
    dismissAuthPrompt: vi.fn(),
    hasLocalData: false,
    setHasLocalData: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  withAuth: (Component: React.ComponentType) => Component,
  useOptionalAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isAuthenticated: true,
    shouldPromptAuth: false,
    syncAvailable: true,
  }),
}));

// Suppress console.error during tests to reduce noise from expected error scenarios
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Only suppress certain expected error patterns during tests
    const message = args[0];
    if (
      typeof message === 'string' && (
        message.includes('Failed to initialize storage:') ||
        message.includes('Failed to add book:') ||
        message.includes('Failed to update book:') ||
        message.includes('Failed to delete book:') ||
        message.includes('Search failed:') ||
        message.includes('Warning: `NaN` is an invalid value')
      )
    ) {
      return; // Suppress expected test errors
    }
    originalError(...args); // Allow other errors through
  };
});

afterAll(() => {
  console.error = originalError;
});