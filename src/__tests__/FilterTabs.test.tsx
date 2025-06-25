import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FilterTabs from '@/components/FilterTabs';
import { Book } from '@/types';

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Book 1',
    author: 'Author 1',
    status: 'currently_reading',
    progress: 50,
    dateAdded: new Date()
  },
  {
    id: 2,
    title: 'Book 2',
    author: 'Author 2',
    status: 'want_to_read',
    progress: 0,
    dateAdded: new Date()
  },
  {
    id: 3,
    title: 'Book 3',
    author: 'Author 3',
    status: 'finished',
    progress: 100,
    dateAdded: new Date(),
    dateFinished: new Date()
  },
  {
    id: 4,
    title: 'Book 4',
    author: 'Author 4',
    status: 'currently_reading',
    progress: 75,
    dateAdded: new Date()
  }
];

describe('FilterTabs', () => {
  const defaultProps = {
    books: mockBooks,
    activeFilter: 'all' as const,
    onFilterChange: vi.fn()
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter tabs', () => {
    render(<FilterTabs {...defaultProps} />);
    
    expect(screen.getAllByText('All')).toHaveLength(2); // Mobile + Desktop
    expect(screen.getAllByText('Want to Read')).toHaveLength(2);
    expect(screen.getAllByText('Reading')).toHaveLength(2);
    expect(screen.getAllByText('Finished')).toHaveLength(2);
  });

  it('displays correct book counts for each filter', () => {
    render(<FilterTabs {...defaultProps} />);
    
    // All books (mobile + desktop)
    expect(screen.getAllByLabelText('Filter by All (4 books)')).toHaveLength(2);
    
    // Want to read (1 book)
    expect(screen.getAllByLabelText('Filter by Want to Read (1 books)')).toHaveLength(2);
    
    // Currently reading (2 books)
    expect(screen.getAllByLabelText('Filter by Reading (2 books)')).toHaveLength(2);
    
    // Finished (1 book)
    expect(screen.getAllByLabelText('Filter by Finished (1 books)')).toHaveLength(2);
  });

  it('highlights active filter', () => {
    render(<FilterTabs {...defaultProps} activeFilter="currently_reading" />);
    
    const readingTab = screen.getAllByText('Reading')[0].closest('button');
    expect(readingTab).toHaveClass('bg-primary', 'text-white');
  });

  it('calls onFilterChange when tab is clicked', () => {
    const mockOnFilterChange = vi.fn();
    
    render(
      <FilterTabs 
        {...defaultProps} 
        onFilterChange={mockOnFilterChange}
      />
    );
    
    fireEvent.click(screen.getAllByText('Reading')[0]);
    expect(mockOnFilterChange).toHaveBeenCalledWith('currently_reading');
    
    fireEvent.click(screen.getAllByText('Finished')[0]);
    expect(mockOnFilterChange).toHaveBeenCalledWith('finished');
  });

  it('handles empty book list', () => {
    render(<FilterTabs {...defaultProps} books={[]} />);
    
    expect(screen.getAllByLabelText('Filter by All (0 books)')).toHaveLength(2);
    expect(screen.getAllByLabelText('Filter by Want to Read (0 books)')).toHaveLength(2);
    expect(screen.getAllByLabelText('Filter by Reading (0 books)')).toHaveLength(2);
    expect(screen.getAllByLabelText('Filter by Finished (0 books)')).toHaveLength(2);
  });

  it('includes icons for each tab', () => {
    render(<FilterTabs {...defaultProps} />);
    
    // Check that emoji icons are present (mobile + desktop)
    expect(screen.getAllByText('📚')).toHaveLength(2); // All
    expect(screen.getAllByText('💭')).toHaveLength(2); // Want to Read
    expect(screen.getAllByText('📖')).toHaveLength(2); // Reading
    expect(screen.getAllByText('✅')).toHaveLength(2); // Finished
  });

  it('applies correct styles for inactive tabs', () => {
    render(<FilterTabs {...defaultProps} activeFilter="all" />);
    
    const readingTab = screen.getAllByText('Reading')[0].closest('button');
    expect(readingTab).toHaveClass('bg-surface', 'text-text-primary');
    expect(readingTab).not.toHaveClass('bg-primary', 'text-white');
  });

  it('has proper accessibility attributes', () => {
    render(<FilterTabs {...defaultProps} activeFilter="currently_reading" />);
    
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(8); // 4 tabs x 2 (mobile + desktop)
    
    // Check aria-selected
    const readingTab = screen.getAllByText('Reading')[0].closest('button');
    expect(readingTab).toHaveAttribute('aria-selected', 'true');
    
    const allTab = screen.getAllByText('All')[0].closest('button');
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  it('has responsive design classes', () => {
    const { container } = render(<FilterTabs {...defaultProps} />);
    
    // Check for mobile horizontal scroll container
    expect(container.querySelector('.sm\\:hidden')).toBeInTheDocument();
    
    // Check for desktop flex container
    expect(container.querySelector('.hidden.sm\\:flex')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FilterTabs {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles keyboard navigation', () => {
    const mockOnFilterChange = vi.fn();
    
    render(
      <FilterTabs 
        {...defaultProps} 
        onFilterChange={mockOnFilterChange}
      />
    );
    
    const readingTab = screen.getAllByText('Reading')[0].closest('button');
    
    // Test keyboard interaction
    fireEvent.keyDown(readingTab!, { key: 'Enter' });
    // Note: click event should still be triggered by Enter key
  });

  it('displays correct count styling for active vs inactive tabs', () => {
    render(<FilterTabs {...defaultProps} activeFilter="currently_reading" />);
    
    const readingTab = screen.getAllByText('Reading')[0].closest('button');
    const countBadge = readingTab?.querySelector('.bg-white\\/20');
    expect(countBadge).toBeInTheDocument();
    
    const allTab = screen.getAllByText('All')[0].closest('button');
    const inactiveCountBadge = allTab?.querySelector('.bg-background');
    expect(inactiveCountBadge).toBeInTheDocument();
  });

  it('updates counts when books prop changes', () => {
    const { rerender } = render(<FilterTabs {...defaultProps} />);
    
    expect(screen.getAllByLabelText('Filter by All (4 books)')).toHaveLength(2);
    
    // Add more books
    const moreBooks = [
      ...mockBooks,
      {
        id: 5,
        title: 'Book 5',
        author: 'Author 5',
        status: 'want_to_read' as const,
        progress: 0,
        dateAdded: new Date()
      }
    ];
    
    rerender(<FilterTabs {...defaultProps} books={moreBooks} />);
    
    expect(screen.getAllByLabelText('Filter by All (5 books)')).toHaveLength(2);
    expect(screen.getAllByLabelText('Filter by Want to Read (2 books)')).toHaveLength(2);
  });
});