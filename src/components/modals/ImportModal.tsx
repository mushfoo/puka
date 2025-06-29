import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ImportService, ImportFormat, ImportPreview, ColumnMapping } from '@/services/importService';
import { ImportOptions, ImportResult } from '@/services/storage/StorageService';
import { createStorageService } from '@/services/storage';
import { useToast } from '@/hooks/useToast';

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
  const storageService = useMemo(() => createStorageService(), []);

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
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setState(prev => ({ ...prev, error: 'Please select a CSV file' }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null, file }));

    try {
      const preview = await ImportService.parseCSVFile(file);
      
      setState(prev => ({
        ...prev,
        preview,
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
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, step: 'importing', error: null }));

    try {
      // Use custom mapping if in mapping mode
      const format = state.step === 'mapping' 
        ? ImportService.createCustomFormat(state.customMapping)
        : state.selectedFormat;

      // Process the CSV data
      const parsedData = ImportService.processImportData(
        state.preview.totalRows > 0 ? await getCsvData() : [],
        format,
        state.importOptions
      );

      if (parsedData.errors.length > 0 && !state.importOptions.skipInvalid) {
        setState(prev => ({
          ...prev,
          error: `Import failed: ${parsedData.errors[0].message}`,
          isProcessing: false
        }));
        return;
      }

      // Convert to ImportData format
      const importData = ImportService.createImportData(parsedData.books);

      // Import to storage
      const result = await storageService.importData(importData, state.importOptions);

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
      } else {
        addToast({
          type: 'error',
          title: 'Import Failed',
          message: `Import failed with ${result.errors.length} errors`
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Import failed',
        isProcessing: false,
        step: 'preview'
      }));
    }
  };

  const getCsvData = async (): Promise<any[]> => {
    if (!state.file) return [];
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          // Get the full data, not just the sample
          const Papa = require('papaparse');
          const results = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
          resolve(results.data);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(state.file!); // We already checked for null above
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

        {state.preview.sampleBooks.length > 0 && (
          <div>
            <h4 className="font-medium text-text-primary mb-3">Sample Books</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {state.preview.sampleBooks.slice(0, 3).map((book, index) => (
                <div key={index} className="bg-white border rounded-lg p-3">
                  <div className="font-medium text-text-primary">{book.title}</div>
                  <div className="text-sm text-text-secondary">
                    by {book.author} • {book.status?.replace('_', ' ')} • {book.progress}%
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