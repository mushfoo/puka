import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/components/Dashboard';
import { AuthProvider } from '@/components/auth';
import { Book } from '@/types';

// Helper function to render components with AuthProvider
const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

const mockBooksMultipleReading: Book[] = [
  {
    id: 1,
    title: 'Book One',
    author: 'Author One',
    status: 'currently_reading',
    progress: 30,
    dateAdded: new Date('2024-01-01'),
    dateModified: new Date('2024-01-10'),
  },
  {
    id: 2,
    title: 'Book Two',
    author: 'Author Two',
    status: 'currently_reading',
    progress: 60,
    dateAdded: new Date('2024-01-02'),
    dateModified: new Date('2024-01-12'),
  },
  {
    id: 3,
    title: 'Book Three',
    author: 'Author Three',
    status: 'currently_reading',
    progress: 90,
    dateAdded: new Date('2024-01-03'),
    dateModified: new Date('2024-01-11'),
  },
  {
    id: 4,
    title: 'Finished Book',
    author: 'Author Four',
    status: 'finished',
    progress: 100,
    dateAdded: new Date('2024-01-04'),
    dateFinished: new Date('2024-01-20'),
  },
];

const mockBooksSingleReading: Book[] = [
  {
    id: 1,
    title: 'Only Reading Book',
    author: 'Solo Author',
    status: 'currently_reading',
    progress: 50,
    dateAdded: new Date('2024-01-01'),
  },
  {
    id: 2,
    title: 'Want to Read Book',
    author: 'Future Author',
    status: 'want_to_read',
    progress: 0,
    dateAdded: new Date('2024-01-02'),
  },
];

