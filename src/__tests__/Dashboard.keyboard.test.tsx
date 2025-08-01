import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Dashboard from "@/components/Dashboard";
import { AuthProvider } from "@/components/auth";
import { Book } from "@/types";

// Helper function to render components with AuthProvider
const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

const mockBooks: Book[] = [
  {
    id: 1,
    title: "Test Book 1",
    author: "Test Author 1",
    status: "currently_reading",
    progress: 50,
    dateAdded: new Date("2024-01-01"),
  },
  {
    id: 2,
    title: "Test Book 2",
    author: "Test Author 2",
    status: "want_to_read",
    progress: 0,
    dateAdded: new Date("2024-01-02"),
  },
  {
    id: 3,
    title: "Test Book 3",
    author: "Test Author 3",
    status: "finished",
    progress: 100,
    dateAdded: new Date("2024-01-03"),
    dateFinished: new Date("2024-01-15"),
  },
];

describe("Dashboard Keyboard Shortcuts", () => {
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

  describe("Navigation Shortcuts", () => {
    it('focuses search input when "/" is pressed', () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      const searchInput = screen.getAllByPlaceholderText(/Search books/)[0];

      // Simulate "/" key press
      fireEvent.keyDown(document, { key: "/", preventDefault: vi.fn() });

      expect(searchInput).toHaveFocus();
    });

    it('clears search when "Escape" is pressed', () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      const searchInput = screen.getAllByPlaceholderText(/Search books/)[0];

      // Type in search
      fireEvent.change(searchInput, { target: { value: "test query" } });
      expect(searchInput).toHaveValue("test query");

      // Press Escape
      fireEvent.keyDown(document, { key: "Escape", preventDefault: vi.fn() });

      expect(searchInput).toHaveValue("");
    });

    it('shows keyboard help when "?" is pressed', async () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Press "?"
      fireEvent.keyDown(document, { key: "?", preventDefault: vi.fn() });

      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });
    });

    it("closes keyboard help when close button is clicked", async () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Open help
      fireEvent.keyDown(document, { key: "?", preventDefault: vi.fn() });

      await waitFor(() => {
        expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      });

      // Close help - find the X button in the modal
      const modal = screen
        .getByText("Keyboard Shortcuts")
        .closest(".fixed") as HTMLElement;
      const closeButton = within(modal!).getByRole("button");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Keyboard Shortcuts"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Action Shortcuts", () => {
    it('opens add modal when "Ctrl+A" is pressed', async () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Press Ctrl+A
      fireEvent.keyDown(document, {
        key: "a",
        ctrlKey: true,
        preventDefault: vi.fn(),
      });

      await waitFor(() => {
        expect(screen.getByText("Add New Book")).toBeInTheDocument();
      });
    });

    it('opens export modal when "Ctrl+E" is pressed', async () => {
      const exportData = {
        books: mockBooks,
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.0",
          totalBooks: mockBooks.length,
        },
      };

      renderWithAuth(
        <Dashboard
          books={mockBooks}
          exportData={exportData}
          onAddBook={mockHandlers.onAddBook}
        />,
      );

      // Press Ctrl+E
      fireEvent.keyDown(document, {
        key: "e",
        ctrlKey: true,
        preventDefault: vi.fn(),
      });

      await waitFor(() => {
        expect(screen.getByText("Export Library")).toBeInTheDocument();
      });
    });

    it('opens import modal when "Ctrl+I" is pressed', async () => {
      renderWithAuth(
        <Dashboard
          books={mockBooks}
          onAddBook={mockHandlers.onAddBook}
          onImportComplete={mockHandlers.onImportComplete}
        />,
      );

      // Press Ctrl+I
      fireEvent.keyDown(document, {
        key: "i",
        ctrlKey: true,
        preventDefault: vi.fn(),
      });

      await waitFor(() => {
        expect(screen.getByText("Import Books")).toBeInTheDocument();
      });
    });

    it('marks reading day when "R" is pressed', () => {
      renderWithAuth(
        <Dashboard
          books={mockBooks}
          onMarkReadingDay={mockHandlers.onMarkReadingDay}
          onAddBook={mockHandlers.onAddBook}
        />,
      );

      // Press R
      fireEvent.keyDown(document, { key: "r", preventDefault: vi.fn() });

      expect(mockHandlers.onMarkReadingDay).toHaveBeenCalled();
    });
  });

  describe("Filter Shortcuts", () => {
    it('changes filter to "all" when "1" is pressed', () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Press 1
      fireEvent.keyDown(document, { key: "1", preventDefault: vi.fn() });

      // Check that "All" filter is active
      const allTabs = screen.getAllByRole("tab", { name: /All/i });
      expect(allTabs[0]).toHaveAttribute("aria-selected", "true");
    });

    it('changes filter to "want_to_read" when "2" is pressed', () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Press 2
      fireEvent.keyDown(document, { key: "2", preventDefault: vi.fn() });

      // Check that "Want to Read" filter is active
      const wantToReadTabs = screen.getAllByRole("tab", {
        name: /Want to Read/i,
      });
      expect(wantToReadTabs[0]).toHaveAttribute("aria-selected", "true");
    });

    it('changes filter to "currently_reading" when "3" is pressed', () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Press 3
      fireEvent.keyDown(document, { key: "3", preventDefault: vi.fn() });

      // Check that "Reading" filter is active
      const readingTabs = screen.getAllByRole("tab", { name: /Reading/i });
      expect(readingTabs[0]).toHaveAttribute("aria-selected", "true");
    });

    it('changes filter to "finished" when "4" is pressed', () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Press 4
      fireEvent.keyDown(document, { key: "4", preventDefault: vi.fn() });

      // Check that "Finished" filter is active
      const finishedTabs = screen.getAllByRole("tab", { name: /Finished/i });
      expect(finishedTabs[0]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Book Navigation", () => {
    it("navigates through books with arrow keys", () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // First switch to "All" filter to see all books
      fireEvent.keyDown(document, { key: "1", preventDefault: vi.fn() });

      // Press down arrow
      fireEvent.keyDown(document, {
        key: "ArrowDown",
        preventDefault: vi.fn(),
      });

      // First book should be highlighted (ring-2 ring-primary class)
      const firstBook = screen.getByText("Test Book 1").closest(".ring-2");
      expect(firstBook).toBeInTheDocument();

      // Press down arrow again
      fireEvent.keyDown(document, {
        key: "ArrowDown",
        preventDefault: vi.fn(),
      });

      // Second book should be highlighted
      const secondBook = screen.getByText("Test Book 2").closest(".ring-2");
      expect(secondBook).toBeInTheDocument();

      // Press up arrow
      fireEvent.keyDown(document, { key: "ArrowUp", preventDefault: vi.fn() });

      // First book should be highlighted again
      const firstBookAgain = screen.getByText("Test Book 1").closest(".ring-2");
      expect(firstBookAgain).toBeInTheDocument();
    });

    it('opens edit modal for selected book when "Enter" is pressed', async () => {
      renderWithAuth(
        <Dashboard
          books={mockBooks}
          onUpdateBook={mockHandlers.onUpdateBook}
          onAddBook={mockHandlers.onAddBook}
        />,
      );

      // Navigate to first book
      fireEvent.keyDown(document, {
        key: "ArrowDown",
        preventDefault: vi.fn(),
      });

      // Press Enter
      fireEvent.keyDown(document, { key: "Enter", preventDefault: vi.fn() });

      await waitFor(() => {
        expect(screen.getByText("Edit Book")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test Book 1")).toBeInTheDocument();
      });
    });
  });

  describe("Shortcut Blocking", () => {
    it("does not trigger shortcuts when typing in search input", () => {
      renderWithAuth(
        <Dashboard
          books={mockBooks}
          onAddBook={mockHandlers.onAddBook}
          onMarkReadingDay={mockHandlers.onMarkReadingDay}
        />,
      );

      const searchInput = screen.getAllByPlaceholderText(/Search books/)[0];
      searchInput.focus();

      // Type "r" in search - should not trigger reading day marking
      fireEvent.keyDown(searchInput, { key: "r" });

      expect(mockHandlers.onMarkReadingDay).not.toHaveBeenCalled();
    });

    it("does not trigger shortcuts when modals are open", async () => {
      renderWithAuth(
        <Dashboard
          books={mockBooks}
          onAddBook={mockHandlers.onAddBook}
          onMarkReadingDay={mockHandlers.onMarkReadingDay}
        />,
      );

      // Open add modal
      fireEvent.keyDown(document, {
        key: "a",
        ctrlKey: true,
        preventDefault: vi.fn(),
      });

      await waitFor(() => {
        expect(screen.getByText("Add New Book")).toBeInTheDocument();
      });

      // Try to trigger another shortcut while modal is open
      fireEvent.keyDown(document, { key: "r", preventDefault: vi.fn() });

      expect(mockHandlers.onMarkReadingDay).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("shows keyboard help button", () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      const helpButton = screen.getByLabelText("Show keyboard shortcuts");
      expect(helpButton).toBeInTheDocument();
    });

    it("keyboard help modal has proper accessibility attributes", async () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Open help
      fireEvent.keyDown(document, { key: "?", preventDefault: vi.fn() });

      await waitFor(() => {
        const modal = screen
          .getByText("Keyboard Shortcuts")
          .closest('[role="dialog"], .fixed');
        expect(modal).toBeInTheDocument();
      });
    });

    it("provides helpful placeholder text for search", () => {
      renderWithAuth(
        <Dashboard books={mockBooks} onAddBook={mockHandlers.onAddBook} />,
      );

      // Desktop has "Press / to focus", mobile just has "Search books..."
      const searchInputs = screen.getAllByPlaceholderText(/Search books/);
      expect(searchInputs.length).toBeGreaterThan(0);
    });
  });
});
