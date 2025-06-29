import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportModal from '@/components/modals/ImportModal';
import { ImportService } from '@/services/importService';
import { useToast } from '@/hooks/useToast';
import { useStorage } from '@/hooks/useStorage';

// Mock dependencies
vi.mock('@/services/importService');
vi.mock('@/hooks/useToast');
vi.mock('@/hooks/useStorage');

const mockImportService = ImportService as any;
const mockUseToast = useToast as Mock;
const mockUseStorage = useStorage as Mock;

describe('ImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnImportComplete = vi.fn();
  const mockShowToast = vi.fn();
  const mockStorageService = {
    importData: vi.fn()
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onImportComplete: mockOnImportComplete
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseToast.mockReturnValue({
      showToast: mockShowToast
    });

    mockUseStorage.mockReturnValue({
      storageService: mockStorageService
    });

    // Mock File constructor
    global.File = class MockFile {
      name: string;
      type: string;
      constructor(_bits: any[], filename: string, options?: any) {
        this.name = filename;
        this.type = options?.type || '';
      }
    } as any;

    // Mock FileReader
    global.FileReader = class MockFileReader {
      onload: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      
      readAsText() {
        setTimeout(() => {
          if (this.onload) {
            this.onload({
              target: {
                result: 'Title,Author,Status\nBook 1,Author 1,finished\nBook 2,Author 2,reading'
              }
            });
          }
        }, 0);
      }
    } as any;
  });

  it('renders upload step by default', () => {
    render(<ImportModal {...defaultProps} />);

    expect(screen.getByText('Import Books')).toBeInTheDocument();
    expect(screen.getByText('Import Your Reading Data')).toBeInTheDocument();
    expect(screen.getByText('Drop CSV file here or click to upload')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ImportModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Import Books')).not.toBeInTheDocument();
  });

  it('shows error when non-CSV file is selected', async () => {
    render(<ImportModal {...defaultProps} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Please select a CSV file')).toBeInTheDocument();
    });
  });

  it('processes CSV file and shows preview', async () => {
    const mockPreview = {
      success: true,
      totalRows: 2,
      validRows: 2,
      errors: [],
      sampleBooks: [
        { title: 'Book 1', author: 'Author 1', status: 'finished', progress: 100 },
        { title: 'Book 2', author: 'Author 2', status: 'currently_reading', progress: 50 }
      ],
      suggestedFormat: { id: 'puka-native', name: 'Puka Native CSV' },
      columns: ['Title', 'Author', 'Status']
    };

    mockImportService.parseCSVFile = vi.fn().mockResolvedValue(mockPreview);

    render(<ImportModal {...defaultProps} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
      expect(screen.getByText('Puka Native CSV')).toBeInTheDocument();
      expect(screen.getByText('Total rows:')).toBeInTheDocument();
    });

    expect(screen.getByText('Import 2 Books')).toBeInTheDocument();
  });

  it('shows mapping step for generic format', async () => {
    const mockPreview = {
      success: true,
      totalRows: 2,
      validRows: 2,
      errors: [],
      sampleBooks: [],
      suggestedFormat: { id: 'generic', name: 'Generic CSV' },
      columns: ['Book Title', 'Book Author', 'Reading Status']
    };

    mockImportService.parseCSVFile = vi.fn().mockResolvedValue(mockPreview);

    render(<ImportModal {...defaultProps} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Column Mapping')).toBeInTheDocument();
    });

    expect(screen.getByText('Book Title')).toBeInTheDocument();
    expect(screen.getByText('Book Author')).toBeInTheDocument();
    expect(screen.getByText('Reading Status')).toBeInTheDocument();
  });

  it('performs import successfully', async () => {
    const mockPreview = {
      success: true,
      totalRows: 2,
      validRows: 2,
      errors: [],
      sampleBooks: [
        { title: 'Book 1', author: 'Author 1', status: 'finished', progress: 100 }
      ],
      suggestedFormat: { id: 'puka-native', name: 'Puka Native CSV' },
      columns: ['Title', 'Author', 'Status']
    };

    const mockImportResult = {
      success: true,
      imported: 2,
      skipped: 0,
      errors: [],
      duplicates: 0
    };

    mockImportService.parseCSVFile = vi.fn().mockResolvedValue(mockPreview);
    mockImportService.processImportData = vi.fn().mockReturnValue({
      books: [{ title: 'Book 1', author: 'Author 1' }],
      errors: [],
      totalRows: 2,
      validRows: 2
    });
    mockImportService.createImportData = vi.fn().mockReturnValue({
      books: [{ title: 'Book 1', author: 'Author 1' }]
    });
    mockStorageService.importData = vi.fn().mockResolvedValue(mockImportResult);

    render(<ImportModal {...defaultProps} />);

    // Upload file
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    // Wait for preview and click import
    await waitFor(() => {
      expect(screen.getByText('Import 2 Books')).toBeInTheDocument();
    });

    const importButton = screen.getByText('Import 2 Books');
    fireEvent.click(importButton);

    // Check importing state
    await waitFor(() => {
      expect(screen.getByText('Importing Books...')).toBeInTheDocument();
    });

    // Check completion
    await waitFor(() => {
      expect(screen.getByText('Import Complete!')).toBeInTheDocument();
      expect(screen.getByText(/2 books imported successfully/)).toBeInTheDocument();
    });

    expect(mockOnImportComplete).toHaveBeenCalledWith(mockImportResult);
    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'Import Successful',
      message: 'Successfully imported 2 books'
    });
  });

  it('handles import errors gracefully', async () => {
    const mockPreview = {
      success: true,
      totalRows: 2,
      validRows: 2,
      errors: [],
      sampleBooks: [
        { title: 'Book 1', author: 'Author 1', status: 'finished', progress: 100 }
      ],
      suggestedFormat: { id: 'puka-native', name: 'Puka Native CSV' },
      columns: ['Title', 'Author', 'Status']
    };

    mockImportService.parseCSVFile = vi.fn().mockResolvedValue(mockPreview);
    mockImportService.processImportData = vi.fn().mockReturnValue({
      books: [],
      errors: [],
      totalRows: 2,
      validRows: 2
    });
    mockImportService.createImportData = vi.fn().mockReturnValue({
      books: []
    });
    mockStorageService.importData = vi.fn().mockRejectedValue(new Error('Import failed'));

    render(<ImportModal {...defaultProps} />);

    // Upload file and import
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Import 2 Books')).toBeInTheDocument();
    });

    const importButton = screen.getByText('Import 2 Books');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument(); // Back to preview
    });
  });

  it('closes modal when close button is clicked', () => {
    render(<ImportModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '' }); // Close button (X)
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows warnings for invalid data', async () => {
    const mockPreview = {
      success: true, // Keep success true but have errors to show warnings
      totalRows: 3,
      validRows: 2,
      errors: [
        { row: 2, field: 'progress', message: 'Progress must be between 0 and 100', data: {} },
        { row: 3, field: 'title', message: 'Title is required', data: {} }
      ],
      sampleBooks: [
        { title: 'Book 1', author: 'Author 1', status: 'finished', progress: 100 }
      ],
      suggestedFormat: { id: 'puka-native', name: 'Puka Native CSV' },
      columns: ['Title', 'Author', 'Progress']
    };

    mockImportService.parseCSVFile = vi.fn().mockResolvedValue(mockPreview);

    render(<ImportModal {...defaultProps} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Import Warnings')).toBeInTheDocument();
      expect(screen.getByText('Row 2: Progress must be between 0 and 100')).toBeInTheDocument();
    });
  });
});