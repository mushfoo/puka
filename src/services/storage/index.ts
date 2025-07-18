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
export { DatabaseStorageService } from './DatabaseStorageService';

// Import types for the factory function
import { type StorageService } from './StorageService';
import { DatabaseStorageService } from './DatabaseStorageService';

// Storage service factory
export function createStorageService(): StorageService {
  // Use DatabaseStorageService for testing Phase 2 implementation
  return new DatabaseStorageService();
}