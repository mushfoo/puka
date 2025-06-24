import React from 'react';
import { Card } from '../ui';
import type { Book } from '../../types';

export interface BookCardProps {
  book: Book;
  onClick?: () => void;
  className?: string;
}

const getStatusStyle = (status: Book['status']) => {
  switch (status) {
    case 'reading':
      return 'bg-purple-100 text-purple-800';
    case 'finished':
      return 'bg-green-100 text-green-800';
    case 'want-to-read':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: Book['status']) => {
  switch (status) {
    case 'want-to-read':
      return 'Want to Read';
    case 'reading':
      return 'Reading';
    case 'finished':
      return 'Completed';
    default:
      return status;
  }
};

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onClick,
  className = '',
}) => {
  return (
    <Card onClick={onClick} className={className}>
      <div className="space-y-3">
        <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
          📖
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
            {book.title}
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            {book.author}
          </p>
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(book.status)}`}>
            {getStatusText(book.status)}
          </div>
        </div>
      </div>
    </Card>
  );
};