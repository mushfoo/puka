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

// Storage service factory
export function createStorageService(): StorageService {
  // For now, return the mock service
  // In the future, this will detect browser capabilities and return the appropriate service
  return new MockStorageService();
}