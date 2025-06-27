import '@testing-library/jest-dom'
import { beforeAll, afterAll } from 'vitest'

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