import { useState, useEffect } from 'react';
import { 
  Button, 
  StreakCard, 
  BookCard, 
  CurrentlyReading, 
  AddBookModal 
} from './components';
import type { Book, StatusFilter, ReadingData } from './types';
import { storageService } from './services';

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [readingData, setReadingData] = useState<ReadingData | null>(null);
  const [currentFilter, setCurrentFilter] = useState<StatusFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const data = await storageService.load();
      setReadingData(data);
      setBooks(data.books);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load your reading data. You can still add books, and we\'ll help you set up storage.');
      setBooks([]);
      // Create default data with sample books if none exists
      const defaultData = {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        books: [
          {
            id: 1,
            title: "The Midnight Library",
            author: "Matt Haig",
            progress: 65,
            status: "reading" as const,
            startDate: "2024-06-15",
            notes: "Fascinating exploration of parallel lives and choices"
          },
          {
            id: 2,
            title: "Project Hail Mary", 
            author: "Andy Weir",
            progress: 100,
            status: "finished" as const,
            startDate: "2024-05-01",
            finishDate: "2024-05-20",
            notes: "Incredible sci-fi thriller with humor and heart"
          },
          {
            id: 3,
            title: "The Seven Husbands of Evelyn Hugo",
            author: "Taylor Jenkins Reid",
            progress: 0,
            status: "want-to-read" as const,
            notes: "Highly recommended by friends"
          },
          {
            id: 4,
            title: "Atomic Habits",
            author: "James Clear",
            progress: 100,
            status: "finished" as const,
            startDate: "2024-04-10",
            finishDate: "2024-04-25",
            notes: "Life-changing book about building better habits"
          },
          {
            id: 5,
            title: "The Silent Patient",
            author: "Alex Michaelides",
            progress: 0,
            status: "want-to-read" as const,
            notes: "Psychological thriller"
          }
        ],
        streaks: { current: 3, longest: 7, lastUpdate: new Date().toISOString() },
        settings: { theme: 'light' as const, notifications: true }
      };
      setReadingData(defaultData);
      setBooks(defaultData.books);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (updatedBooks: Book[], updateStreaks = false) => {
    try {
      if (!readingData) return;
      
      let updatedStreaks = readingData.streaks;
      
      if (updateStreaks) {
        updatedStreaks = calculateStreak(updatedBooks, readingData.streaks);
      }
      
      const updatedData = {
        ...readingData,
        books: updatedBooks,
        streaks: updatedStreaks,
        lastModified: new Date().toISOString(),
      };
      
      await storageService.save(updatedData);
      setReadingData(updatedData);
      setError(null);
    } catch (error) {
      console.error('Failed to save data:', error);
      setError('Failed to save changes. Your changes are preserved locally.');
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
      // Auto-set dates based on status
      startDate: bookData.status === 'reading' && !bookData.startDate 
        ? new Date().toISOString().split('T')[0] 
        : bookData.startDate,
      finishDate: bookData.status === 'finished' && !bookData.finishDate 
        ? new Date().toISOString().split('T')[0] 
        : bookData.finishDate,
    };
    
    // Auto-adjust status based on progress
    if (newBook.progress === 0) {
      newBook.status = 'want-to-read';
    } else if (newBook.progress === 100) {
      newBook.status = 'finished';
      if (!newBook.finishDate) {
        newBook.finishDate = new Date().toISOString().split('T')[0];
      }
    } else if (newBook.progress > 0 && newBook.progress < 100) {
      newBook.status = 'reading';
      if (!newBook.startDate) {
        newBook.startDate = new Date().toISOString().split('T')[0];
      }
    }
    
    const updatedBooks = [...books, newBook];
    setBooks(updatedBooks);
    await saveData(updatedBooks, true);
  };

  const handleUpdateProgress = async (bookId: number) => {
    const newProgress = prompt('Enter new progress percentage (0-100):');
    if (newProgress !== null && !isNaN(Number(newProgress))) {
      const progressValue = Math.min(Math.max(parseInt(newProgress), 0), 100);
      const updatedBooks = books.map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, progress: progressValue };
          
          // Auto-update status based on progress
          if (progressValue === 0) {
            updatedBook.status = 'want-to-read';
            updatedBook.startDate = undefined;
            updatedBook.finishDate = undefined;
          } else if (progressValue === 100) {
            updatedBook.status = 'finished';
            if (!updatedBook.finishDate) {
              updatedBook.finishDate = new Date().toISOString().split('T')[0];
            }
          } else {
            updatedBook.status = 'reading';
            if (!updatedBook.startDate) {
              updatedBook.startDate = new Date().toISOString().split('T')[0];
            }
            updatedBook.finishDate = undefined;
          }
          
          return updatedBook;
        }
        return book;
      });
      setBooks(updatedBooks);
      await saveData(updatedBooks, true); // Update streaks when progress changes
    }
  };

  const filterButtons = [
    { key: 'all' as StatusFilter, label: 'All', count: bookCounts.all },
    { key: 'reading' as StatusFilter, label: 'Reading', count: bookCounts.reading },
    { key: 'finished' as StatusFilter, label: 'Completed', count: bookCounts.finished },
    { key: 'want-to-read' as StatusFilter, label: 'Want to Read', count: bookCounts['want-to-read'] }
  ];

  // Calculate current streak from reading data
  const calculateStreak = (booksData: Book[], currentStreaks: any) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if there was any progress update in the last 24 hours
    const hasRecentProgress = booksData.some(book => {
      const lastModified = readingData?.lastModified;
      if (!lastModified) return false;
      
      const lastUpdate = new Date(lastModified);
      const timeDiff = today.getTime() - lastUpdate.getTime();
      return timeDiff < 24 * 60 * 60 * 1000; // 24 hours
    });
    
    let newStreak = currentStreaks.current;
    
    if (hasRecentProgress) {
      // Check if we need to increment the streak
      const lastUpdate = new Date(currentStreaks.lastUpdate);
      const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysSinceUpdate >= 1) {
        newStreak = currentStreaks.current + 1;
      }
    } else {
      // Check if we need to reset the streak
      const lastUpdate = new Date(currentStreaks.lastUpdate);
      const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysSinceUpdate > 1) {
        newStreak = 0;
      }
    }
    
    return {
      current: newStreak,
      longest: Math.max(newStreak, currentStreaks.longest),
      lastUpdate: hasRecentProgress ? today.toISOString() : currentStreaks.lastUpdate,
    };
  };
  
  const currentStreak = readingData?.streaks.current || 0;

  const handleImportData = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.csv';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const text = await file.text();
        const format = file.name.endsWith('.csv') ? 'csv' : 'json';
        
        await storageService.import(text, format);
        await loadData();
      };
      
      input.click();
    } catch (error) {
      console.error('Import failed:', error);
      setError('Failed to import data. Please check your file format.');
    }
  };

  const handleExportData = async () => {
    try {
      const format = confirm('Export as JSON? (Cancel for CSV)') ? 'json' : 'csv';
      const data = await storageService.export(format);
      
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `puka-reading-data.${format}`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    }
  };

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
          {/* Error Message */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-yellow-400 mr-3">⚠️</div>
                <div className="text-sm text-yellow-800">{error}</div>
              </div>
            </div>
          )}
          
          {/* Streak Card */}
          <StreakCard streak={currentStreak} />

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
            <div className="flex gap-2">
              <button 
                onClick={() => handleImportData()}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                📥 Import
              </button>
              <button 
                onClick={() => handleExportData()}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                📤 Export
              </button>
            </div>
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
