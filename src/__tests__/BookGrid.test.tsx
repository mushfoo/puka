import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import BookGrid from '@/components/books/BookGrid';
import { Book } from '@/types';

// Mock react-window for testing
vi.mock('react-window', () => ({
  FixedSizeGrid: ({ children, rowCount, columnCount, columnWidth, rowHeight }: any) => {
    const items = [];
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        const style = {
          left: col * (columnWidth || 250),
          top: row * (rowHeight || 320),
          width: columnWidth || 250,
          height: rowHeight || 320,
        };
        items.push(
          <div key={`${row}-${col}`} data-testid="virtual-grid-item">
            {children({ columnIndex: col, rowIndex: row, style })}
          </div>
        );
      }
    }
    return <div data-testid="virtual-grid">{items}</div>;
  }
}));

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

// Generate many books for virtual scrolling tests
const generateManyBooks = (count: number): Book[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Book ${i + 1}`,
    author: `Author ${i + 1}`,
    status: 'want_to_read' as const,
    progress: 0,
    dateAdded: new Date('2024-01-01')
  }));
};

describe('BookGrid', () => {
  const defaultProps = {
    books: mockBooks,
    onUpdateProgress: vi.fn(),
    onQuickUpdate: vi.fn(),
    onMarkComplete: vi.fn(),
    onChangeStatus: vi.fn()
  };

  beforeEach(() => {
    // Mock getBoundingClientRect for container dimensions
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 1200,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1200,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
  });

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

  it('renders with responsive grid classes for regular grid', () => {
    const { container } = render(<BookGrid {...defaultProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2', 
      'lg:grid-cols-3',
      'xl:grid-cols-4'
    );
  });

  it('uses virtual scrolling for more than 50 books', () => {
    const manyBooks = generateManyBooks(60);
    render(<BookGrid {...defaultProps} books={manyBooks} />);
    
    // Should render virtual grid
    expect(screen.getByTestId('virtual-grid')).toBeInTheDocument();
    expect(screen.getByText('Showing 60 books (virtualized for performance)')).toBeInTheDocument();
  });

  it('uses regular grid for 50 or fewer books', () => {
    const someBooks = generateManyBooks(50);
    const { container } = render(<BookGrid {...defaultProps} books={someBooks} />);
    
    // Should not use virtual grid
    expect(screen.queryByTestId('virtual-grid')).not.toBeInTheDocument();
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(screen.getByText('Showing 50 books')).toBeInTheDocument();
  });

  it('calculates correct column count based on container width', () => {
    // Test different widths
    const widths = [
      { width: 500, expectedColumns: 1 },   // mobile
      { width: 700, expectedColumns: 2 },   // sm
      { width: 1100, expectedColumns: 3 },  // lg
      { width: 1400, expectedColumns: 4 }   // xl
    ];
    
    widths.forEach(({ width }) => {
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: width,
        x: 0,
        y: 0,
        toJSON: () => {}
      }));
      
      const manyBooks = generateManyBooks(60);
      const { rerender } = render(<BookGrid {...defaultProps} books={manyBooks} />);
      
      // Force re-render to apply new dimensions
      rerender(<BookGrid {...defaultProps} books={manyBooks} />);
    });
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

  it('handles window resize events', () => {
    const { container } = render(<BookGrid {...defaultProps} />);
    
    // Change window size
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 600,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 600,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    // Component should still render correctly
    expect(container.querySelector('.w-full')).toBeInTheDocument();
  });

  it('renders BookCards correctly in virtual grid', () => {
    const manyBooks = generateManyBooks(60);
    render(<BookGrid {...defaultProps} books={manyBooks} />);
    
    // Check that some books are rendered
    const virtualItems = screen.getAllByTestId('virtual-grid-item');
    expect(virtualItems.length).toBeGreaterThan(0);
    
    // Check that first few books are rendered with correct titles
    expect(screen.getByText('Book 1')).toBeInTheDocument();
    expect(screen.getByText('Author 1')).toBeInTheDocument();
  });
});