export interface Book {
  id: number;
  title: string;
  author: string;
  progress: number;
  status: 'want-to-read' | 'reading' | 'finished';
  startDate?: string;
  finishDate?: string;
  notes?: string;
}

export interface ReadingData {
  version: string;
  lastModified: string;
  books: Book[];
  streaks: StreakData;
  settings: UserSettings;
}

export interface StreakData {
  current: number;
  longest: number;
  lastUpdate: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
}

export type StatusFilter = 'all' | 'want-to-read' | 'reading' | 'finished';