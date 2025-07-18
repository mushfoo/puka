import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ExportModal from '@/components/modals/ExportModal';
import { Book } from '@/types';
import { ExportData } from '@/services/storage/StorageService';
import * as ExportService from '@/services/exportService';

// Mock the export service
vi.mock('@/services/exportService');
const mockExportService = vi.mocked(ExportService.ExportService);

// Mock the toast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn()
  })
}));

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Test Book 1',
    author: 'Test Author 1',
    status: 'currently_reading',
    progress: 50,
    notes: 'Great book!',
    isbn: '1234567890',
    genre: 'Fiction',
    totalPages: 300,
    currentPage: 150,
    rating: 4,
    publishedDate: '2023',
    dateAdded: new Date('2023-01-01'),
    dateModified: new Date('2023-01-02'),
    dateStarted: new Date('2023-01-01')
  },
  {
    id: 2,
    title: 'Test Book 2',
    author: 'Test Author 2',
    status: 'finished',
    progress: 100,
    notes: 'Excellent!',
    dateAdded: new Date('2023-01-05'),
    dateModified: new Date('2023-01-10'),
    dateStarted: new Date('2023-01-05'),
    dateFinished: new Date('2023-01-10')
  }
];

const mockExportData: ExportData = {
  books: mockBooks,
  metadata: {
    exportDate: '2023-01-01T00:00:00.000Z',
    version: '1.0.0',
    totalBooks: 2
  },
  settings: {
    theme: 'system',
    dailyReadingGoal: 30,
    defaultView: 'grid',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    notificationsEnabled: true,
    autoBackup: false,
    backupFrequency: 'weekly'
  }
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  books: mockBooks,
  exportData: mockExportData
};

describe('ExportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export modal when open', () => {
    render(<ExportModal {...defaultProps} />);
    
    expect(screen.getByText('Export Library')).toBeInTheDocument();
    expect(screen.getByText('📚 2 books total')).toBeInTheDocument();
    expect(screen.getByText('📖 1 currently reading')).toBeInTheDocument();
    expect(screen.getByText('✅ 1 finished')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExportModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Export Library')).not.toBeInTheDocument();
  });

  it('renders format options', () => {
    render(<ExportModal {...defaultProps} />);
    
    expect(screen.getByText('CSV (Spreadsheet)')).toBeInTheDocument();
    expect(screen.getByText('JSON (Complete Data)')).toBeInTheDocument();
    expect(screen.getByText('Goodreads CSV')).toBeInTheDocument();
  });

  it('has CSV format selected by default', () => {
    render(<ExportModal {...defaultProps} />);
    
    const csvRadio = screen.getByRole('radio', { name: /csv \(spreadsheet\)/i });
    expect(csvRadio).toBeChecked();
  });

  it('allows changing export format', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    const jsonRadio = screen.getByRole('radio', { name: /json \(complete data\)/i });
    await user.click(jsonRadio);
    
    expect(jsonRadio).toBeChecked();
  });

  it('shows export options for CSV and JSON formats', () => {
    render(<ExportModal {...defaultProps} />);
    
    expect(screen.getByText('Include metadata (export date, version)')).toBeInTheDocument();
  });

  it('shows settings option only for JSON format', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // Should not show settings option for CSV
    expect(screen.queryByText('Include user settings')).not.toBeInTheDocument();
    
    // Switch to JSON
    const jsonRadio = screen.getByRole('radio', { name: /json \(complete data\)/i });
    await user.click(jsonRadio);
    
    // Should show settings option for JSON
    expect(screen.getByText('Include user settings')).toBeInTheDocument();
  });

  it('does not show export options for Goodreads format', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // Switch to Goodreads CSV
    const goodreadsRadio = screen.getByRole('radio', { name: /goodreads csv/i });
    await user.click(goodreadsRadio);
    
    // Should not show export options section
    expect(screen.queryByText('Export Options')).not.toBeInTheDocument();
  });

  it('updates filename preview based on selection', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    // Should show CSV preview by default
    expect(screen.getByText(/puka-books-.*\.csv/)).toBeInTheDocument();
    
    // Switch to JSON
    const jsonRadio = screen.getByRole('radio', { name: /json \(complete data\)/i });
    await user.click(jsonRadio);
    
    // Should update to JSON preview
    expect(screen.getByText(/puka-books-.*\.json/)).toBeInTheDocument();
  });

  it('allows custom filename input', async () => {
    const user = userEvent.setup();
    render(<ExportModal {...defaultProps} />);
    
    const filenameInput = screen.getByLabelText(/filename/i);
    await user.type(filenameInput, 'my-custom-export');
    
    expect(screen.getByText('Preview: my-custom-export.csv')).toBeInTheDocument();
  });

  it('exports CSV when export button is clicked', async () => {
    const user = userEvent.setup();
    const mockResult = { success: true, filename: 'test-export.csv' };
    mockExportService.exportBooks = vi.fn().mockResolvedValue(mockResult);
    
    render(<ExportModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export 2 books/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.exportBooks).toHaveBeenCalledWith(
        mockBooks,
        mockExportData,
        expect.objectContaining({
          format: 'csv',
          includeMetadata: true,
          includeSettings: false
        })
      );
    });
  });

  it('exports JSON with settings when selected', async () => {
    const user = userEvent.setup();
    const mockResult = { success: true, filename: 'test-export.json' };
    mockExportService.exportBooks = vi.fn().mockResolvedValue(mockResult);
    
    render(<ExportModal {...defaultProps} />);
    
    // Switch to JSON format
    const jsonRadio = screen.getByRole('radio', { name: /json \(complete data\)/i });
    await user.click(jsonRadio);
    
    const exportButton = screen.getByRole('button', { name: /export 2 books/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.exportBooks).toHaveBeenCalledWith(
        mockBooks,
        mockExportData,
        expect.objectContaining({
          format: 'json',
          includeMetadata: true,
          includeSettings: true
        })
      );
    });
  });

  it('exports Goodreads CSV when selected', async () => {
    const user = userEvent.setup();
    const mockResult = { success: true, filename: 'goodreads-export.csv' };
    mockExportService.exportToGoodreads = vi.fn().mockResolvedValue(mockResult);
    
    render(<ExportModal {...defaultProps} />);
    
    // Switch to Goodreads format
    const goodreadsRadio = screen.getByRole('radio', { name: /goodreads csv/i });
    await user.click(goodreadsRadio);
    
    const exportButton = screen.getByRole('button', { name: /export 2 books/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.exportToGoodreads).toHaveBeenCalledWith(mockBooks);
    });
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(<ExportModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('disables export button when no books', () => {
    render(<ExportModal {...defaultProps} books={[]} />);
    
    const exportButton = screen.getByRole('button', { name: /export 0 books/i });
    expect(exportButton).toBeDisabled();
  });

  it('shows loading state during export', async () => {
    const user = userEvent.setup();
    const mockResult = { success: true, filename: 'test-export.csv' };
    
    // Mock a slow export
    mockExportService.exportBooks = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockResult), 100))
    );
    
    render(<ExportModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export 2 books/i });
    await user.click(exportButton);
    
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(exportButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText('Exporting...')).not.toBeInTheDocument();
    });
  });

  it('handles export errors gracefully', async () => {
    const user = userEvent.setup();
    const mockResult = { success: false, filename: '', error: 'Export failed' };
    mockExportService.exportBooks = vi.fn().mockResolvedValue(mockResult);
    
    render(<ExportModal {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export 2 books/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.exportBooks).toHaveBeenCalled();
    });
    
    // Should remain open on error
    expect(screen.getByText('Export Library')).toBeInTheDocument();
  });
});