describe('Dashboard Book Switcher', () => {
  const mockHandlers = {
    onUpdateProgress: vi.fn(),
    onQuickUpdate: vi.fn(),
    onMarkComplete: vi.fn(),
    onChangeStatus: vi.fn(),
    onAddBook: vi.fn(),
    onUpdateBook: vi.fn(),
    onDeleteBook: vi.fn(),
    onImportComplete: vi.fn(),
    onMarkReadingDay: vi.fn(),
    onStreakUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Book Switcher Visibility', () => {
    it('shows book switcher when multiple books are currently reading', () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Should show the switcher button (only on desktop)
      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      expect(switcherButton).toBeInTheDocument();
    });

    it('does not show book switcher when only one book is currently reading', () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksSingleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Should not show the switcher button
      expect(screen.queryByTitle(/Switch between/)).not.toBeInTheDocument();
    });

    it('does not show book switcher when no books are currently reading', () => {
      const noReadingBooks = mockBooksMultipleReading.map(book => ({
        ...book,
        status: 'want_to_read' as const
      }));

      renderWithAuth(
        <Dashboard 
          books={noReadingBooks}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Should not show the switcher button
      expect(screen.queryByTitle(/Switch between/)).not.toBeInTheDocument();
    });
  });

  describe('Book Switcher Functionality', () => {
    it('opens and closes book switcher dropdown when button is clicked', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      
      // Click to open
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        expect(screen.getByText('Currently Reading (3)')).toBeInTheDocument();
        // Check for books in the dropdown specifically
        const dropdown = screen.getByText('Currently Reading (3)').closest('.absolute');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveTextContent('Book One');
        expect(dropdown).toHaveTextContent('Book Two');
        expect(dropdown).toHaveTextContent('Book Three');
      });

      // Click to close
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Currently Reading (3)')).not.toBeInTheDocument();
      });
    });

    it('displays book information correctly in switcher', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        // Check that dropdown is visible
        const dropdown = screen.getByText('Currently Reading (3)').closest('.absolute');
        expect(dropdown).toBeInTheDocument();
        
        // Check book titles and authors within dropdown
        expect(dropdown).toHaveTextContent('Book One');
        expect(dropdown).toHaveTextContent('Author One');
        expect(dropdown).toHaveTextContent('Book Two');
        expect(dropdown).toHaveTextContent('Author Two');
        
        // Check progress percentages within dropdown
        expect(dropdown).toHaveTextContent('30%');
        expect(dropdown).toHaveTextContent('60%');
        expect(dropdown).toHaveTextContent('90%');
      });
    });

    it('shows active book indicator correctly', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        // Most recently modified book (Book Two) should be active initially
        // Find Book Two within the dropdown specifically
        const dropdown = screen.getByText('Currently Reading (3)').closest('.absolute');
        const activeBook = dropdown?.querySelector('button.bg-primary\\/10');
        expect(activeBook).toBeInTheDocument();
        expect(activeBook).toHaveTextContent('Book Two');
      });
    });

    it('switches active book when clicked in dropdown', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        expect(screen.getByText('Currently Reading (3)')).toBeInTheDocument();
      });

      // Click on Book One button in the dropdown
      const dropdown = screen.getByText('Currently Reading (3)').closest('.absolute') as HTMLElement;
      const bookButtons = within(dropdown).getAllByRole('button');
      const bookOneButton = bookButtons.find(button => button.textContent?.includes('Book One'));
      expect(bookOneButton).toBeInTheDocument();
      fireEvent.click(bookOneButton!);
      
      await waitFor(() => {
        // Dropdown should close
        expect(screen.queryByText('Currently Reading (3)')).not.toBeInTheDocument();
      });

      // Button should now show Book One as active
      expect(screen.getByText('Book One')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        expect(screen.getByText('Currently Reading (3)')).toBeInTheDocument();
      });

      // Click outside the dropdown
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('Currently Reading (3)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('toggles book switcher when "B" is pressed', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Press B to open
      fireEvent.keyDown(document, { key: 'b', preventDefault: vi.fn() });
      
      await waitFor(() => {
        expect(screen.getByText('Currently Reading (3)')).toBeInTheDocument();
      });

      // Press B to close
      fireEvent.keyDown(document, { key: 'b', preventDefault: vi.fn() });
      
      await waitFor(() => {
        expect(screen.queryByText('Currently Reading (3)')).not.toBeInTheDocument();
      });
    });

    it('does not toggle switcher with "B" when only one book is reading', () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksSingleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Press B - should not open anything
      fireEvent.keyDown(document, { key: 'b', preventDefault: vi.fn() });
      
      // Should not show switcher dropdown
      expect(screen.queryByText('Currently Reading')).not.toBeInTheDocument();
    });

    it('cycles through books with Ctrl+N (next)', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      
      // Initially should show Book Two (most recently modified)
      expect(switcherButton).toHaveTextContent('Book Two');

      // Press Ctrl+N to go to next book
      fireEvent.keyDown(document, { 
        key: 'n', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      await waitFor(() => {
        // Should now show Book Three (next in the array)
        expect(switcherButton).toHaveTextContent('Book Three');
      });

      // Press Ctrl+N again
      fireEvent.keyDown(document, { 
        key: 'n', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      await waitFor(() => {
        // Should wrap around to Book One
        expect(switcherButton).toHaveTextContent('Book One');
      });
    });

    it('cycles through books with Ctrl+P (previous)', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      
      // Initially should show Book Two (most recently modified)
      expect(switcherButton).toHaveTextContent('Book Two');

      // Press Ctrl+P to go to previous book
      fireEvent.keyDown(document, { 
        key: 'p', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      await waitFor(() => {
        // Should now show Book One (previous in the array)
        expect(switcherButton).toHaveTextContent('Book One');
      });

      // Press Ctrl+P again
      fireEvent.keyDown(document, { 
        key: 'p', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      await waitFor(() => {
        // Should wrap around to Book Three
        expect(switcherButton).toHaveTextContent('Book Three');
      });
    });

    it('does not cycle books when only one book is reading', () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksSingleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Try Ctrl+N and Ctrl+P - should not crash or change anything
      fireEvent.keyDown(document, { 
        key: 'n', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      fireEvent.keyDown(document, { 
        key: 'p', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      // Should not show any switcher
      expect(screen.queryByTitle(/Switch between/)).not.toBeInTheDocument();
    });
  });

  describe('Active Book Management', () => {
    it('sets most recently modified book as initial active book', () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Book Two has the most recent dateModified (2024-01-12)
      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      expect(switcherButton).toHaveTextContent('Book Two');
      expect(switcherButton).toHaveTextContent('2/3'); // Position 2 of 3
    });

    it('updates position indicator when switching books', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      
      // Initially at position 2/3
      expect(switcherButton).toHaveTextContent('2/3');

      // Switch to next book
      fireEvent.keyDown(document, { 
        key: 'n', 
        ctrlKey: true, 
        preventDefault: vi.fn() 
      });
      
      await waitFor(() => {
        // Should now be at position 3/3
        expect(switcherButton).toHaveTextContent('3/3');
      });
    });

    it('shows keyboard shortcuts help in dropdown', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      const switcherButton = screen.getByTitle(/Switch between 3 currently reading books/);
      fireEvent.click(switcherButton);
      
      await waitFor(() => {
        expect(screen.getByText('Shortcuts:')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
        expect(screen.getByText('Ctrl+P')).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Keyboard Help', () => {
    it('includes book switching shortcuts in keyboard help modal', async () => {
      renderWithAuth(
        <Dashboard 
          books={mockBooksMultipleReading}
          onAddBook={mockHandlers.onAddBook}
        />
      );

      // Open keyboard help
      fireEvent.keyDown(document, { key: '?', preventDefault: vi.fn() });
      
      await waitFor(() => {
        expect(screen.getByText('Book Switching')).toBeInTheDocument();
        expect(screen.getByText('Toggle book switcher')).toBeInTheDocument();
        expect(screen.getByText('Next reading book')).toBeInTheDocument();
        expect(screen.getByText('Previous reading book')).toBeInTheDocument();
      });
    });
  });
});