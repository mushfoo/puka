import Dashboard from './components/Dashboard';
import { useStorage } from './hooks/useStorage';
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

  const handleUpdateProgress = async (bookId: number, progress: number) => {
    console.log(`Updating book ${bookId} progress to ${progress}%`);
    await updateProgress(bookId, progress);
  };

  const handleQuickUpdate = async (bookId: number, increment: number) => {
    console.log(`Quick update book ${bookId} by ${increment}%`);
    
    const book = books.find(b => b.id === bookId);
    if (book) {
      const newProgress = Math.min(100, Math.max(0, book.progress + increment));
      await updateProgress(bookId, newProgress);
    }
  };

  const handleMarkComplete = async (bookId: number) => {
    console.log(`Marking book ${bookId} as complete`);
    await markComplete(bookId);
  };

  const handleChangeStatus = async (bookId: number, status: Book['status']) => {
    console.log(`Changing book ${bookId} status to ${status}`);
    await changeStatus(bookId, status);
  };

  const handleAddBook = async () => {
    console.log('Add book clicked');
    
    // Demo: Add a sample book for testing
    const sampleBook = {
      title: "New Book " + Date.now(),
      author: "Demo Author",
      status: 'want_to_read' as const,
      progress: 0,
      notes: "Added via FAB button"
    };
    
    await addBook(sampleBook);
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
    <Dashboard
      books={books}
      onUpdateProgress={handleUpdateProgress}
      onQuickUpdate={handleQuickUpdate}
      onMarkComplete={handleMarkComplete}
      onChangeStatus={handleChangeStatus}
      onAddBook={handleAddBook}
      loading={loading}
    />
  );
}

export default App