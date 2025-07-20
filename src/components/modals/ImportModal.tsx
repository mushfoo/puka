import React, { useState, useRef, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import { ImportService, ImportFormat, ImportPreview, ColumnMapping, StreakPreview } from '@/services/importService';
import { ImportOptions, ImportResult } from '@/services/storage/StorageService';
import { createStorageService, type StorageService } from '@/services/storage';
import { useToast } from '@/hooks/useToast';
import { logImportPhase } from '@/utils/importDebugger';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

type ImportStep = 'upload' | 'preview' | 'mapping' | 'options' | 'importing' | 'complete';

interface ImportState {
  step: ImportStep;
  file: File | null;
  csvData: any[] | null;
  preview: ImportPreview | null;
  selectedFormat: ImportFormat | null;
  customMapping: ColumnMapping;
  importOptions: ImportOptions;
  importResult: ImportResult | null;
  isProcessing: boolean;
  error: string | null;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [storageService, setStorageService] = useState<StorageService | null>(null);

  const [state, setState] = useState<ImportState>({
    step: 'upload',
    file: null,
    csvData: null,
    preview: null,
    selectedFormat: null,
    customMapping: {},
    importOptions: {
      mergeDuplicates: false,
      overwriteExisting: false,
      validateData: true,
      skipInvalid: true
    },
    importResult: null,
    isProcessing: false,
    error: null
  });

  // Initialize storage service
  useEffect(() => {
    const initStorageService = async () => {
      try {
        const service = await createStorageService();
        setStorageService(service);
      } catch (error) {
        console.error('Failed to initialize storage service:', error);
        setState(prev => ({ ...prev, error: 'Failed to initialize storage service' }));
      }
    };

    if (isOpen && !storageService) {
      initStorageService();
    }
  }, [isOpen, storageService]);

  const resetState = () => {
    setState({
      step: 'upload',
      file: null,
      csvData: null,
      preview: null,
      selectedFormat: null,
      customMapping: {},
      importOptions: {
        mergeDuplicates: false,
        overwriteExisting: false,
        validateData: true,
        skipInvalid: true
      },
      importResult: null,
      isProcessing: false,
      error: null
    });
  };

  const handleClose = () => {
    if (state.isProcessing) return;
    resetState();
    onClose();
  };

  const handleFileSelect = useCallback(async (file: File) => {
    logImportPhase('file-selection', file, `Selected file: ${file.name}`);
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      logImportPhase('file-validation', null, 'File validation failed: not a CSV file');
      setState(prev => ({ ...prev, error: 'Please select a CSV file' }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null, file }));

    try {
      logImportPhase('csv-parsing', null, 'Starting CSV file parsing');
      const preview = await ImportService.parseCSVFile(file);
      logImportPhase('csv-parsed', { totalRows: preview.totalRows, validRows: preview.validRows }, 'CSV parsing completed');
      
      // Also get the full CSV data for import
      const fullCsvData = await getCsvDataFromFile(file);
      logImportPhase('csv-data-loaded', { rowCount: fullCsvData.length }, 'Full CSV data loaded');
      
      // Analyze streak data if we have sample books
      let streakPreview: StreakPreview | undefined;
      if (preview.sampleBooks && preview.sampleBooks.length > 0) {
        try {
          logImportPhase('streak-analysis', null, 'Starting streak data analysis');
          streakPreview = ImportService.analyzeStreakData(preview.sampleBooks);
          preview.streakPreview = streakPreview;
          logImportPhase('streak-analyzed', streakPreview, 'Streak analysis completed');
        } catch (error) {
          logImportPhase('streak-analysis-error', error, 'Failed to analyze streak data');
          console.warn('Failed to analyze streak data:', error);
        }
      }
      
      setState(prev => ({
        ...prev,
        preview,
        csvData: fullCsvData,
        selectedFormat: preview.suggestedFormat || ImportService.getSupportedFormats().find(f => f.id === 'generic')!,
        step: preview.success && preview.sampleBooks.length > 0 ? 'preview' : 'mapping',
        isProcessing: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to parse CSV file',
        isProcessing: false
      }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // const handleFormatChange = (format: ImportFormat) => {
  //   setState(prev => ({ ...prev, selectedFormat: format }));
  // };

  const handleColumnMappingChange = (csvColumn: string, bookField: string) => {
    setState(prev => ({
      ...prev,
      customMapping: {
        ...prev.customMapping,
        [csvColumn]: bookField
      }
    }));
  };

  const handleImport = async () => {
    if (!state.preview || !state.selectedFormat || !storageService) {
      logImportPhase('import-validation-failed', { 
        preview: !!state.preview, 
        selectedFormat: !!state.selectedFormat, 
        storageService: !!storageService 
      }, 'Missing required data for import');
      console.error('Missing required data for import:', { 
        preview: !!state.preview, 
        selectedFormat: !!state.selectedFormat, 
        storageService: !!storageService 
      });
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, step: 'importing', error: null }));

    try {
      logImportPhase('import-start', null, 'Starting import process');
      console.log('Starting import process...');
      
      // Ensure storage service is available
      if (!storageService) {
        setState(prev => ({
          ...prev,
          error: 'Storage service not initialized',
          isProcessing: false
        }));
        return;
      }
      
      // Use custom mapping if in mapping mode
      const format = state.step === 'mapping' 
        ? ImportService.createCustomFormat(state.customMapping)
        : state.selectedFormat;

      console.log('Using format:', format);

      // Use stored CSV data
      const csvData = state.csvData || [];
      console.log('Using stored CSV data, rows:', csvData.length);

      // Process the CSV data
      const parsedData = ImportService.processImportData(
        csvData,
        format,
        state.importOptions
      );

      console.log('Data processed:', { 
        books: parsedData.books.length, 
        errors: parsedData.errors.length 
      });

      if (parsedData.errors.length > 0 && !state.importOptions.skipInvalid) {
        console.error('Processing errors:', parsedData.errors);
        setState(prev => ({
          ...prev,
          error: `Import failed: ${parsedData.errors[0].message}`,
          isProcessing: false,
          step: 'preview'
        }));
        return;
      }

      // Convert to ImportData format
      const importData = ImportService.createImportData(parsedData.books);
      console.log('Import data created:', {
        booksCount: importData.books.length,
        firstBook: importData.books[0],
        importData
      });

      // Import to storage
      console.log('Calling storage.importData...');
      const result = await storageService.importData(importData, state.importOptions);
      
      // Calculate streak impact after successful import
      try {
        const booksWithDates = parsedData.books.filter(book => book.dateStarted && book.dateFinished);
        if (booksWithDates.length > 0) {
          const existingBooks = await storageService.getBooks();
          const streakResult = ImportService.processImportWithStreaks(
            booksWithDates,
            existingBooks
          );
          result.streakResult = streakResult.streakResult;
        }
      } catch (error) {
        console.warn('Failed to calculate streak impact:', error);
      }
      
      console.log('Import result:', result);

      setState(prev => ({
        ...prev,
        importResult: result,
        step: 'complete',
        isProcessing: false
      }));

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Import Successful',
          message: `Successfully imported ${result.imported} books`
        });
        onImportComplete(result);
        
        // Refresh the page after a short delay to show the updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        addToast({
          type: 'error',
          title: 'Import Failed',
          message: `Import failed with ${result.errors.length} errors`
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Import failed',
        isProcessing: false,
        step: 'preview'
      }));
    }
  };

  const getCsvDataFromFile = async (file: File): Promise<any[]> => {
    console.log('Reading CSV file:', file.name, file.size, 'bytes');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('FileReader onload triggered');
        if (e.target?.result) {
          try {
            // Get the full data, not just the sample
            console.log('Parsing CSV with Papa Parse...');
            const results = Papa.parse(e.target.result as string, { header: true, skipEmptyLines: true });
            console.log('Papa Parse results:', { data: results.data.length, errors: results.errors.length });
            resolve(results.data);
          } catch (parseError) {
            console.error('Papa Parse error:', parseError);
            reject(parseError);
          }
        } else {
          console.error('FileReader result is empty');
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read file'));
      };
      console.log('Starting to read file as text...');
      reader.readAsText(file);
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = `Title,Author,Status,Progress,Rating,Notes,Date Started,Date Finished
"The Great Gatsby","F. Scott Fitzgerald","finished",100,5,"Classic American novel","2024-01-01","2024-01-15"
"1984","George Orwell","currently_reading",65,,"Dystopian masterpiece","2024-01-16",
"To Kill a Mockingbird","Harper Lee","want_to_read",0,,"On my reading list",,
"The Catcher in the Rye","J.D. Salinger","finished",100,4,"Coming-of-age story","2024-02-01","2024-02-10"
"Brave New World","Aldous Huxley","want_to_read",0,,"Science fiction classic",,
"Dune","Frank Herbert","finished",100,5,"Epic sci-fi saga","2024-02-15","2024-03-01"
"Pride and Prejudice","Jane Austen","finished",100,4,"Romance classic","2024-03-05","2024-03-12"`;

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'puka-sample-import.csv';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    addToast({
      type: 'success',
      title: 'Sample Downloaded',
      message: 'Sample CSV file downloaded successfully'
    });
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-text-primary mb-2">Import Your Reading Data</h3>
        <p className="text-text-secondary text-sm">
          Upload a CSV file from Goodreads, another reading app, or your own data export
        </p>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          state.isProcessing 
            ? 'border-gray-200 bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !state.isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={state.isProcessing}
        />

        {state.isProcessing ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-text-secondary">Processing file...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-medium">Drop CSV file here or click to upload</p>
              <p className="text-text-secondary text-sm mt-1">Supports Goodreads exports and other CSV formats</p>
              <p className="text-blue-600 text-xs mt-1">💡 Include "Date Started" and "Date Finished" columns to enhance your reading streaks!</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-surface rounded-lg">
          <div className="text-2xl mb-2">📚</div>
          <p className="font-medium text-text-primary">Goodreads</p>
          <p className="text-text-secondary">Direct CSV export support</p>
        </div>
        <div className="text-center p-3 bg-surface rounded-lg">
          <div className="text-2xl mb-2">📊</div>
          <p className="font-medium text-text-primary">Spreadsheets</p>
          <p className="text-text-secondary">Excel, Google Sheets, etc.</p>
        </div>
        <div className="text-center p-3 bg-surface rounded-lg">
          <div className="text-2xl mb-2">⚙️</div>
          <p className="font-medium text-text-primary">Custom</p>
          <p className="text-text-secondary">Any CSV with column mapping</p>
        </div>
      </div>

      {/* CSV Format Example */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-primary mb-2">Expected CSV Format Example:</h4>
        <div className="bg-white rounded border border-gray-200 p-3 font-mono text-xs overflow-x-auto">
          <div className="text-gray-600">Title,Author,Status,Progress,Rating,Notes,Date Started,Date Finished</div>
          <div className="text-gray-800">"The Great Gatsby","F. Scott Fitzgerald","finished",100,5,"Classic","2024-01-01","2024-01-15"</div>
          <div className="text-gray-800">"1984","George Orwell","currently_reading",65,,"Dystopian","2024-01-16",</div>
          <div className="text-gray-800">"To Kill a Mockingbird","Harper Lee","want_to_read",0,,"On my list",,</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs text-text-secondary">
          <div>
            <p><strong>Required:</strong> Title, Author</p>
            <p><strong>Status:</strong> "want_to_read", "currently_reading", "finished"</p>
            <p><strong>Progress:</strong> 0-100 | <strong>Rating:</strong> 1-5</p>
          </div>
          <div className="text-blue-600">
            <p><strong>📈 For Reading Streaks:</strong></p>
            <p><strong>Date Started:</strong> YYYY-MM-DD format</p>
            <p><strong>Date Finished:</strong> YYYY-MM-DD format</p>
            <p className="mt-1">Dates will add reading days to your streak history!</p>
          </div>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="mt-3 px-3 py-2 text-xs bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          📥 Download Sample CSV (with streak dates)
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!state.preview) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">Import Preview</h3>
          <button
            onClick={() => setState(prev => ({ ...prev, step: 'upload' }))}
            className="text-text-secondary hover:text-text-primary text-sm"
          >
            ← Choose different file
          </button>
        </div>

        <div className="bg-surface p-4 rounded-lg">
          <h4 className="font-medium text-text-primary mb-3">Detection Results</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Format:</span>
              <span className="ml-2 font-medium text-text-primary">
                {state.selectedFormat?.name || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Total rows:</span>
              <span className="ml-2 font-medium text-text-primary">{state.preview.totalRows}</span>
            </div>
            <div>
              <span className="text-text-secondary">Valid rows:</span>
              <span className="ml-2 font-medium text-green-600">{state.preview.validRows}</span>
            </div>
            <div>
              <span className="text-text-secondary">Errors:</span>
              <span className="ml-2 font-medium text-red-600">{state.preview.errors.length}</span>
            </div>
          </div>
        </div>

        {state.preview.errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Import Warnings</h4>
            <div className="space-y-1 text-sm text-yellow-700">
              {state.preview.errors.slice(0, 3).map((error, index) => (
                <p key={index}>Row {error.row}: {error.message}</p>
              ))}
              {state.preview.errors.length > 3 && (
                <p>... and {state.preview.errors.length - 3} more errors</p>
              )}
            </div>
          </div>
        )}

        {state.preview.streakPreview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-3">📈 Reading Streak Preview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Books with dates:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {state.preview.streakPreview.stats.booksWithDates}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Total reading days:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {state.preview.streakPreview.totalDaysToAdd}
                </span>
              </div>
              {state.preview.streakPreview.dateRange.earliest && (
                <div className="col-span-2">
                  <span className="text-blue-700">Date range:</span>
                  <span className="ml-2 font-medium text-blue-900">
                    {state.preview.streakPreview.dateRange.earliest.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} - {' '}
                    {state.preview.streakPreview.dateRange.latest?.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              {state.preview.streakPreview.stats.overlappingPeriods > 0 && (
                <div className="col-span-2">
                  <span className="text-blue-700">Overlapping periods:</span>
                  <span className="ml-2 font-medium text-blue-900">
                    {state.preview.streakPreview.stats.overlappingPeriods} (reading multiple books simultaneously)
                  </span>
                </div>
              )}
            </div>
            
            {state.preview.streakPreview.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h5 className="font-medium text-blue-800 mb-2">⚠️ Streak Warnings</h5>
                <div className="space-y-1 text-sm text-blue-700">
                  {state.preview.streakPreview.warnings.slice(0, 3).map((warning, index) => (
                    <p key={index}>• {warning.message}</p>
                  ))}
                  {state.preview.streakPreview.warnings.length > 3 && (
                    <p>... and {state.preview.streakPreview.warnings.length - 3} more warnings</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {state.preview.sampleBooks.length > 0 && (
          <div>
            <h4 className="font-medium text-text-primary mb-3">Books to Import</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.preview.sampleBooks.map((book, index) => (
                <div key={index} className="bg-white border rounded-lg p-3">
                  <div className="font-medium text-text-primary">{book.title}</div>
                  <div className="text-sm text-text-secondary">
                    by {book.author} • {book.status?.replace('_', ' ')} • {book.progress}%
                    {book.dateStarted && book.dateFinished && (
                      <span className="ml-2 text-blue-600">
                        📚 {new Date(book.dateStarted).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })} - {new Date(book.dateFinished).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={state.isProcessing || state.preview.validRows === 0}
            className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {state.preview.validRows} Books
            {state.preview.streakPreview && state.preview.streakPreview.totalDaysToAdd > 0 && (
              <span className="text-xs opacity-90 block">
                + {state.preview.streakPreview.totalDaysToAdd} reading days
              </span>
            )}
          </button>
          {state.preview.suggestedFormat?.id === 'generic' && (
            <button
              onClick={() => setState(prev => ({ ...prev, step: 'mapping' }))}
              className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary-light"
            >
              Custom Mapping
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMappingStep = () => {
    if (!state.preview) return null;

    const bookFields = [
      { value: 'title', label: 'Title' },
      { value: 'author', label: 'Author' },
      { value: 'status', label: 'Status' },
      { value: 'progress', label: 'Progress (%)' },
      { value: 'rating', label: 'Rating (1-5)' },
      { value: 'notes', label: 'Notes/Review' },
      { value: 'isbn', label: 'ISBN' },
      { value: 'genre', label: 'Genre' },
      { value: 'totalPages', label: 'Total Pages' },
      { value: 'publishedDate', label: 'Published Date' },
      { value: 'dateAdded', label: 'Date Added' },
      { value: 'dateFinished', label: 'Date Finished' }
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">Column Mapping</h3>
          <button
            onClick={() => setState(prev => ({ ...prev, step: 'preview' }))}
            className="text-text-secondary hover:text-text-primary text-sm"
          >
            ← Back to preview
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            Map your CSV columns to book fields. Only Title is required - other fields are optional.
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {state.preview.columns.map((column) => (
            <div key={column} className="flex items-center space-x-3 p-3 bg-surface rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-text-primary">{column}</span>
              </div>
              <div className="flex-1">
                <select
                  value={state.customMapping[column] || ''}
                  onChange={(e) => handleColumnMappingChange(column, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">— Not mapped —</option>
                  {bookFields.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleImport}
          disabled={state.isProcessing || !state.customMapping.title}
          className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import with Custom Mapping
        </button>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="space-y-6 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-2">Importing Books...</h3>
        <p className="text-text-secondary">Please wait while we import your reading data.</p>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!state.importResult) return null;

    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto text-green-500">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Import Complete!</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>✅ {state.importResult.imported} books imported successfully</p>
            {state.importResult.skipped > 0 && (
              <p>⏭️ {state.importResult.skipped} books skipped</p>
            )}
            {state.importResult.duplicates > 0 && (
              <p>📚 {state.importResult.duplicates} duplicates found</p>
            )}
            {state.importResult.errors.length > 0 && (
              <p>⚠️ {state.importResult.errors.length} errors occurred</p>
            )}
            {state.importResult.streakResult && state.importResult.streakResult.daysAdded > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">📈 Reading Streak Enhanced!</p>
                <div className="text-xs text-blue-700 mt-1 space-y-1">
                  <p>📅 {state.importResult.streakResult.daysAdded} reading days added to your history</p>
                  {state.importResult.streakResult.newCurrentStreak !== state.importResult.streakResult.oldCurrentStreak && (
                    <p>🔥 Current streak: {state.importResult.streakResult.oldCurrentStreak} → {state.importResult.streakResult.newCurrentStreak} days</p>
                  )}
                  {state.importResult.streakResult.newLongestStreak !== state.importResult.streakResult.oldLongestStreak && (
                    <p>🏆 Longest streak: {state.importResult.streakResult.oldLongestStreak} → {state.importResult.streakResult.newLongestStreak} days</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark"
        >
          Done
        </button>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (state.step) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'mapping':
        return renderMappingStep();
      case 'importing':
        return renderImportingStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderUploadStep();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Import Books</h2>
            <button
              onClick={handleClose}
              className="text-text-secondary hover:text-text-primary"
              disabled={state.isProcessing}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;