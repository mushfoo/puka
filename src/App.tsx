import Dashboard from './components/Dashboard';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import { useStorage } from './hooks/useStorage';
import { useToast } from './hooks/useToast';
import { Book } from './types';

function App() {
  const {
    books,
    loading,
    error,
    updateProgress,
    markComplete,
    changeStatus,
    addBook
  } = useStorage();

  const { toasts, removeToast, success, error: showError, info } = useToast();

  const handleUpdateProgress = async (bookId: number, progress: number) => {
    try {
      console.log(`Updating book ${bookId} progress to ${progress}%`);
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
        onUpdateProgress={handleUpdateProgress}
        onQuickUpdate={handleQuickUpdate}
        onMarkComplete={handleMarkComplete}
        onChangeStatus={handleChangeStatus}
        onAddBook={handleAddBook}
        loading={loading}
      />
      
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

export default App