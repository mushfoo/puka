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
  StorageErrorCode
} from './StorageService';

export { MockStorageService } from './MockStorageService';
export { DatabaseStorageService } from './DatabaseStorageService';

// Import types for the factory function
import { type StorageService } from './StorageService';
import { DatabaseStorageService } from './DatabaseStorageService';
import { MockStorageService } from './MockStorageService';
import { getAppBaseUrl } from '@/lib/api/utils';

// Storage service instance cache
let storageServiceInstance: StorageService | null = null;

// Storage service health check
async function checkDatabaseServiceHealth(): Promise<boolean> {
  try {
    const baseUrl = getAppBaseUrl();
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Database service health check failed:', error);
    return false;
  }
}

// Storage service factory with environment-based selection and fallback
export async function createStorageService(): Promise<StorageService> {
  // Return cached instance if available
  if (storageServiceInstance) {
    return storageServiceInstance;
  }

  // Check environment
  const isDevelopment = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
  const useDatabase = import.meta.env.VITE_USE_DATABASE_STORAGE !== 'false';

  // In production or when database storage is enabled, try DatabaseStorageService first
  if (!isDevelopment || useDatabase) {
    try {
      // Perform health check
      const isHealthy = await checkDatabaseServiceHealth();
      
      if (isHealthy) {
        const dbService = new DatabaseStorageService();
        await dbService.initialize();
        storageServiceInstance = dbService;
        console.log('Using DatabaseStorageService');
        return dbService;
      } else {
        console.warn('Database service health check failed, falling back to MockStorageService');
      }
    } catch (error) {
      console.error('Failed to initialize DatabaseStorageService:', error);
      console.warn('Falling back to MockStorageService');
    }
  }

  // Fallback to MockStorageService
  const mockService = new MockStorageService();
  await mockService.initialize();
  storageServiceInstance = mockService;
  console.log('Using MockStorageService');
  return mockService;
}

// Force service re-initialization (useful for testing)
export function resetStorageService(): void {
  storageServiceInstance = null;
}

// Get current storage service type
export function getCurrentStorageServiceType(): 'database' | 'mock' | null {
  if (!storageServiceInstance) return null;
  return storageServiceInstance instanceof DatabaseStorageService ? 'database' : 'mock';
}