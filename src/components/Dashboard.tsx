import React, { useState, useMemo, useEffect } from 'react';
import { Book, StatusFilter, StreakHistory } from '@/types';
import { ExportData, ImportResult } from '@/services/storage/StorageService';
import BookGrid from './books/BookGrid';
import FilterTabs from './FilterTabs';
import FloatingActionButton from './FloatingActionButton';
import AddBookModal from './modals/AddBookModal';
import EditBookModal from './modals/EditBookModal';
import ExportModal from './modals/ExportModal';
import ImportModal from './modals/ImportModal';
import StreakDisplay from './StreakDisplay';

interface DashboardProps {
  books: Book[];
  streakHistory?: StreakHistory;
  exportData?: ExportData;
  onUpdateProgress?: (bookId: number, progress: number) => void;
  onQuickUpdate?: (bookId: number, increment: number) => void;
  onMarkComplete?: (bookId: number) => void;
  onChangeStatus?: (bookId: number, status: Book['status']) => void;
  onAddBook?: (book: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>) => Promise<void>;
  onUpdateBook?: (bookId: number, updates: Partial<Book>) => Promise<void>;
  onDeleteBook?: (bookId: number) => Promise<void>;
  onImportComplete?: (result: ImportResult) => void;
  onMarkReadingDay?: () => Promise<boolean>;
  onStreakUpdate?: () => void;
  loading?: boolean;
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  books,
  streakHistory,
  exportData,
  onUpdateProgress,
  onQuickUpdate,
  onMarkComplete,
  onChangeStatus,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onImportComplete,
  onMarkReadingDay,
  onStreakUpdate,
  loading = false,
  className = ''
}) => {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('currently_reading');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isUpdatingBook, setIsUpdatingBook] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  const handleCloseExportModal = () => {
    setIsExportModalOpen(false);
  };

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
  };

  const handleImportComplete = (result: ImportResult) => {
    setIsImportModalOpen(false);
    if (onImportComplete) {
      onImportComplete(result);
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
              <h1 className="text-xl sm:text-2xl font-bold text-primary">
                Puka Reading Tracker
              </h1>
            </div>
            
            {/* Search, Import, Export - Desktop (moved streak out) */}
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
              <button
                onClick={handleOpenImportModal}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-border text-text-primary border border-border rounded-lg transition-colors"
                title="Import books from CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                </svg>
                <span className="hidden lg:inline">Import</span>
              </button>
              <button
                onClick={handleOpenExportModal}
                disabled={books.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-border text-text-primary border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export your library"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden lg:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Search, Import and Export - Mobile */}
          <div className="sm:hidden pb-4 space-y-3">
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
            
            {/* Import and Export Buttons - Mobile */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleOpenImportModal}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-surface hover:bg-border text-text-primary border border-border rounded-lg transition-colors"
                title="Import books from CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                </svg>
                <span>Import</span>
              </button>
              <button
                onClick={handleOpenExportModal}
                disabled={books.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-surface hover:bg-border text-text-primary border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export your library"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Prominent Streak Card */}
        <div className="mb-6">
          <StreakDisplay 
            books={books} 
            streakHistory={streakHistory}
            onMarkReadingDay={onMarkReadingDay}
            onStreakUpdate={onStreakUpdate}
            showDetails={true}
            compact={false}
            className="shadow-lg"
          />
        </div>

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

      {/* Export Modal */}
      {exportData && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={handleCloseExportModal}
          books={books}
          exportData={exportData}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={handleCloseImportModal}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default Dashboard;