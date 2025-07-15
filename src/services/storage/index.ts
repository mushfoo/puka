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
export { SupabaseStorageService } from './SupabaseStorageService';
export { SimplePrismaStorageService } from './SimplePrismaStorageService';
export { HybridStorageService } from './HybridStorageService';

// Import types for the factory function
import { type StorageService } from './StorageService';
import { HybridStorageService } from './HybridStorageService';

// Storage service factory
export function createStorageService(): StorageService {
  // For now, keep using the existing hybrid service
  // This can be updated to use Prisma once Railway is set up
  return new HybridStorageService();
}