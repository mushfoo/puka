import { render, screen } from '@testing-library/react';
import { BookCard } from './BookCard';
import type { Book } from '../../types';

const mockBook: Book = {
  id: 1,
  title: 'Test Book',
  author: 'Test Author',
  status: 'reading',
  progress: 50,
  notes: 'Test notes',
};

describe('BookCard', () => {
  it('renders book information correctly', () => {
    render(<BookCard book={mockBook} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('displays correct status for different book statuses', () => {
    const finishedBook = { ...mockBook, status: 'finished' as const };
    const { rerender } = render(<BookCard book={finishedBook} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();

    const wantToReadBook = { ...mockBook, status: 'want-to-read' as const };
    rerender(<BookCard book={wantToReadBook} />);
    expect(screen.getByText('Want to Read')).toBeInTheDocument();
  });

  it('applies correct styling classes for status', () => {
    render(<BookCard book={mockBook} />);
    const statusBadge = screen.getByText('Reading');
    expect(statusBadge).toHaveClass('bg-purple-100', 'text-purple-800');
  });
});