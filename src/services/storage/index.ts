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

// Storage service factory with fallback capability
export async function createStorageService(): Promise<StorageService> {
  // Return cached instance if available
  if (storageServiceInstance) {
    return storageServiceInstance
  }

  try {
    // Perform health check
    const isHealthy = await checkDatabaseServiceHealth()

    if (!isHealthy) {
      throw new Error('Database service health check failed')
    }

    const dbService = new DatabaseStorageService()
    await dbService.initialize()
    storageServiceInstance = dbService
    console.log('✅ Using DatabaseStorageService')
    return dbService
  } catch (error) {
    console.error('❌ Failed to initialize DatabaseStorageService:', error)
    console.warn('🔄 Falling back to MockStorageService for offline functionality')
    
    try {
      const mockService = new MockStorageService()
      await mockService.initialize()
      storageServiceInstance = mockService
      console.log('📚 Using MockStorageService as fallback')
      return mockService
    } catch (fallbackError) {
      console.error('❌ Failed to initialize fallback storage service:', fallbackError)
      throw new Error('Unable to initialize any storage service. Please refresh the page and try again.')
    }
  }
}

// Force service re-initialization (useful for testing)
export function resetStorageService(): void {
  storageServiceInstance = null
}

// Get current storage service type
export function getCurrentStorageServiceType(): 'database' | 'mock' | null {
  if (!storageServiceInstance) return null
  return storageServiceInstance instanceof DatabaseStorageService ? 'database' : 'mock'
}
