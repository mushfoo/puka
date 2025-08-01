export {
  type StorageService,
  type ExportData,
  type ImportData,
  type UserSettings,
  type ImportOptions,
  type ImportResult,
  type ImportError,
  type BookFilter,
  type StorageAdapter,
  StorageError,
  StorageErrorCode,
} from './StorageService'

export { MockStorageService } from './MockStorageService'
export { DatabaseStorageService } from './DatabaseStorageService'

// Import types for the factory function
import { type StorageService } from './StorageService'
import { DatabaseStorageService } from './DatabaseStorageService'
import { MockStorageService } from './MockStorageService'
import { getAppBaseUrl } from '@/lib/api/utils'

// Storage service instance cache
let storageServiceInstance: StorageService | null = null

// Storage service health check
async function checkDatabaseServiceHealth(): Promise<boolean> {
  try {
    const baseUrl = getAppBaseUrl()

    // Create AbortController for timeout (better browser support than AbortSignal.timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Health check failed with status: ${response.status}`)
      return false
    }

    const healthData = await response.json()
    console.log('🏥 Health check response:', healthData)

    // Validate that we got a proper health response
    return healthData.status === 'ok'
  } catch (error) {
    console.error('Database service health check failed:', error)
    return false
  }
}

// Storage service factory with environment-based selection and fallback
export async function createStorageService(): Promise<StorageService> {
  // Return cached instance if available
  if (storageServiceInstance) {
    return storageServiceInstance
  }

  // Check environment configuration
  const { getClientConfig } = await import('../../lib/config/environment.js')
  const config = getClientConfig()
  const useDatabase = config.useDatabaseStorage

  // Always try DatabaseStorageService first when enabled (default behavior)
  if (useDatabase) {
    try {
      // Perform health check
      const isHealthy = await checkDatabaseServiceHealth()

      if (isHealthy) {
        const dbService = new DatabaseStorageService()
        await dbService.initialize()
        storageServiceInstance = dbService
        console.log('✅ Using DatabaseStorageService - Cloud sync enabled')
        return dbService
      } else {
        console.warn(
          '⚠️ Database service health check failed, falling back to MockStorageService'
        )
      }
    } catch (error) {
      console.error('❌ Failed to initialize DatabaseStorageService:', error)
      console.warn('⚠️ Falling back to MockStorageService')
    }
  } else {
    console.log(
      '📱 Database storage disabled via VITE_USE_DATABASE_STORAGE=false'
    )
  }

  // Fallback to MockStorageService
  const mockService = new MockStorageService()
  await mockService.initialize()
  storageServiceInstance = mockService
  console.log('📝 Using MockStorageService - Local storage only')
  return mockService
}

// Force service re-initialization (useful for testing)
export function resetStorageService(): void {
  storageServiceInstance = null
}

// Get current storage service type
export function getCurrentStorageServiceType(): 'database' | 'mock' | null {
  if (!storageServiceInstance) return null
  return storageServiceInstance instanceof DatabaseStorageService
    ? 'database'
    : 'mock'
}
