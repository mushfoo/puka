import { describe, it, expect, vi } from 'vitest'
import { HybridStorageService } from '@/services/storage/HybridStorageService'
import { DataMigrationService } from '@/services/migration/DataMigrationService'
import { FileSystemStorageService } from '@/services/storage/FileSystemStorageService'
import { SupabaseStorageService } from '@/services/storage/SupabaseStorageService'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
    }
  }
}))

describe('Cloud Sync Integration Tests', () => {
  describe('HybridStorageService', () => {
    it('should be instantiable without errors', () => {
      expect(() => new HybridStorageService()).not.toThrow()
    })

    it('should have required methods', () => {
      const service = new HybridStorageService()
      expect(service.initialize).toBeDefined()
      expect(service.getBooks).toBeDefined()
      expect(service.saveBook).toBeDefined()
    })
  })

  describe('DataMigrationService', () => {
    it('should be instantiable with storage services', () => {
      const localService = new FileSystemStorageService()
      const cloudService = new SupabaseStorageService()
      
      expect(() => new DataMigrationService(localService, cloudService)).not.toThrow()
    })

    it('should have required migration methods', () => {
      const localService = new FileSystemStorageService()
      const cloudService = new SupabaseStorageService()
      const migrationService = new DataMigrationService(localService, cloudService)
      
      expect(migrationService.migrateToCloud).toBeDefined()
      expect(migrationService.verifyMigration).toBeDefined()
      expect(migrationService.createBackup).toBeDefined()
      expect(migrationService.estimateMigration).toBeDefined()
    })
  })

  describe('SupabaseStorageService', () => {
    it('should be instantiable without errors', () => {
      expect(() => new SupabaseStorageService()).not.toThrow()
    })

    it('should have required storage methods', () => {
      const service = new SupabaseStorageService()
      expect(service.initialize).toBeDefined()
      expect(service.getBooks).toBeDefined()
      expect(service.saveBook).toBeDefined()
      expect(service.updateBook).toBeDefined()
      expect(service.deleteBook).toBeDefined()
    })
  })

  describe('Integration Requirements', () => {
    it('should export all required types', () => {
      // This test ensures all types are properly exported
      expect(typeof HybridStorageService).toBe('function')
      expect(typeof DataMigrationService).toBe('function')
      expect(typeof SupabaseStorageService).toBe('function')
    })
  })
})