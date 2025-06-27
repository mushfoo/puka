import React, { useState, useMemo, useEffect } from 'react';
import { Book, StatusFilter } from '@/types';
import BookGrid from './books/BookGrid';
import FilterTabs from './FilterTabs';
import FloatingActionButton from './FloatingActionButton';
import AddBookModal from './modals/AddBookModal';
import EditBookModal from './modals/EditBookModal';
import StreakDisplay from './StreakDisplay';

interface DashboardProps {
  books: Book[];
  onUpdateProgress?: (bookId: number, progress: number) => void;
  onQuickUpdate?: (bookId: number, increment: number) => void;
  onMarkComplete?: (bookId: number) => void;
  onChangeStatus?: (bookId: number, status: Book['status']) => void;
  onAddBook?: (book: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>) => Promise<void>;
  onUpdateBook?: (bookId: number, updates: Partial<Book>) => Promise<void>;
  onDeleteBook?: (bookId: number) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  books,
  onUpdateProgress,
  onQuickUpdate,
  onMarkComplete,
  onChangeStatus,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  loading = false,
  className = ''
}) => {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isUpdatingBook, setIsUpdatingBook] = useState(false);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter books based on active filter and search query
  const filteredBooks = useMemo(() => {
    let filtered = books;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(book => book.status === activeFilter);
    }

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.notes && book.notes.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [books, activeFilter, debouncedSearchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setIsAddingBook(false);
  };

  const handleAddBook = async (bookData: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>) => {
    if (!onAddBook) return;
    
    try {
      setIsAddingBook(true);
      await onAddBook(bookData);
      handleCloseAddModal();
    } catch (error) {
      console.error('Failed to add book:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsAddingBook(false);
    }
  };

  const handleEditBook = (book: Book) => {
    setBookToEdit(book);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setBookToEdit(null);
    setIsUpdatingBook(false);
  };

  const handleUpdateBook = async (bookId: number, updates: Partial<Book>) => {
    if (!onUpdateBook) return;
    
    try {
      setIsUpdatingBook(true);
      await onUpdateBook(bookId, updates);
      handleCloseEditModal();
    } catch (error) {
      console.error('Failed to update book:', error);
      // Keep modal open on error so user can retry
    } finally {
      setIsUpdatingBook(false);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!onDeleteBook) return;
    
    try {
      await onDeleteBook(bookId);
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Books">📚</span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-primary">
                  Puka Reading Tracker
                </h1>
                {/* Streak Display - Mobile */}
                <div className="sm:hidden">
                  <StreakDisplay books={books} className="text-sm" />
                </div>
              </div>
            </div>
            
            {/* Search and Streak - Desktop */}
            <div className="hidden sm:flex items-center gap-4">
              <StreakDisplay books={books} />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 py-2 w-64 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search - Mobile */}
          <div className="sm:hidden pb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search books..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10 py-2 w-full border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs */}
        <FilterTabs
          books={books}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          className="mb-6"
        />

        {/* Search Results Info */}
        {debouncedSearchQuery && (
          <div className="mb-4 text-sm text-text-secondary">
            {filteredBooks.length === 0 ? (
              <span>No books found for "{debouncedSearchQuery}"</span>
            ) : (
              <span>
                {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found for "{debouncedSearchQuery}"
              </span>
            )}
          </div>
        )}

        {/* Book Grid */}
        <BookGrid
          books={filteredBooks}
          onUpdateProgress={onUpdateProgress}
          onQuickUpdate={onQuickUpdate}
          onMarkComplete={onMarkComplete}
          onChangeStatus={onChangeStatus}
          onEdit={handleEditBook}
          onDelete={handleDeleteBook}
          loading={loading}
          showQuickActions={true}
        />
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={handleOpenAddModal}
        ariaLabel="Add new book"
      />

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onAddBook={handleAddBook}
        loading={isAddingBook}
      />

      {/* Edit Book Modal */}
      <EditBookModal
        isOpen={isEditModalOpen}
        book={bookToEdit}
        onClose={handleCloseEditModal}
        onUpdateBook={handleUpdateBook}
        loading={isUpdatingBook}
      />
    </div>
  );
};

export default Dashboard;