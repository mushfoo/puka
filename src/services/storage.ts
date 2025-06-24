import type { ReadingData, Book } from '../types';

export interface StorageService {
  save(data: ReadingData): Promise<void>;
  load(): Promise<ReadingData>;
  export(format: 'json' | 'csv'): Promise<string>;
  import(data: string, format: 'json' | 'csv'): Promise<void>;
}

export class FileSystemStorageService implements StorageService {
  private fileHandle: FileSystemFileHandle | null = null;

  async save(data: ReadingData): Promise<void> {
    try {
      if (!this.fileHandle) {
        await this.selectFile();
      }
      
      if (!this.fileHandle) {
        throw new Error('No file selected');
      }

      const dataWithTimestamp = {
        ...data,
        lastModified: new Date().toISOString(),
      };

      const writable = await this.fileHandle.createWritable();
      await writable.write(JSON.stringify(dataWithTimestamp, null, 2));
      await writable.close();
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }

  async load(): Promise<ReadingData> {
    try {
      if (!this.fileHandle) {
        await this.selectFile();
      }

      if (!this.fileHandle) {
        return this.getDefaultData();
      }

      const file = await this.fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text) as ReadingData;
      
      return this.validateData(data);
    } catch (error) {
      console.error('Failed to load data:', error);
      return this.getDefaultData();
    }
  }

  async export(format: 'json' | 'csv'): Promise<string> {
    const data = await this.load();
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    if (format === 'csv') {
      return this.convertToCSV(data.books);
    }
    
    throw new Error(`Unsupported format: ${format}`);
  }

  async import(data: string, format: 'json' | 'csv'): Promise<void> {
    let readingData: ReadingData;
    
    if (format === 'json') {
      readingData = JSON.parse(data) as ReadingData;
    } else if (format === 'csv') {
      const books = this.parseCSV(data);
      readingData = {
        ...this.getDefaultData(),
        books,
      };
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    await this.save(this.validateData(readingData));
  }

  private async selectFile(): Promise<void> {
    if (!('showSaveFilePicker' in window)) {
      throw new Error('File System Access API not supported');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: 'puka-reading-data.json',
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] },
        }],
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        throw error;
      }
    }
  }

  private getDefaultData(): ReadingData {
    return {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      books: [],
      streaks: {
        current: 0,
        longest: 0,
        lastUpdate: new Date().toISOString(),
      },
      settings: {
        theme: 'light',
        notifications: true,
      },
    };
  }

  private validateData(data: ReadingData): ReadingData {
    const defaultData = this.getDefaultData();
    
    return {
      version: data.version || defaultData.version,
      lastModified: data.lastModified || defaultData.lastModified,
      books: Array.isArray(data.books) ? data.books : defaultData.books,
      streaks: data.streaks || defaultData.streaks,
      settings: { ...defaultData.settings, ...data.settings },
    };
  }

  private convertToCSV(books: Book[]): string {
    const headers = ['Title', 'Author', 'Status', 'Progress', 'Start Date', 'Finish Date', 'Notes'];
    const rows = books.map(book => [
      book.title,
      book.author,
      book.status,
      book.progress.toString(),
      book.startDate || '',
      book.finishDate || '',
      book.notes || '',
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  private parseCSV(data: string): Book[] {
    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const books: Book[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      
      if (values.length >= 2) {
        books.push({
          id: Date.now() + i,
          title: values[0] || '',
          author: values[1] || '',
          status: (values[2] as Book['status']) || 'want-to-read',
          progress: parseInt(values[3]) || 0,
          startDate: values[4] || undefined,
          finishDate: values[5] || undefined,
          notes: values[6] || undefined,
        });
      }
    }
    
    return books;
  }
}

export const storageService = new FileSystemStorageService();