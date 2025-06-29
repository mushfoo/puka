import React from 'react';
import { Book } from '@/types';
import { calculateStreak } from '@/utils/streakCalculator';

interface StreakDisplayProps {
  /** Books data to calculate streak from */
  books: Book[];
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
  hasReadToday = false,
  compact = false,
  className = '',
  showDetails = true
}) => {
  // Calculate streak data from books
  const streakData = React.useMemo(() => {
    return calculateStreak(books, 30); // 30 pages as default daily goal
  }, [books]);
  
  const { currentStreak, longestStreak, todayProgress, dailyGoal, hasReadToday: calculatedHasReadToday } = streakData;
  
  // Use calculated value or fallback to prop
  const actualHasReadToday = calculatedHasReadToday || hasReadToday;

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
    <div className={`bg-gradient-to-r from-accent to-[#FF8787] text-white rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between">
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

          {/* Status Message */}
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-75">
              {getStreakMessage()}
            </span>
            {actualHasReadToday && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs opacity-75">Active</span>
              </div>
            )}
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