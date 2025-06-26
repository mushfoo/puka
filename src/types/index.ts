export interface Book {
  id: number;
  title: string;
  author: string;
  status: 'want_to_read' | 'currently_reading' | 'finished';
  progress: number; // 0-100
  notes?: string;
  dateAdded: Date;
  dateModified?: Date;
  dateStarted?: Date;
  dateFinished?: Date;
  isbn?: string;
  coverUrl?: string;
  tags?: string[];
  rating?: number;
  totalPages?: number;
  currentPage?: number;
  genre?: string;
  publishedDate?: string;
}

export interface ReadingSession {
  id: number;
  bookId: number;
  startTime: Date;
  endTime: Date;
  pagesRead: number;
  notes?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
  dailyGoal: number;
  todayProgress: number;
}

export type StatusFilter = 'all' | 'want_to_read' | 'currently_reading' | 'finished';

export interface FilterOptions {
  status?: StatusFilter;
  search?: string;
  genre?: string;
  rating?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: (bookId: number) => void;
  condition?: (book: Book) => boolean;
}