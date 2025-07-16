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
export { HybridStorageService } from './HybridStorageService';

// Import types for the factory function
import { type StorageService } from './StorageService';
import { HybridStorageService } from './HybridStorageService';

// Storage service factory
export function createStorageService(): StorageService {
  // Use hybrid storage service which now only uses local file system storage
  return new HybridStorageService();
}