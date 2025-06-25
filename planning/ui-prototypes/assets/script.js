// Puka UI - Core JavaScript
// Mobile-first interactive components

// Utility Functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// State Management
const PukaState = {
  currentBook: null,
  books: [],
  user: {
    streak: 0,
    totalBooks: 0,
    pagesRead: 0,
    readingGoal: 12
  }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Initialize App
function initializeApp() {
  // Initialize navigation
  initNavigation();
  
  // Initialize forms
  initForms();
  
  // Initialize modals
  initModals();
  
  // Initialize progress sliders
  initProgressSliders();
  
  // Initialize book cards
  initBookCards();
  
  // Initialize floating action button
  initFAB();
  
  // Initialize search
  initSearch();
  
  // Initialize status filters
  initStatusFilters();
}

// Navigation
function initNavigation() {
  const navItems = $$('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all items
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Add active class to clicked item
      item.classList.add('active');
      
      // Handle navigation (in a real app, this would change routes)
      const target = item.dataset.target;
      if (target) {
        showScreen(target);
      }
    });
  });
}

// Screen Management
function showScreen(screenId) {
  // Hide all screens
  $$('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  
  // Show target screen
  const targetScreen = $(`#${screenId}`);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('fade-in');
  }
}

// Forms
function initForms() {
  // Add Book Form
  const addBookForm = $('#add-book-form');
  if (addBookForm) {
    addBookForm.addEventListener('submit', handleAddBook);
  }
  
  // Update Progress Form
  const updateProgressForm = $('#update-progress-form');
  if (updateProgressForm) {
    updateProgressForm.addEventListener('submit', handleUpdateProgress);
  }
  
  // Import Data Form
  const importForm = $('#import-form');
  if (importForm) {
    importForm.addEventListener('submit', handleImportData);
  }
}

// Add Book Handler
function handleAddBook(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const book = {
    id: Date.now(),
    title: formData.get('title'),
    author: formData.get('author'),
    isbn: formData.get('isbn'),
    totalPages: parseInt(formData.get('totalPages')),
    currentPage: 0,
    status: 'want',
    coverUrl: formData.get('coverUrl') || null,
    addedDate: new Date().toISOString(),
    progress: 0
  };
  
  // Add to state
  PukaState.books.push(book);
  
  // Show success message
  showToast('Book added successfully!', 'success');
  
  // Reset form
  e.target.reset();
  
  // Close modal if open
  closeModal('add-book-modal');
  
  // Refresh book list
  refreshBookList();
}

// Update Progress Handler
function handleUpdateProgress(e) {
  e.preventDefault();
  
  const currentPage = parseInt($('#current-page').value);
  const totalPages = parseInt($('#total-pages').value);
  
  if (PukaState.currentBook) {
    PukaState.currentBook.currentPage = currentPage;
    PukaState.currentBook.progress = Math.round((currentPage / totalPages) * 100);
    
    // Update status based on progress
    if (currentPage === 0) {
      PukaState.currentBook.status = 'want';
    } else if (currentPage === totalPages) {
      PukaState.currentBook.status = 'finished';
    } else {
      PukaState.currentBook.status = 'reading';
    }
    
    // Update UI
    updateProgressDisplay(PukaState.currentBook);
    
    // Show success message
    showToast('Progress updated!', 'success');
  }
}

// Import Data Handler
function handleImportData(e) {
  e.preventDefault();
  
  const source = $('#import-source').value;
  const fileInput = $('#import-file');
  
  if (source === 'csv' && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const csvData = event.target.result;
      // In a real app, parse CSV and import books
      showToast('Data imported successfully!', 'success');
    };
    
    reader.readAsText(file);
  } else if (source === 'goodreads') {
    // In a real app, handle Goodreads import
    showToast('Connecting to Goodreads...', 'info');
  }
}

// Progress Sliders
function initProgressSliders() {
  const sliders = $$('.slider');
  
  sliders.forEach(slider => {
    slider.addEventListener('input', function() {
      const value = this.value;
      const max = this.max;
      const percentage = (value / max) * 100;
      
      // Update visual feedback
      this.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--gray-200) ${percentage}%, var(--gray-200) 100%)`;
      
      // Update associated displays
      const displayId = this.dataset.display;
      if (displayId) {
        const display = $(`#${displayId}`);
        if (display) {
          display.textContent = value;
        }
      }
      
      // Update progress percentage if available
      const percentageId = this.dataset.percentage;
      if (percentageId) {
        const percentageDisplay = $(`#${percentageId}`);
        if (percentageDisplay) {
          percentageDisplay.textContent = `${Math.round(percentage)}%`;
        }
      }
    });
    
    // Trigger initial update
    slider.dispatchEvent(new Event('input'));
  });
}

