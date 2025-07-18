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

// Storage service factory
export function createStorageService(): StorageService {
  // TODO: Implement database storage service with Better-auth
  // For now, use MockStorageService to avoid file system prompts
  return new MockStorageService();
}