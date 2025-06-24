import { useState, useEffect } from 'react';
import { 
  Button, 
  StreakCard, 
  BookCard, 
  CurrentlyReading, 
  AddBookModal 
} from './components';
import type { Book, StatusFilter } from './types';
import { storageService } from './services';

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentFilter, setCurrentFilter] = useState<StatusFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await storageService.load();
      setBooks(data.books);
    } catch (error) {
      console.error('Failed to load data:', error);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (updatedBooks: Book[]) => {
    try {
      const data = await storageService.load();
      await storageService.save({
        ...data,
        books: updatedBooks,
      });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const filteredBooks = currentFilter === 'all' 
    ? books 
    : books.filter(book => book.status === currentFilter);

  const currentlyReadingBook = books.find(book => book.status === 'reading');

  const bookCounts = {
    all: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    finished: books.filter(b => b.status === 'finished').length,
    'want-to-read': books.filter(b => b.status === 'want-to-read').length
  };

  const handleAddBook = async (bookData: Omit<Book, 'id'>) => {
    const newBook: Book = {
      ...bookData,
      id: Date.now(),
    };
    const updatedBooks = [...books, newBook];
    setBooks(updatedBooks);
    await saveData(updatedBooks);
  };

  const handleUpdateProgress = async (bookId: number) => {
    const newProgress = prompt('Enter new progress percentage (0-100):');
    if (newProgress !== null && !isNaN(Number(newProgress))) {
      const progressValue = Math.min(Math.max(parseInt(newProgress), 0), 100);
      const updatedBooks = books.map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, progress: progressValue };
          if (progressValue === 100 && book.status !== 'finished') {
            updatedBook.status = 'finished';
            updatedBook.finishDate = new Date().toISOString().split('T')[0];
          }
          return updatedBook;
        }
        return book;
      });
      setBooks(updatedBooks);
      await saveData(updatedBooks);
    }
  };

  const filterButtons = [
    { key: 'all' as StatusFilter, label: 'All', count: bookCounts.all },
    { key: 'reading' as StatusFilter, label: 'Reading', count: bookCounts.reading },
    { key: 'finished' as StatusFilter, label: 'Completed', count: bookCounts.finished },
    { key: 'want-to-read' as StatusFilter, label: 'Want to Read', count: bookCounts['want-to-read'] }
  ];

  const streak = 3; // Placeholder - will be calculated from data

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">My Reading</h1>
          <Button onClick={() => setIsAddModalOpen(true)}>
            + Add book
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Streak Card */}
          <StreakCard streak={streak} />

          {/* Currently Reading */}
          <CurrentlyReading 
            book={currentlyReadingBook} 
            onUpdateProgress={handleUpdateProgress}
          />

          {/* Navigation Tabs */}
          <div className="flex gap-8 border-b border-gray-200">
            <button className="pb-3 px-1 border-b-2 border-primary text-primary font-semibold">
              Library
            </button>
            <button className="pb-3 px-1 border-b-2 border-transparent text-gray-500 font-semibold hover:text-gray-700">
              Statistics
            </button>
            <button className="pb-3 px-1 border-b-2 border-transparent text-gray-500 font-semibold hover:text-gray-700">
              Wishlist
            </button>
          </div>

          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {filterButtons.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setCurrentFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    currentFilter === filter.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} {filter.count}
                </button>
              ))}
            </div>
            <button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              📥 Import
            </button>
          </div>

          {/* Book Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                {currentFilter === 'all' ? 'No books yet' : `No ${currentFilter.replace('-', ' ')} books`}
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                Add your first book
              </Button>
            </div>
          )}
        </div>

        {/* Add Book Modal */}
        <AddBookModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddBook}
        />
      </div>
    </div>
  );
}

export default App;
