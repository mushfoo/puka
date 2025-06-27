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
export { FileSystemStorageService } from './FileSystemStorageService';

// Import types for the factory function
import { type StorageService } from './StorageService';
import { MockStorageService } from './MockStorageService';
import { FileSystemStorageService } from './FileSystemStorageService';

// Storage service factory
export function createStorageService(): StorageService {
  // In development, use MockStorageService for easier testing
  // In production, user would need to explicitly choose FileSystemStorageService
  if (import.meta.env.DEV) {
    return new MockStorageService();
  }
  
  // Check if File System Access API is available
  if (FileSystemStorageService.isSupported()) {
    return new FileSystemStorageService();
  }
  
  // Fall back to mock service for production if File System Access API is not available
  return new MockStorageService();
}