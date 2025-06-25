import BookCard from './components/books/BookCard'
import { Book } from './types'

const sampleBooks: Book[] = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    status: "currently_reading",
    progress: 65,
    dateAdded: new Date(),
    totalPages: 288,
    currentPage: 187
  },
  {
    id: 2,
    title: "Project Hail Mary",
    author: "Andy Weir",
    status: "want_to_read",
    progress: 0,
    dateAdded: new Date()
  },
  {
    id: 3,
    title: "Atomic Habits",
    author: "James Clear",
    status: "finished",
    progress: 100,
    dateAdded: new Date(),
    dateFinished: new Date()
  }
];

function App() {
  const handleUpdateProgress = (bookId: number, progress: number) => {
    console.log(`Updating book ${bookId} progress to ${progress}%`);
  };

  const handleQuickUpdate = (bookId: number, increment: number) => {
    console.log(`Quick update book ${bookId} by ${increment}%`);
  };

  const handleMarkComplete = (bookId: number) => {
    console.log(`Marking book ${bookId} as complete`);
  };

  const handleChangeStatus = (bookId: number, status: Book['status']) => {
    console.log(`Changing book ${bookId} status to ${status}`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-6">Puka Reading Tracker</h1>
        <div className="space-y-4">
          {sampleBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onUpdateProgress={handleUpdateProgress}
              onQuickUpdate={handleQuickUpdate}
              onMarkComplete={handleMarkComplete}
              onChangeStatus={handleChangeStatus}
              showQuickActions={true}
              interactive={true}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default App