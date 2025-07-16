import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { SyncStatusIndicator } from './sync';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './auth/AuthModal';

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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [selectedBookIndex, setSelectedBookIndex] = useState(-1);
  const [showBookSwitcher, setShowBookSwitcher] = useState(false);
  const [activeBookId, setActiveBookId] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  
  const { user, signOut, isAuthenticated } = useAuth();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bookSwitcherRef = useRef<HTMLDivElement>(null);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or modals are open
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        isAddModalOpen || 
        isEditModalOpen || 
        isExportModalOpen || 
        isImportModalOpen ||
        showKeyboardHelp
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      
      switch (e.key.toLowerCase()) {
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
          
        case 'a':
          if (isCtrl) {
            e.preventDefault();
            handleOpenAddModal();
          }
          break;
          
        case 'e':
          if (isCtrl && books.length > 0) {
            e.preventDefault();
            handleOpenExportModal();
          }
          break;
          
        case 'i':
          if (isCtrl) {
            e.preventDefault();
            handleOpenImportModal();
          }
          break;
          
        case 'escape':
          e.preventDefault();
          setSearchQuery('');
          setSelectedBookIndex(-1);
          break;
          
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
          
        case '1':
          e.preventDefault();
          setActiveFilter('all');
          break;
          
        case '2':
          e.preventDefault();
          setActiveFilter('want_to_read');
          break;
          
        case '3':
          e.preventDefault();
          setActiveFilter('currently_reading');
          break;
          
        case '4':
          e.preventDefault();
          setActiveFilter('finished');
          break;
          
        case 'arrowdown':
          e.preventDefault();
          setSelectedBookIndex(prev => 
            prev < filteredBooks.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'arrowup':
          e.preventDefault();
          setSelectedBookIndex(prev => 
            prev > 0 ? prev - 1 : filteredBooks.length - 1
          );
          break;
          
        case 'enter':
          if (selectedBookIndex >= 0 && selectedBookIndex < filteredBooks.length) {
            e.preventDefault();
            handleEditBook(filteredBooks[selectedBookIndex]);
          }
          break;
          
        case 'r':
          if (onMarkReadingDay) {
            e.preventDefault();
            onMarkReadingDay();
          }
          break;
          
        case 'b': {
          // Access current reading books directly from books state
          const currentReading = books.filter(book => book.status === 'currently_reading');
          if (currentReading.length > 1) {
            e.preventDefault();
            setShowBookSwitcher(!showBookSwitcher);
          }
          break;
        }
          
        case 'n': {
          if (isCtrl) {
            e.preventDefault();
            const currentReading = books.filter(book => book.status === 'currently_reading');
            if (currentReading.length > 1) {
              const currentIndex = currentReading.findIndex(book => book.id === activeBookId);
              const nextIndex = (currentIndex + 1) % currentReading.length;
              setActiveBookId(currentReading[nextIndex].id);
            }
          }
          break;
        }
          
        case 'p': {
          if (isCtrl) {
            e.preventDefault();
            const currentReading = books.filter(book => book.status === 'currently_reading');
            if (currentReading.length > 1) {
              const currentIndex = currentReading.findIndex(book => book.id === activeBookId);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentReading.length - 1;
              setActiveBookId(currentReading[prevIndex].id);
            }
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isAddModalOpen, 
    isEditModalOpen, 
    isExportModalOpen, 
    isImportModalOpen, 
    showKeyboardHelp,
    selectedBookIndex, 
    books,
    onMarkReadingDay,
    activeBookId,
    showBookSwitcher
  ]);

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

  // Get currently reading books
  const currentlyReadingBooks = useMemo(() => {
    return books.filter(book => book.status === 'currently_reading');
  }, [books]);

  // Close book switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bookSwitcherRef.current && !bookSwitcherRef.current.contains(event.target as Node)) {
        setShowBookSwitcher(false);
      }
    };

    if (showBookSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBookSwitcher]);

  // Set initial active book (most recently modified currently reading book)
  useEffect(() => {
    if (currentlyReadingBooks.length > 0 && activeBookId === null) {
      const mostRecent = currentlyReadingBooks.reduce((latest, book) => 
        book.dateModified && (!latest.dateModified || book.dateModified > latest.dateModified) ? book : latest
      );
      setActiveBookId(mostRecent.id);
    }
  }, [currentlyReadingBooks, activeBookId]);

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

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
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
              
              {/* Quick Book Switcher - Show when multiple books are being read */}
              {currentlyReadingBooks.length > 1 && (
                <div className="relative ml-4" ref={bookSwitcherRef}>
                  <button
                    onClick={() => setShowBookSwitcher(!showBookSwitcher)}
                    className="flex items-center gap-2 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm"
                    title={`Switch between ${currentlyReadingBooks.length} currently reading books (Press B)`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="max-w-24 sm:max-w-32 truncate">
                      {currentlyReadingBooks.find(book => book.id === activeBookId)?.title || 'Switch Book'}
                    </span>
                    <span className="text-xs opacity-75 hidden sm:inline">
                      {currentlyReadingBooks.findIndex(book => book.id === activeBookId) + 1}/{currentlyReadingBooks.length}
                    </span>
                  </button>
                  
                  {showBookSwitcher && (
                    <div className="absolute top-full left-0 mt-2 bg-surface border border-border rounded-lg shadow-lg py-2 z-50 min-w-64 max-w-sm">
                      <div className="px-3 py-2 text-xs font-medium text-text-secondary border-b border-border">
                        Currently Reading ({currentlyReadingBooks.length})
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {currentlyReadingBooks.map((book) => (
                          <button
                            key={book.id}
                            onClick={() => {
                              setActiveBookId(book.id);
                              setShowBookSwitcher(false);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-background transition-colors ${
                              book.id === activeBookId ? 'bg-primary/10 border-r-2 border-primary' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-text-primary truncate text-sm">
                                  {book.title}
                                </div>
                                <div className="text-xs text-text-secondary truncate">
                                  {book.author}
                                </div>
                              </div>
                              <div className="ml-2 flex items-center gap-2">
                                <div className="text-xs text-text-secondary">
                                  {book.progress}%
                                </div>
                                <div className="w-2 h-2 bg-primary rounded-full" style={{ opacity: book.progress / 100 }} />
                                {book.id === activeBookId && (
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="px-3 py-2 text-xs text-text-secondary border-t border-border">
                        <div className="flex justify-between items-center">
                          <span>Shortcuts:</span>
                          <div className="flex gap-2">
                            <kbd className="px-1 py-0.5 bg-background rounded text-xs">B</kbd>
                            <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+N</kbd>
                            <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+P</kbd>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Search, Import, Export - Desktop */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search books... (Press / to focus)"
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
              
              {/* Authentication Buttons */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary hidden lg:inline">
                    Welcome, {user?.name || user?.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-border text-text-primary border border-border rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden lg:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAuthModal('signin')}
                    className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-border text-text-primary border border-border rounded-lg transition-colors"
                    title="Sign in"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden lg:inline">Sign In</span>
                  </button>
                  <button
                    onClick={() => handleOpenAuthModal('signup')}
                    className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                    title="Sign up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="hidden lg:inline">Sign Up</span>
                  </button>
                </div>
              )}
              
              {/* Sync Status Indicator */}
              <SyncStatusIndicator showDetails={false} />
            </div>
          </div>

          {/* Search - Mobile (Simplified) */}
          <div className="sm:hidden pb-3">
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
          
          {/* Import and Export - Mobile (Moved to main content) */}
          <div className="sm:hidden pb-3">
            <div className="flex gap-2">
              <button
                onClick={handleOpenImportModal}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-surface hover:bg-border text-text-primary border border-border rounded-md transition-colors text-sm"
                title="Import books from CSV"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                </svg>
                <span>Import</span>
              </button>
              <button
                onClick={handleOpenExportModal}
                disabled={books.length === 0}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-surface hover:bg-border text-text-primary border border-border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Export your library"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          selectedIndex={selectedBookIndex}
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

      {/* Keyboard Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-text-primary mb-2">Navigation</h4>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">?</kbd></span>
                      <span>Show this help</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">/</kbd></span>
                      <span>Focus search</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Esc</kbd></span>
                      <span>Clear search</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">↑</kbd> <kbd className="px-2 py-1 bg-background rounded">↓</kbd></span>
                      <span>Navigate books</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Enter</kbd></span>
                      <span>Edit selected book</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-2">Actions</h4>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Ctrl+A</kbd></span>
                      <span>Add new book</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Ctrl+E</kbd></span>
                      <span>Export books</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Ctrl+I</kbd></span>
                      <span>Import books</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">R</kbd></span>
                      <span>Mark reading day</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-2">Book Switching</h4>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">B</kbd></span>
                      <span>Toggle book switcher</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Ctrl+N</kbd></span>
                      <span>Next reading book</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">Ctrl+P</kbd></span>
                      <span>Previous reading book</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-2">Filters</h4>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">1</kbd></span>
                      <span>All books</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">2</kbd></span>
                      <span>Want to Read</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">3</kbd></span>
                      <span>Currently Reading</span>
                    </div>
                    <div className="flex justify-between">
                      <span><kbd className="px-2 py-1 bg-background rounded">4</kbd></span>
                      <span>Finished</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-text-secondary">
                  Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">?</kbd> anytime to show this help
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        defaultTab={authModalMode}
      />

      {/* Keyboard Help Button - Desktop only */}
      <button
        onClick={() => setShowKeyboardHelp(true)}
        className="hidden sm:block fixed bottom-20 right-4 bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-primary rounded-full p-2 shadow-lg transition-colors z-40"
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
};

export default Dashboard;