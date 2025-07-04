import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, AuthPrompt, useOptionalAuth } from './components/auth';
import { useStorage } from './hooks/useStorage';
import { useToast } from './hooks/useToast';
import { Book } from './types';
import { ExportData, ImportResult } from './services/storage/StorageService';

function AppContent() {
  const {
    books,
    streakHistory,
    loading,
    error,
    updateProgress,
    markComplete,
    changeStatus,
    addBook,
    updateBook,
    deleteBook,
    getExportData,
    markReadingDay,
    refresh
  } = useStorage();

  const [exportData, setExportData] = useState<ExportData | null>(null);
  const { setHasLocalData } = useOptionalAuth();
  const { toasts, removeToast, success, error: showError, info } = useToast();

  // Detect when user has local data for auth prompt
  useEffect(() => {
    if (!loading && books.length > 0) {
      setHasLocalData(true);
    } else if (!loading && books.length === 0) {
      setHasLocalData(false);
    }
  }, [books.length, loading, setHasLocalData]);

  // Fetch export data when books change
  useEffect(() => {
    const fetchExportData = async () => {
      if (!loading && books.length > 0) {
        const data = await getExportData();
        setExportData(data);
      }
    };
    
    fetchExportData();
  }, [books, loading, getExportData]);

  const handleUpdateProgress = async (bookId: number, progress: number) => {
    try {
      await updateProgress(bookId, progress);
      
      const book = books.find(b => b.id === bookId);
      if (book && progress === 100) {
        success(`Finished reading "${book.title}"! 🎉`, {
          title: 'Book Completed',
          duration: 6000
        });
      }
    } catch (error) {
      showError('Failed to update progress. Please try again.');
    }
  };

  const handleQuickUpdate = async (bookId: number, increment: number) => {
    try {
      console.log(`Quick update book ${bookId} by ${increment}%`);
      
      const book = books.find(b => b.id === bookId);
      if (book) {
        const newProgress = Math.min(100, Math.max(0, book.progress + increment));
        await updateProgress(bookId, newProgress);
        
        if (newProgress === 100) {
          success(`Finished reading "${book.title}"! 🎉`, {
            title: 'Book Completed',
            duration: 6000
          });
        } else {
          info(`Progress updated to ${newProgress}%`);
        }
      }
    } catch (error) {
      showError('Failed to update progress. Please try again.');
    }
  };

  const handleMarkComplete = async (bookId: number) => {
    try {
      console.log(`Marking book ${bookId} as complete`);
      const book = books.find(b => b.id === bookId);
      await markComplete(bookId);
      
      if (book) {
        success(`Finished reading "${book.title}"! 🎉`, {
          title: 'Book Completed',
          duration: 6000
        });
      }
    } catch (error) {
      showError('Failed to mark book as complete. Please try again.');
    }
  };

  const handleChangeStatus = async (bookId: number, status: Book['status']) => {
    try {
      console.log(`Changing book ${bookId} status to ${status}`);
      await changeStatus(bookId, status);
      
      const statusMessages = {
        'want_to_read': 'Added to your reading list',
        'currently_reading': 'Started reading',
        'finished': 'Marked as finished'
      };
      
      info(statusMessages[status]);
    } catch (error) {
      showError('Failed to change book status. Please try again.');
    }
  };

  const handleAddBook = async (bookData: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>) => {
    try {
      console.log('Adding new book:', bookData.title);
      await addBook(bookData);
      success(`"${bookData.title}" added to your library!`, {
        title: 'Book Added',
        duration: 4000
      });
    } catch (error) {
      showError('Failed to add book. Please try again.');
      throw error; // Re-throw so the modal stays open
    }
  };

  const handleUpdateBook = async (bookId: number, updates: Partial<Book>) => {
    try {
      console.log(`Updating book ${bookId}:`, updates);
      await updateBook(bookId, updates);
      
      const updatedBook = books.find(b => b.id === bookId);
      if (updatedBook) {
        success(`"${updates.title || updatedBook.title}" updated successfully!`, {
          title: 'Book Updated',
          duration: 3000
        });
      }
    } catch (error) {
      showError('Failed to update book. Please try again.');
      throw error; // Re-throw so the modal stays open
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      console.log(`Deleting book ${bookId}`);
      const book = books.find(b => b.id === bookId);
      await deleteBook(bookId);
      
      if (book) {
        success(`"${book.title}" removed from your library`, {
          title: 'Book Deleted',
          duration: 3000
        });
      }
    } catch (error) {
      showError('Failed to delete book. Please try again.');
    }
  };

  const handleImportComplete = async (result: ImportResult) => {
    try {
      console.log('Import completed, refreshing data...', result);
      // Refresh the books data from storage
      await refresh();
      
      // Process streak history from imported books
      if (result.imported > 0) {
        const { createStreakHistoryFromBooks, processStreakImport } = await import('./utils/streakCalculator');
        const { createStorageService } = await import('./services/storage');
        
        const storageService = createStorageService();
        await storageService.initialize();
        
        // Get all books including newly imported ones
        const allBooks = await storageService.getBooks();
        const existingStreakHistory = await storageService.getStreakHistory();
        
        // Get only the imported books (assumes last N books are the imported ones)
        const importedBooks = allBooks.slice(-result.imported);
        const booksWithReadingPeriods = importedBooks.filter(book => 
          book.dateStarted && book.dateFinished
        );
        
        if (booksWithReadingPeriods.length > 0) {
          console.log(`Processing streak history for ${booksWithReadingPeriods.length} books with reading periods`);
          
          // Create or update streak history
          let updatedHistory;
          if (existingStreakHistory) {
            // Process import with existing history
            const streakResult = processStreakImport(
              booksWithReadingPeriods, 
              allBooks.slice(0, -result.imported), // existing books
              existingStreakHistory
            );
            console.log('Streak import result:', streakResult);
            
            // Create updated history from the result
            const { extractReadingPeriods, generateReadingDays } = await import('./utils/readingPeriodExtractor');
            const importedPeriods = extractReadingPeriods(booksWithReadingPeriods);
            const importedReadingDays = generateReadingDays(importedPeriods);
            
            updatedHistory = {
              readingDays: new Set([
                ...(existingStreakHistory.readingDays || []),
                ...importedReadingDays
              ]),
              bookPeriods: [
                ...(existingStreakHistory.bookPeriods || []),
                ...importedPeriods
              ],
              lastCalculated: new Date()
            };
            
            result.streakResult = streakResult;
          } else {
            // Create new streak history from all books
            updatedHistory = createStreakHistoryFromBooks(allBooks);
            console.log('Created new streak history with', updatedHistory.readingDays.size, 'reading days');
          }
          
          // Save the updated streak history
          await storageService.saveStreakHistory(updatedHistory);
          console.log('Streak history saved successfully');
          
          // Refresh the data again to load the new streak history
          await refresh();
        }
      }
      
      // Create success message with streak information
      let message = `Successfully imported ${result.imported} books!`;
      if (result.streakResult && result.streakResult.daysAdded > 0) {
        message += ` Added ${result.streakResult.daysAdded} reading days to your streak history.`;
      }
      
      success(message, {
        title: 'Import Complete',
        duration: result.streakResult ? 8000 : 5000 // Longer duration if streak info
      });

      // Show additional streak notification if there were significant changes
      if (result.streakResult && 
          (result.streakResult.newCurrentStreak !== result.streakResult.oldCurrentStreak ||
           result.streakResult.newLongestStreak !== result.streakResult.oldLongestStreak)) {
        
        setTimeout(() => {
          info('📈 Your reading streaks have been updated! Check your dashboard for the new counts.', {
            title: 'Streak Updated',
            duration: 6000
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to refresh data after import:', error);
      showError('Import completed but failed to refresh data. Please reload the page.');
    }
  };

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-text-secondary mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Dashboard
        books={books}
        streakHistory={streakHistory || undefined}
        exportData={exportData || undefined}
        onUpdateProgress={handleUpdateProgress}
        onQuickUpdate={handleQuickUpdate}
        onMarkComplete={handleMarkComplete}
        onChangeStatus={handleChangeStatus}
        onAddBook={handleAddBook}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
        onImportComplete={handleImportComplete}
        onMarkReadingDay={markReadingDay}
        onStreakUpdate={refresh}
        loading={loading}
      />
      
      {/* Progressive Auth Prompt */}
      <AuthPrompt />
      
      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
        position="top-right"
        maxToasts={5}
      />
    </ErrorBoundary>
  );
}

// Main App component wrapped with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App