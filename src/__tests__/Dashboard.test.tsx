import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Dashboard from '@/components/Dashboard';
import { Book } from '@/types';

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'The Midnight Library',
    author: 'Matt Haig',
    status: 'currently_reading',
    progress: 65,
    dateAdded: new Date('2024-01-01'),
    totalPages: 288,
    currentPage: 187
  },
  {
    id: 2,
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    status: 'want_to_read',
    progress: 0,
    dateAdded: new Date('2024-01-02')
  },
  {
    id: 3,
    title: 'Atomic Habits',
    author: 'James Clear',
    status: 'finished',
    progress: 100,
    dateAdded: new Date('2024-01-03'),
    dateFinished: new Date('2024-01-15'),
    notes: 'Great book about building habits.'
  }
];

describe('Dashboard', () => {
  const defaultProps = {
    books: mockBooks,
    onUpdateProgress: vi.fn(),
    onQuickUpdate: vi.fn(),
    onMarkComplete: vi.fn(),
    onChangeStatus: vi.fn(),
    onAddBook: vi.fn()
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders app header with title', () => {
    render(<Dashboard {...defaultProps} />);
    
    expect(screen.getByText('Puka Reading Tracker')).toBeInTheDocument();
    expect(screen.getByLabelText('Books')).toBeInTheDocument(); // Book emoji
  });

  it('renders search input', () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInputs = screen.getAllByPlaceholderText('Search books...');
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  it('renders filter tabs', () => {
    render(<Dashboard {...defaultProps} />);
    
    expect(screen.getAllByText('All')).toHaveLength(2); // Mobile + Desktop
    expect(screen.getAllByText('Want to Read').length).toBeGreaterThanOrEqual(2); // Filter tabs + BookCard badges
    expect(screen.getAllByText('Reading').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Finished').length).toBeGreaterThanOrEqual(2);
  });

  it('renders book grid with books', () => {
    render(<Dashboard {...defaultProps} />);
    
    expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
  });

  it('renders floating action button', () => {
    render(<Dashboard {...defaultProps} />);
    
    expect(screen.getByLabelText('Add new book')).toBeInTheDocument();
  });

  it('filters books when filter tab is clicked', () => {
    render(<Dashboard {...defaultProps} />);
    
    // Initially shows all books
    expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
    
    // Click on "Reading" filter (use first occurrence - mobile)
    fireEvent.click(screen.getAllByText('Reading')[0]);
    
    // Should only show currently reading books
    expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
    expect(screen.queryByText('Project Hail Mary')).not.toBeInTheDocument();
    expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
  });

  it('searches books by title', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: 'Midnight' } });
    
    await waitFor(() => {
      expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
      expect(screen.queryByText('Project Hail Mary')).not.toBeInTheDocument();
      expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
    });
  });

  it('searches books by author', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: 'Andy Weir' } });
    
    await waitFor(() => {
      expect(screen.queryByText('The Midnight Library')).not.toBeInTheDocument();
      expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
      expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
    });
  });

  it('searches books by notes', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: 'habits' } });
    
    await waitFor(() => {
      expect(screen.queryByText('The Midnight Library')).not.toBeInTheDocument();
      expect(screen.queryByText('Project Hail Mary')).not.toBeInTheDocument();
      expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    // Enter search query
    fireEvent.change(searchInput, { target: { value: 'Midnight' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Project Hail Mary')).not.toBeInTheDocument();
    });
    
    // Click clear button
    const clearButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
    );
    fireEvent.click(clearButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
    });
  });

  it('shows search results count', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: 'Midnight' } });
    
    await waitFor(() => {
      expect(screen.getByText('1 book found for "Midnight"')).toBeInTheDocument();
    });
  });

  it('shows no results message', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No books found for "nonexistent"')).toBeInTheDocument();
    });
  });

  it('combines filter and search', async () => {
    render(<Dashboard {...defaultProps} />);
    
    // First filter by "Reading"
    fireEvent.click(screen.getAllByText('Reading')[0]);
    
    // Then search
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    fireEvent.change(searchInput, { target: { value: 'Midnight' } });
    
    await waitFor(() => {
      expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
      expect(screen.queryByText('Project Hail Mary')).not.toBeInTheDocument();
      expect(screen.queryByText('Atomic Habits')).not.toBeInTheDocument();
    });
  });

  it('opens add book modal when FAB is clicked', () => {
    render(<Dashboard {...defaultProps} />);
    
    const fab = screen.getByLabelText('Add new book');
    fireEvent.click(fab);
    
    // Check that the modal opens
    expect(screen.getByText('Add New Book')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onAddBook when book is added through modal', async () => {
    const mockOnAddBook = vi.fn().mockResolvedValue(undefined);
    render(<Dashboard {...defaultProps} onAddBook={mockOnAddBook} />);
    
    // Open modal
    const fab = screen.getByLabelText('Add new book');
    fireEvent.click(fab);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'New Test Book' } });
    fireEvent.change(screen.getByLabelText('Author *'), { target: { value: 'Test Author' } });
    
    // Submit form
    fireEvent.click(screen.getByText('Add Book'));
    
    await waitFor(() => {
      expect(mockOnAddBook).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Test Book',
          author: 'Test Author',
          status: 'want_to_read'
        })
      );
    });
  });

  it('passes event handlers to BookGrid', () => {
    const mockHandlers = {
      onUpdateProgress: vi.fn(),
      onQuickUpdate: vi.fn(),
      onMarkComplete: vi.fn(),
      onChangeStatus: vi.fn()
    };
    
    render(<Dashboard {...defaultProps} {...mockHandlers} />);
    
    // Find and click a quick action button to test handler passing
    const quickActionButtons = screen.getAllByText('+10%');
    if (quickActionButtons.length > 0) {
      fireEvent.click(quickActionButtons[0]);
      expect(mockHandlers.onQuickUpdate).toHaveBeenCalled();
    }
  });

  it('shows loading state', () => {
    render(<Dashboard {...defaultProps} loading={true} />);
    
    // Should show skeleton loaders in BookGrid
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <Dashboard {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has responsive header layout', () => {
    render(<Dashboard {...defaultProps} />);
    
    // Check for mobile and desktop search inputs
    const mobileSearch = document.querySelector('.sm\\:hidden input');
    const desktopSearch = document.querySelector('.hidden.sm\\:flex input');
    
    expect(mobileSearch).toBeInTheDocument();
    expect(desktopSearch).toBeInTheDocument();
  });

  it('has sticky header', () => {
    render(<Dashboard {...defaultProps} />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0');
  });

  it('handles empty books list', () => {
    render(<Dashboard {...defaultProps} books={[]} />);
    
    expect(screen.getByText('No books yet')).toBeInTheDocument();
  });

  it('case-insensitive search', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: 'MIDNIGHT' } });
    
    await waitFor(() => {
      expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
    });
  });

  it('trims search query', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search books...')[0];
    
    fireEvent.change(searchInput, { target: { value: '  Midnight  ' } });
    
    await waitFor(() => {
      expect(screen.getByText('The Midnight Library')).toBeInTheDocument();
    });
  });
});