import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node', // Use Node environment for server integration tests
    include: ['src/__tests__/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    testTimeout: 30000, // Longer timeout for integration tests
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
})
