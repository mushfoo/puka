import React, { useState, useMemo } from 'react';
import { Book, StatusFilter } from '@/types';
import BookGrid from './books/BookGrid';
import FilterTabs from './FilterTabs';
import FloatingActionButton from './FloatingActionButton';

interface DashboardProps {
  books: Book[];
  onUpdateProgress?: (bookId: number, progress: number) => void;
  onQuickUpdate?: (bookId: number, increment: number) => void;
  onMarkComplete?: (bookId: number) => void;
  onChangeStatus?: (bookId: number, status: Book['status']) => void;
  onAddBook?: () => void;
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
  loading = false,
  className = ''
}) => {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter books based on active filter and search query
  const filteredBooks = useMemo(() => {
    let filtered = books;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(book => book.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.notes && book.notes.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [books, activeFilter, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Books">📚</span>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">
                Puka Reading Tracker
              </h1>
            </div>
            
            {/* Search - Desktop */}
            <div className="hidden sm:flex items-center gap-4">
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
        {searchQuery && (
          <div className="mb-4 text-sm text-text-secondary">
            {filteredBooks.length === 0 ? (
              <span>No books found for "{searchQuery}"</span>
            ) : (
              <span>
                {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found for "{searchQuery}"
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
          loading={loading}
          showQuickActions={true}
        />
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={onAddBook}
        ariaLabel="Add new book"
      />
    </div>
  );
};

export default Dashboard;