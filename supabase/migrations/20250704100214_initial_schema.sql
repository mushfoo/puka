-- Initial schema for Puka Reading Tracker
-- Supports both local and cloud synchronization

-- Create custom types
CREATE TYPE book_status AS ENUM ('want_to_read', 'currently_reading', 'finished');

-- Books table
CREATE TABLE public.books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  
  -- Basic book information
  title text NOT NULL,
  author text NOT NULL,
  notes text,
  
  -- Progress tracking
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status book_status DEFAULT 'want_to_read',
  
  -- Optional metadata
  isbn text,
  cover_url text,
  tags text[] DEFAULT '{}',
  rating integer CHECK (rating >= 1 AND rating <= 5),
  total_pages integer CHECK (total_pages > 0),
  current_page integer CHECK (current_page >= 0),
  genre text,
  published_date text,
  
  -- Date tracking
  date_started date,
  date_finished date,
  
  -- System timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Legacy ID for migration from local storage
  legacy_id integer,
  
  -- Sync metadata
  last_synced timestamp with time zone DEFAULT timezone('utc'::text, now()),
  sync_version integer DEFAULT 1
);

-- Reading days table for streak tracking
CREATE TABLE public.reading_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  
  -- Reading session data
  book_ids uuid[] DEFAULT '{}',
  notes text,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'book', 'progress')),
  
  -- System timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure one reading day entry per user per date
  UNIQUE(user_id, date)
);

-- User settings table
CREATE TABLE public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  
  -- UI preferences
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  default_view text DEFAULT 'grid' CHECK (default_view IN ('grid', 'list')),
  
  -- Reading preferences
  daily_reading_goal integer DEFAULT 1,
  sort_by text DEFAULT 'dateAdded' CHECK (sort_by IN ('dateAdded', 'title', 'author', 'progress', 'dateFinished')),
  sort_order text DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  
  -- Notification preferences
  notifications_enabled boolean DEFAULT true,
  
  -- Backup preferences
  auto_backup boolean DEFAULT false,
  backup_frequency text DEFAULT 'weekly' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- System timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enhanced streak history table
CREATE TABLE public.streak_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  
  -- Streak data
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_read_date date,
  
  -- Enhanced tracking
  reading_days_data jsonb DEFAULT '{}',  -- Store reading days as JSON for compatibility
  book_periods_data jsonb DEFAULT '[]', -- Store book periods as JSON for compatibility
  
  -- Version and sync data
  data_version integer DEFAULT 1,
  last_calculated timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_synced timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- System timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_books_user_id ON public.books(user_id);
CREATE INDEX idx_books_status ON public.books(user_id, status);
CREATE INDEX idx_books_updated_at ON public.books(updated_at);
CREATE INDEX idx_books_legacy_id ON public.books(legacy_id) WHERE legacy_id IS NOT NULL;

CREATE INDEX idx_reading_days_user_id ON public.reading_days(user_id);
CREATE INDEX idx_reading_days_date ON public.reading_days(user_id, date);
CREATE INDEX idx_reading_days_updated_at ON public.reading_days(updated_at);

-- Row Level Security (RLS) policies
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;

-- Books policies
CREATE POLICY "Users can only access their own books" ON public.books
  FOR ALL USING (auth.uid() = user_id);

-- Reading days policies  
CREATE POLICY "Users can only access their own reading days" ON public.reading_days
  FOR ALL USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can only access their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Streak history policies
CREATE POLICY "Users can only access their own streak history" ON public.streak_history
  FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_days_updated_at BEFORE UPDATE ON public.reading_days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streak_history_updated_at BEFORE UPDATE ON public.streak_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default user settings on user creation
CREATE OR REPLACE FUNCTION create_user_settings_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.streak_history (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create user settings when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_settings_on_signup();

-- Grant permissions to authenticated users
GRANT ALL ON public.books TO authenticated;
GRANT ALL ON public.reading_days TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.streak_history TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;