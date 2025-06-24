import React, { useState, useEffect } from 'react';

// Styles object (keeping the same styles but as JS object)
const styles = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f8f9fa',
    color: '#1a1a1a',
    minHeight: '100vh',
    padding: 0,
    margin: 0,
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    background: '#ffffff',
    minHeight: '100vh',
    position: 'relative',
  },
  mainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 24px 16px',
    borderBottom: '1px solid #e9ecef',
  },
  mainTitle: {
    fontSize: '1.5em',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
  },
  addBookBtn: {
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  content: {
    padding: '24px',
  },
  streakCard: {
    background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  streakIcon: {
    fontSize: '2em',
  },
  streakText: {},
  streakTitle: {
    fontSize: '1.25em',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '4px',
    margin: 0,
  },
  streakSubtitle: {
    color: '#6b7280',
    fontSize: '0.9em',
    margin: 0,
  },
  streakStatus: {
    background: '#dcfce7',
    color: '#166534',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '0.8em',
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: '1.1em',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '16px',
  },
  currentReadingCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  bookCover: {
    width: '80px',
    height: '120px',
    background: '#e5e7eb',
    borderRadius: '8px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8em',
    color: '#6b7280',
  },
  currentBookInfo: {
    flex: 1,
  },
  currentBookTitle: {
    fontSize: '1.1em',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '4px',
    margin: 0,
  },
  currentBookAuthor: {
    color: '#6b7280',
    marginBottom: '16px',
    fontSize: '0.9em',
  },
  progressSection: {},
  progressSectionTitle: {
    fontSize: '0.9em',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '8px',
    margin: 0,
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#8b5cf6',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.85em',
    color: '#6b7280',
    marginBottom: '12px',
  },
  updateProgressBtn: {
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85em',
    fontWeight: 600,
    cursor: 'pointer',
  },
  navTabs: {
    display: 'flex',
    gap: '32px',
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  navTab: {
    background: 'none',
    border: 'none',
    padding: '12px 0',
    fontSize: '0.95em',
    fontWeight: 600,
    color: '#6b7280',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  navTabActive: {
    color: '#8b5cf6',
    borderBottomColor: '#8b5cf6',
  },
  filterSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  statusFilters: {
    display: 'flex',
    gap: '8px',
  },
  statusFilter: {
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85em',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statusFilterActive: {
    background: '#8b5cf6',
    color: 'white',
    borderColor: '#8b5cf6',
  },
  filterBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85em',
    color: '#6b7280',
    cursor: 'pointer',
  },
  bookGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  },
  bookCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  bookCardCover: {
    width: '100%',
    height: '200px',
    background: '#e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8em',
    color: '#6b7280',
  },
  bookCardTitle: {
    fontSize: '0.9em',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '4px',
    lineHeight: 1.3,
  },
  bookCardAuthor: {
    fontSize: '0.8em',
    color: '#6b7280',
    marginBottom: '12px',
  },
  bookCardStatus: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.7em',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '1.5em',
    fontWeight: 700,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#6b7280',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500,
    color: '#374151',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    color: '#1a1a1a',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  btn: {
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  btnSecondary: {
    background: '#6b7280',
    color: 'white',
  },
};

// Status badge styles
const getStatusStyle = (status) => {
  const baseStyle = styles.bookCardStatus;
  switch (status) {
    case 'reading':
      return { ...baseStyle, background: '#ddd6fe', color: '#7c3aed' };
    case 'finished':
      return { ...baseStyle, background: '#dcfce7', color: '#166534' };
    case 'want-to-read':
      return { ...baseStyle, background: '#dbeafe', color: '#1e40af' };
    default:
      return baseStyle;
  }
};

// Book Card Component
const BookCard = ({ book }) => {
  const statusText = book.status === 'want-to-read' ? 'Want to Read' : 
                    book.status === 'reading' ? 'Reading' : 'Completed';

  return (
    <div style={styles.bookCard}>
      <div style={styles.bookCardCover}>📖</div>
      <div style={styles.bookCardTitle}>{book.title}</div>
      <div style={styles.bookCardAuthor}>{book.author}</div>
      <div style={getStatusStyle(book.status)}>
        {statusText}
      </div>
    </div>
  );
};

// Streak Card Component
const StreakCard = ({ streak }) => (
  <div style={styles.streakCard}>
    <div style={styles.streakInfo}>
      <div style={styles.streakIcon}>🔥</div>
      <div style={styles.streakText}>
        <h3 style={styles.streakTitle}>{streak} Day Streak!</h3>
        <p style={styles.streakSubtitle}>Keep reading daily to maintain your streak</p>
      </div>
    </div>
    <div style={styles.streakStatus}>Active</div>
  </div>
);

// Currently Reading Component
const CurrentlyReading = ({ book, onUpdateProgress }) => {
  if (!book) return null;

  return (
    <div>
      <div style={styles.sectionTitle}>Currently Reading</div>
      <div style={styles.currentReadingCard}>
        <div style={styles.bookCover}>📖</div>
        <div style={styles.currentBookInfo}>
          <div style={styles.currentBookTitle}>{book.title}</div>
          <div style={styles.currentBookAuthor}>{book.author}</div>
          <div style={styles.progressSection}>
            <h4 style={styles.progressSectionTitle}>Reading Progress</h4>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${book.progress}%`}}></div>
            </div>
            <div style={styles.progressText}>{book.progress}% complete</div>
            <button 
              style={styles.updateProgressBtn}
              onClick={() => onUpdateProgress(book.id)}
            >
              📝 Update Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Book Modal Component
const AddBookModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    status: 'want-to-read',
    progress: 0,
    startDate: '',
    finishDate: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      title: '',
      author: '',
      status: 'want-to-read',
      progress: 0,
      startDate: '',
      finishDate: '',
      notes: ''
    });
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Add New Book</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Book Title *</label>
              <input 
                style={styles.input}
                type="text" 
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                required 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Author *</label>
              <input 
                style={styles.input}
                type="text" 
                value={formData.author}
                onChange={e => handleChange('author', e.target.value)}
                required 
              />
            </div>
          </div>
          
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reading Status</label>
              <select 
                style={styles.input}
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="want-to-read">Want to Read</option>
                <option value="reading">Currently Reading</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Progress (%)</label>
              <input 
                style={styles.input}
                type="number" 
                min="0" 
                max="100" 
                value={formData.progress}
                onChange={e => handleChange('progress', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date</label>
              <input 
                style={styles.input}
                type="date" 
                value={formData.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Finish Date</label>
              <input 
                style={styles.input}
                type="date" 
                value={formData.finishDate}
                onChange={e => handleChange('finishDate', e.target.value)}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea 
              style={{...styles.input, height: '80px', resize: 'vertical'}}
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Your thoughts about this book..."
            />
          </div>

          <button type="submit" style={styles.btn}>Add Book</button>
        </form>
      </div>
    </div>
  );
};

// Main App Component
const ReadingTracker = () => {
  const [books, setBooks] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [activeModal, setActiveModal] = useState(null);

  // Initialize data
  useEffect(() => {
    setBooks([
      {
        id: 1,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        progress: 100,
        status: "finished",
        startDate: "2024-01-01",
        finishDate: "2024-01-05",
        notes: "Classic American novel about the Jazz Age"
      },
      {
        id: 2,
        title: "The Midnight Library",
        author: "Matt Haig", 
        progress: 51,
        status: "reading",
        startDate: "2024-01-10",
        finishDate: "",
        notes: "Philosophical fiction about life choices"
      },
      {
        id: 3,
        title: "Project Hail Mary",
        author: "Andy Weir",
        progress: 0,
        status: "want-to-read",
        startDate: "",
        finishDate: "",
        notes: "Science fiction thriller"
      },
      {
        id: 4,
        title: "Dune",
        author: "Frank Herbert",
        progress: 100,
        status: "finished",
        startDate: "2023-12-01",
        finishDate: "2024-01-15",
        notes: "Epic sci-fi masterpiece"
      },
      {
        id: 5,
        title: "The Way of Kings",
        author: "Brandon Sanderson",
        progress: 0,
        status: "want-to-read",
        startDate: "",
        finishDate: "",
        notes: "Epic fantasy series starter"
      }
    ]);
  }, []);

  // Filter books
  const filteredBooks = currentFilter === 'all' 
    ? books 
    : books.filter(book => book.status === currentFilter);

  // Get currently reading book
  const currentlyReadingBook = books.find(book => book.status === 'reading');

  // Get book counts
  const bookCounts = {
    all: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    finished: books.filter(b => b.status === 'finished').length,
    'want-to-read': books.filter(b => b.status === 'want-to-read').length
  };

  // Handle adding a book
  const handleAddBook = (bookData) => {
    const newBook = {
      ...bookData,
      id: Date.now(),
    };
    setBooks(prev => [...prev, newBook]);
  };

  // Handle updating progress
  const handleUpdateProgress = (bookId) => {
    const newProgress = prompt('Enter new progress percentage (0-100):');
    if (newProgress !== null && !isNaN(newProgress)) {
      const progressValue = Math.min(Math.max(parseInt(newProgress), 0), 100);
      setBooks(prev => prev.map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, progress: progressValue };
          if (progressValue === 100 && book.status !== 'finished') {
            updatedBook.status = 'finished';
            updatedBook.finishDate = new Date().toISOString().split('T')[0];
          }
          return updatedBook;
        }
        return book;
      }));
    }
  };

  // Get streak (simplified)
  const streak = 3; // Placeholder

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.mainHeader}>
          <h1 style={styles.mainTitle}>My Reading</h1>
          <button 
            style={styles.addBookBtn}
            onClick={() => setActiveModal('addBook')}
          >
            + Add book
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Streak Card */}
          <StreakCard streak={streak} />

          {/* Currently Reading */}
          <CurrentlyReading 
            book={currentlyReadingBook} 
            onUpdateProgress={handleUpdateProgress}
          />

          {/* Navigation Tabs */}
          <div style={styles.navTabs}>
            <button style={{...styles.navTab, ...styles.navTabActive}}>Library</button>
            <button style={styles.navTab}>Statistics</button>
            <button style={styles.navTab}>Wishlist</button>
          </div>

          {/* Filter Section */}
          <div style={styles.filterSection}>
            <div style={styles.statusFilters}>
              {[
                { key: 'all', label: 'All', count: bookCounts.all },
                { key: 'reading', label: 'Reading', count: bookCounts.reading },
                { key: 'finished', label: 'Completed', count: bookCounts.finished },
                { key: 'want-to-read', label: 'Want to Read', count: bookCounts['want-to-read'] }
              ].map(filter => (
                <button
                  key={filter.key}
                  style={{
                    ...styles.statusFilter,
                    ...(currentFilter === filter.key ? styles.statusFilterActive : {})
                  }}
                  onClick={() => setCurrentFilter(filter.key)}
                >
                  {filter.label} {filter.count}
                </button>
              ))}
            </div>
            <button style={styles.filterBtn}>📥 Import</button>
          </div>

          {/* Book Grid */}
          <div style={styles.bookGrid}>
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>

        {/* Modals */}
        <AddBookModal 
          isOpen={activeModal === 'addBook'}
          onClose={() => setActiveModal(null)}
          onSubmit={handleAddBook}
        />
      </div>
    </div>
  );
};

export default ReadingTracker;