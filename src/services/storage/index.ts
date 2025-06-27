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
import { FileSystemStorageService } from './FileSystemStorageService';

// Storage service factory
export function createStorageService(): StorageService {
  // Check if File System Access API is available - use it if supported
  if (FileSystemStorageService.isSupported()) {
    return new FileSystemStorageService();
  }
  
  // Fall back to mock service for browsers that don't support File System Access API
  // This provides a functioning app with localStorage fallback
  return new FileSystemStorageService();  // FileSystemStorageService handles localStorage fallback internally
}