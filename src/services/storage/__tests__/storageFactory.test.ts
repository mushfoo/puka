import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createStorageService,
  resetStorageService,
  getCurrentStorageServiceType,
} from '../index'
import { DatabaseStorageService } from '../DatabaseStorageService'
import { MockStorageService } from '../MockStorageService'

// Mock fetch globally
global.fetch = vi.fn()

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  DEV: false,
  VITE_APP_ENV: 'production',
  VITE_USE_DATABASE_STORAGE: 'true',
}))

describe('Storage Service Factory', () => {
  beforeEach(() => {
    // Reset mocks and storage service
    vi.clearAllMocks()
    resetStorageService()

    // Reset environment variables
    ;(import.meta.env as any).DEV = false
    ;(import.meta.env as any).VITE_APP_ENV = 'production'
    ;(import.meta.env as any).VITE_USE_DATABASE_STORAGE = 'true'
  })

  describe('Health Check', () => {
    it('should perform health check before creating DatabaseStorageService', async () => {
      // Mock successful health check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize
      vi.spyOn(
        DatabaseStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(global.fetch).toHaveBeenCalledWith('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      expect(service).toBeInstanceOf(DatabaseStorageService)
    })

    it('should fallback to MockStorageService when health check fails', async () => {
      // Mock failed health check
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      // Mock MockStorageService.initialize
      vi.spyOn(
        MockStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(service).toBeInstanceOf(MockStorageService)
    })

    it('should fallback to MockStorageService when health check returns non-ok status', async () => {
      // Mock health check with error status
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      // Mock MockStorageService.initialize
      vi.spyOn(
        MockStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(service).toBeInstanceOf(MockStorageService)
    })
  })

  describe('Environment-based Selection', () => {
    it('should use MockStorageService in development when VITE_USE_DATABASE_STORAGE is false', async () => {
      (import.meta.env as any).DEV = true
      ;(import.meta.env as any).VITE_USE_DATABASE_STORAGE = 'false'

      // Mock MockStorageService.initialize
      vi.spyOn(
        MockStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(global.fetch).not.toHaveBeenCalled()
      expect(service).toBeInstanceOf(MockStorageService)
    })

    it('should attempt DatabaseStorageService in development when VITE_USE_DATABASE_STORAGE is not false', async () => {
      (import.meta.env as any).DEV = true
      ;(import.meta.env as any).VITE_USE_DATABASE_STORAGE = undefined

      // Mock successful health check
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize
      vi.spyOn(
        DatabaseStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(global.fetch).toHaveBeenCalled()
      expect(service).toBeInstanceOf(DatabaseStorageService)
    })

    it('should always attempt DatabaseStorageService in production', async () => {
      (import.meta.env as any).DEV = false
      ;(import.meta.env as any).VITE_APP_ENV = 'production'

      // Mock successful health check
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize
      vi.spyOn(
        DatabaseStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(global.fetch).toHaveBeenCalled()
      expect(service).toBeInstanceOf(DatabaseStorageService)
    })
  })

  describe('Service Initialization Failures', () => {
    it('should fallback to MockStorageService when DatabaseStorageService initialization fails', async () => {
      // Mock successful health check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize to fail
      vi.spyOn(
        DatabaseStorageService.prototype,
        'initialize'
      ).mockRejectedValueOnce(new Error('Auth required'))

      // Mock MockStorageService.initialize
      vi.spyOn(
        MockStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service = await createStorageService()

      expect(service).toBeInstanceOf(MockStorageService)
    })
  })

  describe('Service Caching', () => {
    it('should return cached instance on subsequent calls', async () => {
      // Mock successful health check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize
      vi.spyOn(
        DatabaseStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      const service1 = await createStorageService()
      const service2 = await createStorageService()

      expect(service1).toBe(service2)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only called once
    })

    it('should create new instance after reset', async () => {
      // First call - mock successful health check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize
      const initSpy = vi
        .spyOn(DatabaseStorageService.prototype, 'initialize')
        .mockResolvedValue()

      const service1 = await createStorageService()

      // Reset the service
      resetStorageService()

      // Second call - mock successful health check again
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const service2 = await createStorageService()

      expect(service1).not.toBe(service2)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(initSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('Service Type Detection', () => {
    it('should return correct service type for DatabaseStorageService', async () => {
      // Mock successful health check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock DatabaseStorageService.initialize
      vi.spyOn(
        DatabaseStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      await createStorageService()

      expect(getCurrentStorageServiceType()).toBe('database')
    })

    it('should return correct service type for MockStorageService', async () => {
      // Mock failed health check
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      // Mock MockStorageService.initialize
      vi.spyOn(
        MockStorageService.prototype,
        'initialize'
      ).mockResolvedValueOnce()

      await createStorageService()

      expect(getCurrentStorageServiceType()).toBe('mock')
    })

    it('should return null when no service is initialized', () => {
      // Reset the storage service instance
      resetStorageService()
      expect(getCurrentStorageServiceType()).toBe(null)
    })
  })
})