// Book Cards
function initBookCards() {
  const bookCards = $$('.book-card');
  
  bookCards.forEach(card => {
    card.addEventListener('click', function() {
      const bookId = this.dataset.bookId;
      if (bookId) {
        showBookDetails(bookId);
      }
    });
  });
}

// Show Book Details
function showBookDetails(bookId) {
  // In a real app, fetch book details and show in modal or new screen
  const book = PukaState.books.find(b => b.id === parseInt(bookId));
  if (book) {
    PukaState.currentBook = book;
    showModal('book-details-modal');
  }
}

// Modals
function initModals() {
  // Close modal on overlay click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
  
  // Close buttons
  $$('[data-close-modal]').forEach(button => {
    button.addEventListener('click', function() {
      const modalId = this.dataset.closeModal;
      closeModal(modalId);
    });
  });
}

function showModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Floating Action Button
function initFAB() {
  const fab = $('.fab');
  if (fab) {
    fab.addEventListener('click', () => {
      // Show add book modal or action menu
      showModal('add-book-modal');
    });
  }
}

// Search
function initSearch() {
  const searchInput = $('#search-books');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(function() {
      const query = this.value.toLowerCase();
      filterBooks(query);
    }, 300));
  }
}

// Status Filters
function initStatusFilters() {
  const filterButtons = $$('[data-filter-status]');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Filter books
      const status = this.dataset.filterStatus;
      filterBooksByStatus(status);
    });
  });
}

// Filter Books
function filterBooks(query) {
  const bookCards = $$('.book-card');
  
  bookCards.forEach(card => {
    const title = card.querySelector('.book-title')?.textContent.toLowerCase() || '';
    const author = card.querySelector('.book-author')?.textContent.toLowerCase() || '';
    
    if (title.includes(query) || author.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterBooksByStatus(status) {
  const bookCards = $$('.book-card');
  
  bookCards.forEach(card => {
    if (status === 'all' || card.dataset.status === status) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// Update Progress Display
function updateProgressDisplay(book) {
  const progressBar = $(`.book-card[data-book-id="${book.id}"] .progress-fill`);
  const progressText = $(`.book-card[data-book-id="${book.id}"] .progress-text`);
  const statusBadge = $(`.book-card[data-book-id="${book.id}"] .status-badge`);
  
  if (progressBar) {
    progressBar.style.width = `${book.progress}%`;
  }
  
  if (progressText) {
    progressText.textContent = `${book.progress}%`;
  }
  
  if (statusBadge) {
    statusBadge.className = `status-badge ${book.status}`;
    statusBadge.textContent = book.status;
  }
}

// Refresh Book List
function refreshBookList() {
  // In a real app, this would re-render the book list
  console.log('Refreshing book list...');
}

// Toast Notifications
function showToast(message, type = 'info') {
  // Remove existing toasts
  $$('.toast').forEach(toast => toast.remove());
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} fade-in`;
  toast.textContent = message;
  
  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: 'var(--space-md) var(--space-lg)',
    backgroundColor: type === 'success' ? 'var(--success)' : 
                     type === 'error' ? 'var(--error)' : 
                     type === 'warning' ? 'var(--warning)' : 'var(--info)',
    color: 'white',
    borderRadius: 'var(--radius-full)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: '3000',
    fontSize: 'var(--font-size-sm)',
    fontWeight: '500'
  });
  
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Utility: Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Utility: Format Date
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Utility: Calculate Reading Stats
function calculateReadingStats() {
  const stats = {
    totalBooks: PukaState.books.length,
    booksRead: PukaState.books.filter(b => b.status === 'finished').length,
    currentlyReading: PukaState.books.filter(b => b.status === 'reading').length,
    wantToRead: PukaState.books.filter(b => b.status === 'want').length,
    totalPages: PukaState.books.reduce((sum, book) => sum + (book.currentPage || 0), 0),
    averageRating: 0, // Would calculate from ratings
    readingStreak: PukaState.user.streak
  };
  
  return stats;
}

// Touch Gestures (for mobile)
let touchStartX = 0;
let touchEndX = 0;

function handleGesture() {
  if (touchEndX < touchStartX - 50) {
    // Swiped left
    console.log('Swiped left');
  }
  if (touchEndX > touchStartX + 50) {
    // Swiped right
    console.log('Swiped right');
  }
}

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  handleGesture();
});

// Export functions for use in prototypes
window.Puka = {
  showModal,
  closeModal,
  showToast,
  showScreen,
  updateProgressDisplay,
  calculateReadingStats,
  formatDate,
  state: PukaState
};