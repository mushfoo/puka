import React from 'react';
import { StreakData } from '@/types';

interface StreakDisplayProps {
  /** Current streak data */
  streakData: StreakData;
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
  streakData,
  hasReadToday = false,
  compact = false,
  className = '',
  showDetails = true
}) => {
  const { currentStreak, longestStreak, todayProgress, dailyGoal } = streakData;

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
            {hasReadToday ? 'Active today' : 'No activity today'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-accent to-accent/80 text-white rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium opacity-90">
            Reading Streak
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {currentStreak}
            </span>
            <span className="text-sm opacity-75">
              day{currentStreak !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-4xl" aria-label="Streak icon">
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
            {hasReadToday && (
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