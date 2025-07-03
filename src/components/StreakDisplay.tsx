import React from 'react';
import { Book, StreakHistory } from '@/types';
import { calculateStreakWithHistory } from '@/utils/streakCalculator';

interface StreakDisplayProps {
  /** Books data to calculate streak from */
  books: Book[];
  /** Streak history for enhanced calculation */
  streakHistory?: StreakHistory;
  /** Function to manually mark today as a reading day */
  onMarkReadingDay?: () => Promise<boolean>;
  /** Whether today has reading activity */
  hasReadToday?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Show streak details */
  showDetails?: boolean;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  books,
  streakHistory,
  onMarkReadingDay,
  hasReadToday = false,
  compact = false,
  className = '',
  showDetails = true
}) => {
  const [isMarkingReadingDay, setIsMarkingReadingDay] = React.useState(false);

  // Calculate streak data from books with history integration
  const streakData = React.useMemo(() => {
    return calculateStreakWithHistory(books, streakHistory, 30); // 30 pages as default daily goal
  }, [books, streakHistory]);

  const handleMarkReadingDay = async () => {
    if (!onMarkReadingDay || isMarkingReadingDay) return;
    
    try {
      setIsMarkingReadingDay(true);
      const success = await onMarkReadingDay();
      if (!success) {
        console.error('Failed to mark reading day');
      }
    } catch (error) {
      console.error('Error marking reading day:', error);
    } finally {
      setIsMarkingReadingDay(false);
    }
  };
  
  const { currentStreak, longestStreak, todayProgress, dailyGoal, hasReadToday: calculatedHasReadToday } = streakData;
  
  // Use calculated value or fallback to prop
  const actualHasReadToday = calculatedHasReadToday || hasReadToday;

  // Debug logging
  React.useEffect(() => {
    console.log('StreakDisplay Debug:', {
      hasOnMarkReadingDay: !!onMarkReadingDay,
      actualHasReadToday,
      calculatedHasReadToday,
      currentStreak,
      longestStreak
    });
  }, [onMarkReadingDay, actualHasReadToday, calculatedHasReadToday, currentStreak, longestStreak]);
  
  // Debug logging for troubleshooting
  React.useEffect(() => {
    console.log('StreakDisplay Debug Info:', {
      calculatedHasReadToday,
      hasReadTodayProp: hasReadToday,
      actualHasReadToday,
      currentStreak,
      todayProgress,
      onMarkReadingDayAvailable: !!onMarkReadingDay,
      today: new Date().toISOString().split('T')[0]
    });
  }, [calculatedHasReadToday, hasReadToday, actualHasReadToday, currentStreak, todayProgress, onMarkReadingDay]);

  const getStreakMessage = () => {
    if (currentStreak === 0) {
      return 'Start your reading streak today!';
    }
    
    if (currentStreak === 1) {
      return 'Great start! Keep it going!';
    }
    
    if (currentStreak >= 7 && currentStreak < 30) {
      return 'You\'re on fire! 🔥';
    }
    
    if (currentStreak >= 30) {
      return 'Incredible dedication! 🏆';
    }
    
    return 'Keep up the great work!';
  };

  const getStreakIcon = () => {
    if (currentStreak === 0) return '📚';
    if (currentStreak < 7) return '🔥';
    if (currentStreak < 30) return '🔥🔥';
    return '🔥🔥🔥';
  };

  const progressPercentage = dailyGoal > 0 ? Math.min(100, (todayProgress / dailyGoal) * 100) : 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="text-2xl" aria-label="Streak icon">
          {getStreakIcon()}
        </div>
        <div>
          <div className="font-bold text-lg text-text-primary">
            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-text-secondary">
            {actualHasReadToday ? 'Active today' : 'No activity today'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-accent to-accent-light text-white rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-medium opacity-90 mb-1">
            Reading Streak
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold">
              {currentStreak}
            </span>
            <span className="text-base sm:text-lg opacity-90">
              day{currentStreak !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-5xl sm:text-6xl" aria-label="Streak icon">
          {getStreakIcon()}
        </div>
      </div>

      {showDetails && (
        <>
          {/* Today's Progress */}
          {dailyGoal > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs opacity-75">Today's Goal</span>
                <span className="text-xs opacity-75">
                  {todayProgress} / {dailyGoal} pages
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Message and Actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-75">
              {getStreakMessage()}
            </span>
            <div className="flex items-center gap-2">
              {/* I Read Today Button - Always show when onMarkReadingDay is available */}
              {onMarkReadingDay && (
                <button
                  onClick={handleMarkReadingDay}
                  disabled={isMarkingReadingDay || actualHasReadToday}
                  className={`text-xs px-3 py-1 rounded-full transition-all duration-200 
                           focus:outline-none focus:ring-2 focus:ring-white/50
                           ${actualHasReadToday 
                             ? 'bg-green-500/30 text-white cursor-default' 
                             : 'bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
                           }`}
                  aria-label={actualHasReadToday ? "Already marked as read today" : "Mark today as a reading day"}
                >
                  {isMarkingReadingDay 
                    ? '...' 
                    : actualHasReadToday 
                      ? '✅ Read today' 
                      : '📚 I read today'
                  }
                </button>
              )}
              
              {/* Active Indicator - Only show when read today and no button */}
              {actualHasReadToday && !onMarkReadingDay && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs opacity-75">Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Longest Streak */}
          {longestStreak > currentStreak && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <span className="text-xs opacity-75">
                Best streak: {longestStreak} days
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StreakDisplay;