#!/usr/bin/env ts-node

/**
 * Migration script to move data from Supabase to Railway Postgres + Prisma
 * 
 * Usage:
 * 1. Set environment variables for both Supabase and Railway
 * 2. Run: npx ts-node scripts/migrate-supabase-to-railway.ts
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { Database } from '../src/lib/supabase'

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.')
  process.exit(1)
}

if (!DATABASE_URL) {
  console.error('Missing Railway database configuration. Set DATABASE_URL environment variable.')
  process.exit(1)
}

// Initialize clients
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
const prisma = new PrismaClient()

interface MigrationStats {
  users: number
  books: number
  readingDays: number
  userSettings: number
  streakHistory: number
  errors: string[]
}

async function main() {
  console.log('🚀 Starting Supabase to Railway migration...')
  
  const stats: MigrationStats = {
    users: 0,
    books: 0,
    readingDays: 0,
    userSettings: 0,
    streakHistory: 0,
    errors: []
  }

  try {
    // Step 1: Migrate users from Supabase auth to users table
    console.log('📝 Step 1: Migrating users...')
    await migrateUsers(stats)

    // Step 2: Migrate books
    console.log('📚 Step 2: Migrating books...')
    await migrateBooks(stats)

    // Step 3: Migrate reading days
    console.log('📅 Step 3: Migrating reading days...')
    await migrateReadingDays(stats)

    // Step 4: Migrate user settings
    console.log('⚙️ Step 4: Migrating user settings...')
    await migrateUserSettings(stats)

    // Step 5: Migrate streak history
    console.log('🔥 Step 5: Migrating streak history...')
    await migrateStreakHistory(stats)

    // Print summary
    console.log('\n✅ Migration completed!')
    console.log('📊 Summary:')
    console.log(`   Users: ${stats.users}`)
    console.log(`   Books: ${stats.books}`)
    console.log(`   Reading Days: ${stats.readingDays}`)
    console.log(`   User Settings: ${stats.userSettings}`)
    console.log(`   Streak History: ${stats.streakHistory}`)
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${stats.errors.length}`)
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function migrateUsers(stats: MigrationStats) {
  try {
    // Get users from Supabase auth (this requires admin access)
    // For now, we'll get users from the data tables and create corresponding users
    const { data: books, error } = await supabase
      .from('books')
      .select('user_id')
      
    if (error) throw error

    const uniqueUserIds = [...new Set(books?.map(book => book.user_id) || [])]
    
    for (const userId of uniqueUserIds) {
      try {
        // Create user in Prisma (will need to be updated with real email/name data)
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: `user-${userId}@migrated.local`, // Placeholder email
            name: `Migrated User ${userId.slice(0, 8)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        stats.users++
      } catch (error) {
        stats.errors.push(`Failed to migrate user ${userId}: ${error}`)
      }
    }
  } catch (error) {
    stats.errors.push(`Failed to migrate users: ${error}`)
  }
}

async function migrateBooks(stats: MigrationStats) {
  try {
    let offset = 0
    const batchSize = 100
    
    while (true) {
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .range(offset, offset + batchSize - 1)
        
      if (error) throw error
      if (!books || books.length === 0) break

      for (const book of books) {
        try {
          await prisma.book.create({
            data: {
              id: book.id,
              userId: book.user_id,
              legacyId: book.legacy_id,
              title: book.title,
              author: book.author,
              notes: book.notes,
              progress: book.progress,
              status: mapBookStatus(book.status),
              isbn: book.isbn,
              coverUrl: book.cover_url,
              tags: book.tags || [],
              rating: book.rating,
              totalPages: book.total_pages,
              currentPage: book.current_page,
              genre: book.genre,
              publishedDate: book.published_date,
              dateStarted: book.date_started ? new Date(book.date_started) : null,
              dateFinished: book.date_finished ? new Date(book.date_finished) : null,
              createdAt: new Date(book.created_at),
              updatedAt: new Date(book.updated_at),
              lastSynced: book.last_synced ? new Date(book.last_synced) : new Date(),
              syncVersion: book.sync_version || 1
            }
          })
          stats.books++
        } catch (error) {
          stats.errors.push(`Failed to migrate book ${book.id}: ${error}`)
        }
      }
      
      offset += batchSize
      console.log(`   Migrated ${stats.books} books...`)
    }
  } catch (error) {
    stats.errors.push(`Failed to migrate books: ${error}`)
  }
}

async function migrateReadingDays(stats: MigrationStats) {
  try {
    let offset = 0
    const batchSize = 100
    
    while (true) {
      const { data: readingDays, error } = await supabase
        .from('reading_days')
        .select('*')
        .range(offset, offset + batchSize - 1)
        
      if (error) throw error
      if (!readingDays || readingDays.length === 0) break

      for (const readingDay of readingDays) {
        try {
          await prisma.readingDay.create({
            data: {
              id: readingDay.id,
              userId: readingDay.user_id,
              date: new Date(readingDay.date),
              bookIds: readingDay.book_ids || [],
              notes: readingDay.notes,
              source: mapReadingSource(readingDay.source),
              createdAt: new Date(readingDay.created_at),
              updatedAt: new Date(readingDay.updated_at)
            }
          })
          stats.readingDays++
        } catch (error) {
          stats.errors.push(`Failed to migrate reading day ${readingDay.id}: ${error}`)
        }
      }
      
      offset += batchSize
      console.log(`   Migrated ${stats.readingDays} reading days...`)
    }
  } catch (error) {
    stats.errors.push(`Failed to migrate reading days: ${error}`)
  }
}

async function migrateUserSettings(stats: MigrationStats) {
  try {
    let offset = 0
    const batchSize = 100
    
    while (true) {
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('*')
        .range(offset, offset + batchSize - 1)
        
      if (error) throw error
      if (!userSettings || userSettings.length === 0) break

      for (const settings of userSettings) {
        try {
          await prisma.userSettings.create({
            data: {
              id: settings.id,
              userId: settings.user_id,
              theme: mapTheme(settings.theme),
              defaultView: mapViewMode(settings.default_view),
              dailyReadingGoal: settings.daily_reading_goal,
              sortBy: mapSortBy(settings.sort_by),
              sortOrder: mapSortOrder(settings.sort_order),
              notificationsEnabled: settings.notifications_enabled,
              autoBackup: settings.auto_backup,
              backupFrequency: mapBackupFrequency(settings.backup_frequency),
              createdAt: new Date(settings.created_at),
              updatedAt: new Date(settings.updated_at)
            }
          })
          stats.userSettings++
        } catch (error) {
          stats.errors.push(`Failed to migrate user settings ${settings.id}: ${error}`)
        }
      }
      
      offset += batchSize
      console.log(`   Migrated ${stats.userSettings} user settings...`)
    }
  } catch (error) {
    stats.errors.push(`Failed to migrate user settings: ${error}`)
  }
}

async function migrateStreakHistory(stats: MigrationStats) {
  try {
    let offset = 0
    const batchSize = 100
    
    while (true) {
      const { data: streakHistory, error } = await supabase
        .from('streak_history')
        .select('*')
        .range(offset, offset + batchSize - 1)
        
      if (error) throw error
      if (!streakHistory || streakHistory.length === 0) break

      for (const streak of streakHistory) {
        try {
          await prisma.streakHistory.create({
            data: {
              id: streak.id,
              userId: streak.user_id,
              currentStreak: streak.current_streak,
              longestStreak: streak.longest_streak,
              lastReadDate: streak.last_read_date ? new Date(streak.last_read_date) : null,
              readingDaysData: streak.reading_days_data || {},
              bookPeriodsData: streak.book_periods_data || [],
              dataVersion: streak.data_version,
              lastCalculated: new Date(streak.last_calculated),
              lastSynced: new Date(streak.last_synced),
              createdAt: new Date(streak.created_at),
              updatedAt: new Date(streak.updated_at)
            }
          })
          stats.streakHistory++
        } catch (error) {
          stats.errors.push(`Failed to migrate streak history ${streak.id}: ${error}`)
        }
      }
      
      offset += batchSize
      console.log(`   Migrated ${stats.streakHistory} streak history records...`)
    }
  } catch (error) {
    stats.errors.push(`Failed to migrate streak history: ${error}`)
  }
}

// Mapping functions to convert Supabase enum values to Prisma enum values
function mapBookStatus(status: string): 'WANT_TO_READ' | 'CURRENTLY_READING' | 'FINISHED' {
  switch (status) {
    case 'want_to_read': return 'WANT_TO_READ'
    case 'currently_reading': return 'CURRENTLY_READING'
    case 'finished': return 'FINISHED'
    default: return 'WANT_TO_READ'
  }
}

function mapReadingSource(source: string): 'MANUAL' | 'BOOK' | 'PROGRESS' {
  switch (source) {
    case 'manual': return 'MANUAL'
    case 'book': return 'BOOK'
    case 'progress': return 'PROGRESS'
    default: return 'MANUAL'
  }
}

function mapTheme(theme: string): 'LIGHT' | 'DARK' | 'SYSTEM' {
  switch (theme) {
    case 'light': return 'LIGHT'
    case 'dark': return 'DARK'
    case 'system': return 'SYSTEM'
    default: return 'SYSTEM'
  }
}

function mapViewMode(viewMode: string): 'GRID' | 'LIST' {
  switch (viewMode) {
    case 'grid': return 'GRID'
    case 'list': return 'LIST'
    default: return 'GRID'
  }
}

function mapSortBy(sortBy: string): 'DATE_ADDED' | 'TITLE' | 'AUTHOR' | 'PROGRESS' | 'DATE_FINISHED' {
  switch (sortBy) {
    case 'dateAdded': return 'DATE_ADDED'
    case 'title': return 'TITLE'
    case 'author': return 'AUTHOR'
    case 'progress': return 'PROGRESS'
    case 'dateFinished': return 'DATE_FINISHED'
    default: return 'DATE_ADDED'
  }
}

function mapSortOrder(sortOrder: string): 'ASC' | 'DESC' {
  switch (sortOrder) {
    case 'asc': return 'ASC'
    case 'desc': return 'DESC'
    default: return 'DESC'
  }
}

function mapBackupFrequency(frequency: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' {
  switch (frequency) {
    case 'daily': return 'DAILY'
    case 'weekly': return 'WEEKLY'
    case 'monthly': return 'MONTHLY'
    default: return 'WEEKLY'
  }
}

// Run the migration
if (require.main === module) {
  main().catch(console.error)
}