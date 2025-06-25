import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import BookGrid from '@/components/books/BookGrid';
import { Book } from '@/types';

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Test Book 1',
    author: 'Test Author 1',
    status: 'currently_reading',
    progress: 50,
    dateAdded: new Date('2024-01-01'),
    totalPages: 200,
    currentPage: 100
  },
  {
    id: 2,
    title: 'Test Book 2',
    author: 'Test Author 2',
    status: 'want_to_read',
    progress: 0,
    dateAdded: new Date('2024-01-02')
  },
  {
    id: 3,
    title: 'Test Book 3',
    author: 'Test Author 3',
    status: 'finished',
    progress: 100,
    dateAdded: new Date('2024-01-03'),
    dateFinished: new Date('2024-01-15')
  }
];

describe('BookGrid', () => {
  const defaultProps = {
    books: mockBooks,
    onUpdateProgress: vi.fn(),
    onQuickUpdate: vi.fn(),
    onMarkComplete: vi.fn(),
    onChangeStatus: vi.fn()
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders books in a grid layout', () => {
    render(<BookGrid {...defaultProps} />);
    
    expect(screen.getByText('Test Book 1')).toBeInTheDocument();
    expect(screen.getByText('Test Book 2')).toBeInTheDocument();
    expect(screen.getByText('Test Book 3')).toBeInTheDocument();
    expect(screen.getByText('Test Author 1')).toBeInTheDocument();
    expect(screen.getByText('Test Author 2')).toBeInTheDocument();
    expect(screen.getByText('Test Author 3')).toBeInTheDocument();
  });

  it('displays correct book count', () => {
    render(<BookGrid {...defaultProps} />);
    
    expect(screen.getByText('Showing 3 books')).toBeInTheDocument();
  });

  it('displays singular form for single book', () => {
    render(<BookGrid {...defaultProps} books={[mockBooks[0]]} />);
    
    expect(screen.getByText('Showing 1 book')).toBeInTheDocument();
  });

  it('shows empty state when no books', () => {
    render(<BookGrid {...defaultProps} books={[]} />);
    
    expect(screen.getByText('No books yet')).toBeInTheDocument();
    expect(screen.getByText(/Start building your reading library/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<BookGrid {...defaultProps} loading={true} />);
    
    // Should show skeleton loaders
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('passes props to BookCard components', () => {
    const mockOnUpdateProgress = vi.fn();
    const mockOnQuickUpdate = vi.fn();
    
    render(
      <BookGrid 
        {...defaultProps} 
        onUpdateProgress={mockOnUpdateProgress}
        onQuickUpdate={mockOnQuickUpdate}
        showQuickActions={true}
      />
    );
    
    // Find and click a quick action button
    const quickActionButtons = screen.getAllByText('+10%');
    expect(quickActionButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(quickActionButtons[0]);
    expect(mockOnQuickUpdate).toHaveBeenCalled();
  });

  it('handles showQuickActions prop', () => {
    render(<BookGrid {...defaultProps} showQuickActions={false} />);
    
    // Quick action buttons should not be present for currently reading books
    const quickActionButtons = screen.queryAllByText('+10%');
    expect(quickActionButtons).toHaveLength(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <BookGrid {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with responsive grid classes', () => {
    const { container } = render(<BookGrid {...defaultProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2', 
      'lg:grid-cols-3',
      'xl:grid-cols-4'
    );
  });

  it('handles books with different statuses correctly', () => {
    render(<BookGrid {...defaultProps} />);
    
    // Check that all status badges are rendered
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Want to Read')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('passes all event handlers to BookCard', () => {
    const handlers = {
      onUpdateProgress: vi.fn(),
      onQuickUpdate: vi.fn(),
      onMarkComplete: vi.fn(),
      onChangeStatus: vi.fn()
    };
    
    render(<BookGrid {...defaultProps} {...handlers} />);
    
    // Verify the handlers are passed by checking if BookCards render with interactive features
    const progressBars = document.querySelectorAll('input[type="range"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});