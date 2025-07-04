import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          user_id: string
          title: string
          author: string
          notes?: string
          progress: number
          status: 'want_to_read' | 'currently_reading' | 'finished'
          isbn?: string
          cover_url?: string
          tags?: string[]
          rating?: number
          total_pages?: number
          current_page?: number
          genre?: string
          published_date?: string
          date_started?: string
          date_finished?: string
          created_at: string
          updated_at: string
          legacy_id?: number
          last_synced?: string
          sync_version: number
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          author: string
          notes?: string
          progress?: number
          status?: 'want_to_read' | 'currently_reading' | 'finished'
          isbn?: string
          cover_url?: string
          tags?: string[]
          rating?: number
          total_pages?: number
          current_page?: number
          genre?: string
          published_date?: string
          date_started?: string
          date_finished?: string
          legacy_id?: number
          sync_version?: number
        }
        Update: {
          title?: string
          author?: string
          notes?: string
          progress?: number
          status?: 'want_to_read' | 'currently_reading' | 'finished'
          isbn?: string
          cover_url?: string
          tags?: string[]
          rating?: number
          total_pages?: number
          current_page?: number
          genre?: string
          published_date?: string
          date_started?: string
          date_finished?: string
          updated_at?: string
          last_synced?: string
          sync_version?: number
        }
      }
      reading_days: {
        Row: {
          id: string
          user_id: string
          date: string
          book_ids?: string[]
          notes?: string
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          book_ids?: string[]
          notes?: string
          source?: string
        }
        Update: {
          book_ids?: string[]
          notes?: string
          source?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme: string
          default_view: string
          daily_reading_goal: number
          sort_by: string
          sort_order: string
          notifications_enabled: boolean
          auto_backup: boolean
          backup_frequency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: string
          default_view?: string
          daily_reading_goal?: number
          sort_by?: string
          sort_order?: string
          notifications_enabled?: boolean
          auto_backup?: boolean
          backup_frequency?: string
        }
        Update: {
          theme?: string
          default_view?: string
          daily_reading_goal?: number
          sort_by?: string
          sort_order?: string
          notifications_enabled?: boolean
          auto_backup?: boolean
          backup_frequency?: string
          updated_at?: string
        }
      }
      streak_history: {
        Row: {
          id: string
          user_id: string
          current_streak: number
          longest_streak: number
          last_read_date?: string
          reading_days_data: any
          book_periods_data: any
          data_version: number
          last_calculated: string
          last_synced: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_read_date?: string
          reading_days_data?: any
          book_periods_data?: any
          data_version?: number
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          last_read_date?: string
          reading_days_data?: any
          book_periods_data?: any
          data_version?: number
          last_calculated?: string
          last_synced?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      book_status: 'want_to_read' | 'currently_reading' | 'finished'
    }
  }
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Auth helpers
export const auth = supabase.auth

// Type exports for convenience
export type Book = Database['public']['Tables']['books']['Row']
export type BookInsert = Database['public']['Tables']['books']['Insert']
export type BookUpdate = Database['public']['Tables']['books']['Update']

export type ReadingDay = Database['public']['Tables']['reading_days']['Row']
export type ReadingDayInsert = Database['public']['Tables']['reading_days']['Insert']
export type ReadingDayUpdate = Database['public']['Tables']['reading_days']['Update']

export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert']
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update']

export type StreakHistory = Database['public']['Tables']['streak_history']['Row']
export type StreakHistoryInsert = Database['public']['Tables']['streak_history']['Insert']
export type StreakHistoryUpdate = Database['public']['Tables']['streak_history']['Update']

// Auth state type
export type AuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  user: AuthUser
}

// Environment detection
export const isLocalDevelopment = () => {
  return supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')
}

// Check if Supabase is configured for production
export const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && 
         import.meta.env.VITE_SUPABASE_ANON_KEY &&
         !isLocalDevelopment()
}