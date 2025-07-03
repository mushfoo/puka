import React, { useState, useEffect } from 'react';
import { Book } from '@/types';

interface BookFormProps {
  /** Initial book data for editing (undefined for new book) */
  initialBook?: Partial<Book>;
  /** Callback when form is submitted */
  onSubmit: (book: Omit<Book, 'id' | 'dateAdded' | 'dateModified'>) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Form title */
  title?: string;
  /** Submit button text */
  submitText?: string;
  /** Show cancel button */
  showCancel?: boolean;
}

interface FormData {
  title: string;
  author: string;
  status: Book['status'];
  progress: number;
  notes: string;
  isbn: string;
  totalPages: string;
  currentPage: string;
  genre: string;
  rating: string;
  publishedDate: string;
  dateStarted: string;
  dateFinished: string;
}

interface FormErrors {
  title?: string;
  author?: string;
  progress?: string;
  totalPages?: string;
  currentPage?: string;
  rating?: string;
  dateStarted?: string;
  dateFinished?: string;
}

const BookForm: React.FC<BookFormProps> = ({
  initialBook,
  onSubmit,
  onCancel,
  loading = false,
  title = 'Add Book',
  submitText = 'Add Book',
  showCancel = true
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: initialBook?.title || '',
    author: initialBook?.author || '',
    status: initialBook?.status || 'want_to_read',
    progress: initialBook?.progress || 0,
    notes: initialBook?.notes || '',
    isbn: initialBook?.isbn || '',
    totalPages: initialBook?.totalPages?.toString() || '',
    currentPage: initialBook?.currentPage?.toString() || '',
    genre: initialBook?.genre || '',
    rating: initialBook?.rating?.toString() || '',
    publishedDate: initialBook?.publishedDate || '',
    dateStarted: initialBook?.dateStarted ? new Date(initialBook.dateStarted).toISOString().split('T')[0] : '',
    dateFinished: initialBook?.dateFinished ? new Date(initialBook.dateFinished).toISOString().split('T')[0] : ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update form when initialBook changes
  useEffect(() => {
    if (initialBook) {
      setFormData({
        title: initialBook.title || '',
        author: initialBook.author || '',
        status: initialBook.status || 'want_to_read',
        progress: initialBook.progress || 0,
        notes: initialBook.notes || '',
        isbn: initialBook.isbn || '',
        totalPages: initialBook.totalPages?.toString() || '',
        currentPage: initialBook.currentPage?.toString() || '',
        genre: initialBook.genre || '',
        rating: initialBook.rating?.toString() || '',
        publishedDate: initialBook.publishedDate || '',
        dateStarted: initialBook.dateStarted ? new Date(initialBook.dateStarted).toISOString().split('T')[0] : '',
        dateFinished: initialBook.dateFinished ? new Date(initialBook.dateFinished).toISOString().split('T')[0] : ''
      });
    }
  }, [initialBook]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }

    // Progress validation
    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = 'Progress must be between 0 and 100';
    }

    // Pages validation
    if (formData.totalPages && isNaN(Number(formData.totalPages))) {
      newErrors.totalPages = 'Total pages must be a number';
    } else if (formData.totalPages && Number(formData.totalPages) <= 0) {
      newErrors.totalPages = 'Total pages must be a positive number';
    }

    if (formData.currentPage && isNaN(Number(formData.currentPage))) {
      newErrors.currentPage = 'Current page must be a number';
    } else if (formData.currentPage && Number(formData.currentPage) <= 0) {
      newErrors.currentPage = 'Current page must be a positive number';
    }

    if (formData.currentPage && formData.totalPages) {
      const current = Number(formData.currentPage);
      const total = Number(formData.totalPages);
      if (current > total) {
        newErrors.currentPage = 'Current page cannot exceed total pages';
      }
    }

    // Rating validation
    if (formData.rating && isNaN(Number(formData.rating))) {
      newErrors.rating = 'Rating must be between 1 and 5';
    } else if (formData.rating && (Number(formData.rating) < 1 || Number(formData.rating) > 5)) {
      newErrors.rating = 'Rating must be between 1 and 5';
    } else if (formData.rating && !Number.isInteger(Number(formData.rating))) {
      newErrors.rating = 'Rating must be a whole number between 1 and 5';
    }

    // Date validation
    if (formData.dateStarted) {
      const startDate = new Date(formData.dateStarted);
      if (isNaN(startDate.getTime())) {
        newErrors.dateStarted = 'Invalid start date';
      }
    }
    
    if (formData.status === 'finished' && formData.dateFinished) {
      const endDate = new Date(formData.dateFinished);
      if (isNaN(endDate.getTime())) {
        newErrors.dateFinished = 'Invalid finish date';
      }
      
      // Only validate date order for finished books with both dates
      if (formData.dateStarted && !newErrors.dateStarted && !newErrors.dateFinished) {
        const startDate = new Date(formData.dateStarted);
        const endDate = new Date(formData.dateFinished);
        if (startDate > endDate) {
          newErrors.dateFinished = 'Finish date must be after start date';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Mark all fields as touched so validation errors are displayed
      setTouched({
        title: true,
        author: true,
        progress: true,
        totalPages: true,
        currentPage: true,
        rating: true,
        dateStarted: true,
        ...(formData.status === 'finished' && { dateFinished: true })
      });
      return;
    }

    const bookData: Omit<Book, 'id' | 'dateAdded' | 'dateModified'> = {
      title: formData.title.trim(),
      author: formData.author.trim(),
      status: formData.status,
      progress: formData.progress,
      notes: formData.notes.trim() || undefined,
      isbn: formData.isbn.trim() || undefined,
      totalPages: formData.totalPages ? Number(formData.totalPages) : undefined,
      currentPage: formData.currentPage ? Number(formData.currentPage) : undefined,
      genre: formData.genre.trim() || undefined,
      rating: formData.rating ? Number(formData.rating) : undefined,
      publishedDate: formData.publishedDate.trim() || undefined,
      // Use manual date inputs if provided, otherwise auto-populate based on status
      dateStarted: formData.dateStarted ? new Date(formData.dateStarted) : 
                   (formData.status === 'currently_reading' ? new Date() : initialBook?.dateStarted),
      dateFinished: formData.dateFinished ? new Date(formData.dateFinished) : 
                    (formData.status === 'finished' ? new Date() : initialBook?.dateFinished)
    };

    onSubmit(bookData);
  };

  const renderInput = (
    field: keyof FormData,
    label: string,
    type: string = 'text',
    placeholder?: string,
    required: boolean = false
  ) => {
    const inputId = `book-form-${field}`;
    return (
      <div className="form-group">
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-2">
          {label} {required && <span className="text-error">*</span>}
        </label>
        <input
          id={inputId}
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
            errors[field as keyof FormErrors] && touched[field] 
              ? 'border-error' 
              : 'border-border'
          }`}
          disabled={loading}
        />
        {errors[field as keyof FormErrors] && touched[field] && (
          <p className="mt-1 text-sm text-error">{errors[field as keyof FormErrors]}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" role="form">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>

      {/* Essential Fields */}
      <div className="grid grid-cols-1 gap-4">
        {renderInput('title', 'Title', 'text', 'Enter book title', true)}
        {renderInput('author', 'Author', 'text', 'Enter author name', true)}
      </div>

      {/* Status Selection */}
      <div className="form-group">
        <label className="block text-sm font-medium text-text-primary mb-2">
          Status
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'want_to_read', label: 'Want to Read' },
            { value: 'currently_reading', label: 'Reading' },
            { value: 'finished', label: 'Finished' }
          ].map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => handleInputChange('status', status.value)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                formData.status === status.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-secondary border-border hover:border-primary'
              }`}
              disabled={loading}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="form-group">
        <label className="block text-sm font-medium text-text-primary mb-2">
          Progress ({formData.progress}%)
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.progress}
          onChange={(e) => handleInputChange('progress', Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          disabled={loading}
        />
        {errors.progress && (
          <p className="mt-1 text-sm text-error">{errors.progress}</p>
        )}
      </div>

      {/* Reading Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formData.status !== 'want_to_read' && renderInput('dateStarted', 'Date Started', 'date', undefined, false)}
        {formData.status === 'finished' && renderInput('dateFinished', 'Date Finished', 'date', undefined, false)}
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderInput('isbn', 'ISBN', 'text', 'Enter ISBN')}
        {renderInput('genre', 'Genre', 'text', 'Enter genre')}
        {renderInput('totalPages', 'Total Pages', 'text', 'Enter total pages')}
        {renderInput('currentPage', 'Current Page', 'text', 'Enter current page')}
        {renderInput('rating', 'Rating (1-5)', 'text', 'Rate 1-5 stars')}
        {renderInput('publishedDate', 'Published Date', 'text', 'YYYY or YYYY-MM-DD')}
      </div>

      {/* Notes */}
      <div className="form-group">
        <label htmlFor="book-form-notes" className="block text-sm font-medium text-text-primary mb-2">
          Notes
        </label>
        <textarea
          id="book-form-notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Add any notes about this book..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-vertical"
          disabled={loading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : submitText}
        </button>
        
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-3 border border-border text-text-secondary rounded-lg font-medium hover:bg-surface focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default BookForm;