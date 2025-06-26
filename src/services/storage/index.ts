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
  // Check if File System Access API is available (will be false in test environment due to mocking)
  if (FileSystemStorageService.isSupported()) {
    return new FileSystemStorageService();
  }
  
  // Fall back to mock service for development/testing
  return new MockStorageService();
}