import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReadingCalendar from '../calendar/ReadingCalendar';
import DayDetailPanel from '../calendar/DayDetailPanel';
import { EnhancedReadingDayEntry, Book, ReadingDayMap, ReadingDayEntry } from '@/types';
import { ReadingDataService } from '@/services/ReadingDataService';
import { useStorage } from '@/hooks/useStorage';

interface ReadingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onUpdateStreak?: () => void;
}

const ReadingHistoryModal: React.FC<ReadingHistoryModalProps> = ({
  isOpen,
  onClose,
  books,
  onUpdateStreak
}) => {
  const { getEnhancedStreakHistory, addReadingDayEntry, updateReadingDayEntry, removeReadingDayEntry } = useStorage();
  
  // State management
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [readingData, setReadingData] = useState<ReadingDayMap>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert legacy ReadingDayEntry to EnhancedReadingDayEntry for calendar compatibility
  const convertToEnhancedEntry = useCallback((entry: ReadingDayEntry): EnhancedReadingDayEntry => {
    // Get the primary source type (prioritize manual > book_completion > progress_update)
    const primarySource = entry.sources.find(s => s.type === 'manual') ||
                          entry.sources.find(s => s.type === 'book_completion') ||
                          entry.sources[0];
    
    const sourceMapping = {
      'manual': 'manual' as const,
      'book_completion': 'book' as const,
      'progress_update': 'progress' as const
    };

    return {
      date: entry.date,
      source: sourceMapping[primarySource?.type] || 'manual',
      bookIds: entry.bookIds,
      notes: entry.notes || '',
      createdAt: primarySource?.timestamp || new Date(),
      modifiedAt: primarySource?.timestamp || new Date()
    };
  }, []);

  // Load reading data when modal opens
  const loadReadingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const streakHistory = await getEnhancedStreakHistory();
      
      const mergedData = ReadingDataService.mergeReadingData(streakHistory, books);
      setReadingData(mergedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reading data');
    } finally {
      setLoading(false);
    }
  }, [getEnhancedStreakHistory, books]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadReadingData();
      // Set current month to today when opening
      setCurrentMonth(new Date());
      setSelectedDate(null);
    }
  }, [isOpen, loadReadingData]);

  // Handle date selection
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);


  // Handle keyboard navigation in calendar
  const handleCalendarKeyDown = useCallback((event: React.KeyboardEvent, date: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedDate(date);
    }
  }, []);

  // Handle reading day toggle
  const handleToggleReading = useCallback(async (date: string, isReading: boolean) => {
    console.log('ReadingHistoryModal: handleToggleReading called', { date, isReading });
    try {
      setLoading(true);
      setError(null);

      if (isReading) {
        // Add reading day entry
        const newEntry: EnhancedReadingDayEntry = {
          date,
          source: 'manual',
          notes: '',
          bookIds: [],
          createdAt: new Date(),
          modifiedAt: new Date()
        };
        
        await addReadingDayEntry(newEntry);
      } else {
        // Remove reading day entry
        await removeReadingDayEntry(date);
      }

      // Reload data to reflect changes
      await loadReadingData();
      
      // Notify parent to update streak display
      if (onUpdateStreak) {
        onUpdateStreak();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reading day');
    } finally {
      setLoading(false);
    }
  }, [addReadingDayEntry, removeReadingDayEntry, loadReadingData, onUpdateStreak]);

  // Handle notes update
  const handleUpdateNotes = useCallback(async (date: string, notes: string) => {
    try {
      setLoading(true);
      setError(null);

      const existingEntry = readingData.get(date);
      
      if (existingEntry) {
        // Update existing entry
        await updateReadingDayEntry(date, { 
          notes,
          modifiedAt: new Date()
        });
      } else if (notes.trim()) {
        // Create new entry with just notes
        const newEntry: EnhancedReadingDayEntry = {
          date,
          source: 'manual',
          notes: notes.trim(),
          bookIds: [],
          createdAt: new Date(),
          modifiedAt: new Date()
        };
        
        await addReadingDayEntry(newEntry);
      }

      // Reload data to reflect changes
      await loadReadingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
    } finally {
      setLoading(false);
    }
  }, [readingData, addReadingDayEntry, updateReadingDayEntry, loadReadingData]);

  // Handle book updates
  const handleUpdateBooks = useCallback(async (date: string, bookIds: number[]) => {
    try {
      setLoading(true);
      setError(null);

      const existingEntry = readingData.get(date);
      
      if (existingEntry) {
        // Update existing entry
        await updateReadingDayEntry(date, { 
          bookIds,
          modifiedAt: new Date()
        });
      } else if (bookIds.length > 0) {
        // Create new entry with selected books
        const newEntry: EnhancedReadingDayEntry = {
          date,
          source: 'manual',
          notes: '',
          bookIds,
          createdAt: new Date(),
          modifiedAt: new Date()
        };
        
        await addReadingDayEntry(newEntry);
      }

      // Reload data to reflect changes
      await loadReadingData();
      
      // Notify parent to update streak display
      if (onUpdateStreak) {
        onUpdateStreak();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update book associations');
    } finally {
      setLoading(false);
    }
  }, [readingData, addReadingDayEntry, updateReadingDayEntry, loadReadingData, onUpdateStreak]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setSelectedDate(null);
    setError(null);
    onClose();
  }, [onClose]);

  // Handle keyboard events for modal
  const handleModalKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Convert reading data for calendar display
  const enhancedReadingData = useMemo(() => {
    const enhancedMap = new Map<string, EnhancedReadingDayEntry>();
    for (const [date, entry] of readingData) {
      enhancedMap.set(date, convertToEnhancedEntry(entry));
    }
    return enhancedMap;
  }, [readingData, convertToEnhancedEntry]);

  // Get data for selected date
  const selectedDateData = useMemo(() => {
    if (!selectedDate) return undefined;
    const legacyEntry = readingData.get(selectedDate);
    return legacyEntry ? convertToEnhancedEntry(legacyEntry) : undefined;
  }, [selectedDate, readingData, convertToEnhancedEntry]);

  // Month navigation handlers
  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Format month header
  const monthHeader = useMemo(() => {
    return currentMonth.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }, [currentMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative flex items-center justify-center min-h-full p-4">
        <div 
          className="relative w-full max-w-5xl bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reading-history-title"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 id="reading-history-title" className="text-2xl font-semibold text-text-primary">
                Reading History
              </h2>
              <p className="text-text-secondary mt-1">
                View and manage your reading activity
              </p>
            </div>
            
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors font-semibold text-text-primary"
              aria-label="Close reading history"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-500" role="img" aria-label="Error">⚠️</span>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-col lg:flex-row">
            {/* Calendar Section */}
            <div className="flex-1 p-6 border-r border-border lg:border-r-border lg:border-r">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                  aria-label="Previous month"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <h3 className="text-xl font-semibold text-text-primary">
                  {monthHeader}
                </h3>
                
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                  aria-label="Next month"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-text-secondary">Loading reading data...</p>
                  </div>
                </div>
              )}

              {/* Calendar */}
              {!loading && (
                <ReadingCalendar
                  currentDate={currentMonth}
                  readingData={enhancedReadingData}
                  onDateSelect={handleDateSelect}
                  onDateKeyDown={handleCalendarKeyDown}
                  className="mx-auto"
                  showHeader={false}
                />
              )}
            </div>

            {/* Detail Panel */}
            <div className="w-full lg:w-96 lg:flex-shrink-0">
              <div className="h-full max-h-[60vh] lg:max-h-none overflow-y-auto">
                <DayDetailPanel
                  selectedDate={selectedDate || undefined}
                  readingData={selectedDateData}
                  books={books}
                  onToggleReading={handleToggleReading}
                  onUpdateNotes={handleUpdateNotes}
                  onUpdateBooks={handleUpdateBooks}
                  loading={loading}
                  className="p-6"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border bg-surface/50">
            <div className="text-sm text-text-secondary">
              {selectedDate ? (
                <>Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</>
              ) : (
                'Select a date to view details'
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingHistoryModal;