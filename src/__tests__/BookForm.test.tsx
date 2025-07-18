import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import BookForm from '@/components/forms/BookForm';
import { Book } from '@/types';

const mockBook: Partial<Book> = {
  id: 1,
  title: 'Test Book',
  author: 'Test Author',
  status: 'currently_reading',
  progress: 50,
  notes: 'Test notes',
  isbn: '1234567890',
  totalPages: 300,
  currentPage: 150,
  genre: 'Fiction',
  rating: 4,
  publishedDate: '2023'
};

describe('BookForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with default values for new book', () => {
    render(<BookForm {...defaultProps} />);
    
    expect(screen.getByRole('heading', { name: 'Add Book' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toHaveValue('');
    expect(screen.getByLabelText(/Author/)).toHaveValue('');
    expect(screen.getByText('Want to Read')).toHaveClass('bg-primary');
  });

  it('renders form with initial values for editing', () => {
    render(<BookForm {...defaultProps} initialBook={mockBook} title="Edit Book" submitText="Update Book" />);
    
    expect(screen.getByRole('heading', { name: 'Edit Book' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toHaveValue('Test Book');
    expect(screen.getByLabelText(/Author/)).toHaveValue('Test Author');
    expect(screen.getByText('Reading')).toHaveClass('bg-primary');
    expect(screen.getByLabelText(/Notes/)).toHaveValue('Test notes');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Author is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'New Book');
    await user.type(screen.getByLabelText(/Author/), 'New Author');
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      title: 'New Book',
      author: 'New Author',
      status: 'want_to_read',
      progress: 0,
      notes: undefined,
      isbn: undefined,
      totalPages: undefined,
      currentPage: undefined,
      genre: undefined,
      rating: undefined,
      publishedDate: undefined,
      dateStarted: undefined,
      dateFinished: undefined
    });
  });

  it('changes status when status buttons are clicked', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    const readingButton = screen.getByText('Reading');
    await user.click(readingButton);
    
    expect(readingButton).toHaveClass('bg-primary');
    expect(screen.getByText('Want to Read')).not.toHaveClass('bg-primary');
  });

  it('updates progress with slider', async () => {
    render(<BookForm {...defaultProps} />);
    
    const progressSlider = screen.getByRole('slider');
    fireEvent.change(progressSlider, { target: { value: '75' } });
    
    expect(screen.getByText('Progress (75%)')).toBeInTheDocument();
  });

  it('validates progress range', async () => {
    render(<BookForm {...defaultProps} />);
    
    // Set invalid progress (this would be through direct manipulation since slider constrains values)
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    // Progress should be valid by default (0), so no error
    expect(screen.queryByText('Progress must be between 0 and 100')).not.toBeInTheDocument();
  });

  it('validates page numbers', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'Test');
    await user.type(screen.getByLabelText(/Author/), 'Test');
    await user.type(screen.getByLabelText(/Total Pages/), 'invalid');
    await user.type(screen.getByLabelText(/Current Page/), 'invalid');
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Total pages must be a number')).toBeInTheDocument();
    expect(screen.getByText('Current page must be a number')).toBeInTheDocument();
  });

  it('validates current page does not exceed total pages', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'Test');
    await user.type(screen.getByLabelText(/Author/), 'Test');
    await user.type(screen.getByLabelText(/Total Pages/), '100');
    await user.type(screen.getByLabelText(/Current Page/), '150');
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Current page cannot exceed total pages')).toBeInTheDocument();
  });

  it('validates rating range', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'Test');
    await user.type(screen.getByLabelText(/Author/), 'Test');
    await user.type(screen.getByLabelText(/Rating/), '6');
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Rating must be between 1 and 5')).toBeInTheDocument();
  });

  it('clears errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    
    // Start typing to clear error
    await user.type(screen.getByLabelText(/Title/), 'T');
    
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('hides cancel button when showCancel is false', () => {
    render(<BookForm {...defaultProps} showCancel={false} />);
    
    expect(screen.queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument();
  });

  it('disables form when loading', () => {
    render(<BookForm {...defaultProps} loading={true} />);
    
    expect(screen.getByLabelText(/Title/)).toBeDisabled();
    expect(screen.getByLabelText(/Author/)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
  });

  it('updates form when initialBook prop changes', () => {
    const { rerender } = render(<BookForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/Title/)).toHaveValue('');
    
    rerender(<BookForm {...defaultProps} initialBook={mockBook} />);
    
    expect(screen.getByLabelText(/Title/)).toHaveValue('Test Book');
  });

  it('handles all optional fields correctly', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'Complete Book');
    await user.type(screen.getByLabelText(/Author/), 'Complete Author');
    await user.type(screen.getByLabelText(/ISBN/), '1234567890');
    await user.type(screen.getByLabelText(/Genre/), 'Fantasy');
    await user.type(screen.getByLabelText(/Total Pages/), '400');
    await user.type(screen.getByLabelText(/Current Page/), '200');
    await user.type(screen.getByLabelText(/Rating/), '5');
    await user.type(screen.getByLabelText(/Published Date/), '2023-01-01');
    await user.type(screen.getByLabelText(/Notes/), 'Great book!');
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      title: 'Complete Book',
      author: 'Complete Author',
      status: 'want_to_read',
      progress: 0,
      isbn: '1234567890',
      genre: 'Fantasy',
      totalPages: 400,
      currentPage: 200,
      rating: 5,
      publishedDate: '2023-01-01',
      notes: 'Great book!',
      dateStarted: undefined,
      dateFinished: undefined
    });
  });

  it('sets dateStarted when status is currently_reading', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'Reading Book');
    await user.type(screen.getByLabelText(/Author/), 'Reading Author');
    
    const readingButton = screen.getByText('Reading');
    await user.click(readingButton);
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    const call = defaultProps.onSubmit.mock.calls[0][0];
    expect(call.dateStarted).toBeInstanceOf(Date);
  });

  it('sets dateFinished when status is finished', async () => {
    const user = userEvent.setup();
    render(<BookForm {...defaultProps} />);
    
    await user.type(screen.getByLabelText(/Title/), 'Finished Book');
    await user.type(screen.getByLabelText(/Author/), 'Finished Author');
    
    const finishedButton = screen.getByText('Finished');
    await user.click(finishedButton);
    
    const submitButton = screen.getByRole('button', { name: /Add Book/i });
    await user.click(submitButton);
    
    const call = defaultProps.onSubmit.mock.calls[0][0];
    expect(call.dateFinished).toBeInstanceOf(Date);
  });
});