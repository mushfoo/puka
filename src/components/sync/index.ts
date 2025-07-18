export { default as SyncStatusIndicator } from './SyncStatusIndicator'

// Sync service has been removed - these types are simplified for local use only
export type SyncConflict = never
export type SyncEvent = never
export type ConflictResolutionStrategy = 'local' | 'remote' | 'manual'