import React, { useState } from 'react';
import { Book } from '@/types';
import { ExportData } from '@/services/storage/StorageService';
import { ExportService, ExportOptions } from '@/services/exportService';
import { useToast } from '@/hooks/useToast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  exportData: ExportData;
}

type ExportFormat = 'csv' | 'json' | 'goodreads-csv';

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: string;
}

const formatOptions: FormatOption[] = [
  {
    value: 'csv',
    label: 'CSV (Spreadsheet)',
    description: 'Compatible with Excel, Google Sheets, and most reading apps',
    icon: '📊'
  },
  {
    value: 'json',
    label: 'JSON (Complete Data)',
    description: 'Full data backup including metadata and settings',
    icon: '💾'
  },
  {
    value: 'goodreads-csv',
    label: 'Goodreads CSV',
    description: 'Compatible with Goodreads import format',
    icon: '📚'
  }
];

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  books,
  exportData
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let result;
      
      if (selectedFormat === 'goodreads-csv') {
        result = await ExportService.exportToGoodreads(books);
      } else {
        const options: ExportOptions = {
          format: selectedFormat === 'csv' ? 'csv' : 'json',
          includeMetadata,
          includeSettings: selectedFormat === 'json' ? includeSettings : false,
          filename: customFilename || undefined
        };
        
        result = await ExportService.exportBooks(books, exportData, options);
      }
      
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Export Successful',
          message: `Your library has been exported to ${result.filename}`
        });
        onClose();
      } else {
        showToast({
          type: 'error',
          title: 'Export Failed',
          message: result.error || 'An unknown error occurred during export'
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFileExtension = (format: ExportFormat): string => {
    switch (format) {
      case 'csv':
      case 'goodreads-csv':
        return '.csv';
      case 'json':
        return '.json';
      default:
        return '';
    }
  };

  const generateFilename = (): string => {
    if (customFilename) {
      const ext = getFileExtension(selectedFormat);
      return customFilename.endsWith(ext) ? customFilename : `${customFilename}${ext}`;
    }
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const prefix = selectedFormat === 'goodreads-csv' ? 'goodreads-export' : 'puka-books';
    return `${prefix}-${timestamp}${getFileExtension(selectedFormat)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Export Library</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
              disabled={isExporting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Export Summary */}
            <div className="bg-surface p-4 rounded-lg">
              <h3 className="font-medium text-text-primary mb-2">Export Summary</h3>
              <div className="text-sm text-text-secondary space-y-1">
                <p>📚 {books.length} books total</p>
                <p>🎯 {books.filter(b => b.status === 'want_to_read').length} want to read</p>
                <p>📖 {books.filter(b => b.status === 'currently_reading').length} currently reading</p>
                <p>✅ {books.filter(b => b.status === 'finished').length} finished</p>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Export Format
              </label>
              <div className="space-y-3">
                {formatOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedFormat === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedFormat(option.value)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        id={option.value}
                        name="format"
                        value={option.value}
                        checked={selectedFormat === option.value}
                        onChange={() => setSelectedFormat(option.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{option.icon}</span>
                          <label htmlFor={option.value} className="font-medium text-text-primary cursor-pointer">
                            {option.label}
                          </label>
                        </div>
                        <p className="text-sm text-text-secondary mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            {selectedFormat !== 'goodreads-csv' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Export Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-primary">Include metadata (export date, version)</span>
                  </label>
                  
                  {selectedFormat === 'json' && (
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={includeSettings}
                        onChange={(e) => setIncludeSettings(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text-primary">Include user settings</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Custom Filename */}
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-text-primary mb-2">
                Filename (optional)
              </label>
              <input
                id="filename"
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={generateFilename()}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-text-secondary mt-1">
                Preview: {generateFilename()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleExport}
                disabled={isExporting || books.length === 0}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Exporting...</span>
                  </div>
                ) : (
                  `Export ${books.length} Books`
                )}
              </button>
              
              <button
                onClick={onClose}
                disabled={isExporting}
                className="px-4 py-3 border border-border text-text-secondary rounded-lg font-medium hover:bg-surface focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>

            {books.length === 0 && (
              <div className="text-center py-4">
                <p className="text-text-secondary">No books to export. Add some books first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;