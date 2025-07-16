export { default as MigrationModal } from './MigrationModal'

// Migration service has been removed - these types are now defined in the hooks
export type { 
  MigrationProgress, 
  MigrationResult, 
  MigrationOptions 
} from '@/hooks/useDataMigration'