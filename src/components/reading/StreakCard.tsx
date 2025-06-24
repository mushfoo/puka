import React from 'react';
import { Card } from '../ui';

export interface StreakCardProps {
  streak: number;
  className?: string;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  streak,
  className = '',
}) => {
  return (
    <Card className={`bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl">🔥</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {streak} Day Streak!
            </h3>
            <p className="text-sm text-gray-600">
              Keep reading daily to maintain your streak
            </p>
          </div>
        </div>
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          Active
        </div>
      </div>
    </Card>
  );
};