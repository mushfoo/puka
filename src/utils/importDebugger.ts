/**
 * Debug logging utility for import functionality
 */

export interface ImportDebugInfo {
  phase: string;
  data?: any;
  timestamp: number;
  message?: string;
}

class ImportDebugLogger {
  private logs: ImportDebugInfo[] = [];
  private enabled: boolean = false;

  constructor() {
    // Enable debugging in development mode
    this.enabled = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  log(phase: string, data?: any, message?: string): void {
    if (!this.enabled) return;

    const logEntry: ImportDebugInfo = {
      phase,
      data: data ? this.serializeData(data) : undefined,
      timestamp: Date.now(),
      message
    };

    this.logs.push(logEntry);
    
    // Console logging for immediate feedback
    const prefix = `[Import Debug - ${phase}]`;
    if (message) {
      console.log(prefix, message);
    }
    if (data) {
      console.log(prefix, 'Data:', data);
    }
  }

  private serializeData(data: any): any {
    try {
      // Handle special objects that can't be JSON stringified
      if (data instanceof File) {
        return {
          name: data.name,
          size: data.size,
          type: data.type,
          lastModified: data.lastModified
        };
      }
      
      if (data instanceof Set) {
        return Array.from(data);
      }
      
      if (data instanceof Map) {
        return Object.fromEntries(data);
      }
      
      if (data instanceof Date) {
        return data.toISOString();
      }

      // For regular objects, return as-is
      return data;
    } catch (error) {
      return { error: 'Failed to serialize data', original: String(data) };
    }
  }

  getLogs(): ImportDebugInfo[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogsSummary(): string {
    if (this.logs.length === 0) {
      return 'No import debug logs available';
    }

    const phases = this.logs.map(log => log.phase);
    const uniquePhases = [...new Set(phases)];
    
    return `Import Debug Summary:
- Total log entries: ${this.logs.length}
- Phases covered: ${uniquePhases.join(', ')}
- Duration: ${this.logs[this.logs.length - 1]?.timestamp - this.logs[0]?.timestamp}ms
- First log: ${new Date(this.logs[0].timestamp).toISOString()}
- Last log: ${new Date(this.logs[this.logs.length - 1].timestamp).toISOString()}`;
  }

  downloadLogs(): void {
    const logsData = {
      summary: this.getLogsSummary(),
      logs: this.logs,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(logsData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `puka-import-debug-${Date.now()}.json`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const importDebugger = new ImportDebugLogger();

// Export convenience functions
export const logImportPhase = (phase: string, data?: any, message?: string) => {
  importDebugger.log(phase, data, message);
};

export const getImportLogs = () => importDebugger.getLogs();
export const clearImportLogs = () => importDebugger.clearLogs();
export const downloadImportLogs = () => importDebugger.downloadLogs();
export const getImportLogsSummary = () => importDebugger.getLogsSummary();