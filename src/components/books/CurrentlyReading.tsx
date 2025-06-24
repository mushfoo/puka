import React from 'react';
import { Card, Button, ProgressBar } from '../ui';
import type { Book } from '../../types';

export interface CurrentlyReadingProps {
  book?: Book;
  onUpdateProgress?: (bookId: number) => void;
  className?: string;
}

export const CurrentlyReading: React.FC<CurrentlyReadingProps> = ({
  book,
  onUpdateProgress,
  className = '',
}) => {
  if (!book) return null;

  return (
    <div className={className}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Currently Reading
      </h2>
      <Card>
        <div className="flex gap-5 items-start">
          <div className="w-20 h-30 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 text-sm">
            📖
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {book.title}
              </h3>
              <p className="text-sm text-gray-600">
                {book.author}
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Reading Progress
              </h4>
              <ProgressBar progress={book.progress} />
              <Button
                onClick={() => onUpdateProgress?.(book.id)}
                size="sm"
                className="flex items-center gap-2"
              >
                📝 Update Progress
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};