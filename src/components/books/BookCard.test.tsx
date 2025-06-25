import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
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

const mockHandlers = {
  onProgressUpdate: vi.fn().mockResolvedValue(undefined),
  onQuickAction: vi.fn().mockResolvedValue(undefined),
};

describe('BookCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders book information correctly', () => {
    render(<BookCard book={mockBook} {...mockHandlers} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('displays status indicator dot with correct color', () => {
    const { rerender } = render(<BookCard book={mockBook} {...mockHandlers} />);
    
    // Reading status - orange dot
    let statusDot = screen.getByLabelText('Status: reading');
    expect(statusDot).toHaveClass('bg-orange-500');

    // Finished status - green dot
    const finishedBook = { ...mockBook, status: 'finished' as const };
    rerender(<BookCard book={finishedBook} {...mockHandlers} />);
    statusDot = screen.getByLabelText('Status: finished');
    expect(statusDot).toHaveClass('bg-green-500');

    // Want to read status - gray dot
    const wantToReadBook = { ...mockBook, status: 'want-to-read' as const };
    rerender(<BookCard book={wantToReadBook} {...mockHandlers} />);
    statusDot = screen.getByLabelText('Status: want to read');
    expect(statusDot).toHaveClass('bg-gray-400');
  });

  it('shows progress slider and quick actions for reading books', () => {
    render(<BookCard book={mockBook} {...mockHandlers} />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('+10%')).toBeInTheDocument();
    expect(screen.getByText('+25%')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows start reading button for want-to-read books', () => {
    const wantToReadBook = { ...mockBook, status: 'want-to-read' as const };
    render(<BookCard book={wantToReadBook} {...mockHandlers} />);
    
    expect(screen.getByText('Start Reading')).toBeInTheDocument();
  });

  it('shows completed status for finished books', () => {
    const finishedBook = { ...mockBook, status: 'finished' as const, progress: 100 };
    render(<BookCard book={finishedBook} {...mockHandlers} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onQuickAction when quick action buttons are clicked', async () => {
    render(<BookCard book={mockBook} {...mockHandlers} />);
    
    // Test +10% button
    await act(async () => {
      fireEvent.click(screen.getByText('+10%'));
    });
    expect(mockHandlers.onQuickAction).toHaveBeenCalledWith(1, 'add10');

    // Clear mock and test +25% button
    vi.clearAllMocks();
    await act(async () => {
      fireEvent.click(screen.getByText('+25%'));
    });
    expect(mockHandlers.onQuickAction).toHaveBeenCalledWith(1, 'add25');

    // Clear mock and test complete button
    vi.clearAllMocks();
    await act(async () => {
      fireEvent.click(screen.getByText('✓'));
    });
    expect(mockHandlers.onQuickAction).toHaveBeenCalledWith(1, 'complete');
  });

  it('can hide quick actions when showQuickActions is false', () => {
    render(<BookCard book={mockBook} {...mockHandlers} showQuickActions={false} />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.queryByText('+10%')).not.toBeInTheDocument();
    expect(screen.queryByText('+25%')).not.toBeInTheDocument();
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });
});