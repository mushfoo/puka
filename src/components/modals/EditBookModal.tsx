import React, { useEffect } from 'react';
import { Book } from '@/types';
import BookForm from '@/components/forms/BookForm';

interface EditBookModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Book to edit */
  book: Book | null;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when a book is updated */
  onUpdateBook: (bookId: number, updates: Partial<Book>) => void;
  /** Loading state while updating book */
  loading?: boolean;
}

const EditBookModal: React.FC<EditBookModalProps> = ({
  isOpen,
  book,
  onClose,
  onUpdateBook,
  loading = false
}) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Don't render if not open or no book
  if (!isOpen || !book) {
    return null;
  }

  const handleSubmit = (bookData: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>) => {
    onUpdateBook(book.id, bookData);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-book-modal-title"
    >
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mt-8 mb-8 transform transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="edit-book-modal-title" className="text-xl font-semibold text-text-primary">
            Edit Book
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-background"
            aria-label="Close modal"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <BookForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            loading={loading}
            title="" // Empty title since we have header
            submitText="Update Book"
            showCancel={false} // We have the X button
            initialBook={book}
          />
        </div>
      </div>
    </div>
  );
};

export default EditBookModal;