import { UserFriendlyError, ErrorType } from '../../types'

interface ErrorReport {
  id: string
  timestamp: Date
  error: UserFriendlyError
  userAgent: string
  url: string
  userId?: string
  sessionId: string
}

export class ErrorReporter {
  private reports: ErrorReport[] = []
  private maxReports = 100
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  /**
   * Report an error for debugging and monitoring
   */
  reportError(error: UserFriendlyError, userId?: string): void {
    const report: ErrorReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId,
      sessionId: this.sessionId,
    }

    this.reports.push(report)

    // Keep only the most recent reports
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report: ${error.title}`)
      console.error('Error:', error)
      console.log('Report:', report)
      console.groupEnd()
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(report)
    }
  }

  /**
   * Get error frequency statistics
   */
  getErrorStats(): Record<ErrorType, number> {
    const stats: Record<ErrorType, number> = {
      [ErrorType.AUTHENTICATION]: 0,
      [ErrorType.NETWORK]: 0,
      [ErrorType.RATE_LIMIT]: 0,
      [ErrorType.SERVER]: 0,
      [ErrorType.STORAGE]: 0,
    }

    this.reports.forEach((report) => {
      stats[report.error.type]++
    })

    return stats
  }

  /**
   * Get recent error reports
   */
  getRecentReports(limit = 10): ErrorReport[] {
    return this.reports.slice(-limit)
  }

  /**
   * Clear all error reports
   */
  clearReports(): void {
    this.reports = []
  }

  /**
   * Export error reports for debugging
   */
  exportReports(): string {
    return JSON.stringify(
      {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        reports: this.reports,
        stats: this.getErrorStats(),
      },
      null,
      2
    )
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async sendToMonitoringService(report: ErrorReport): Promise<void> {
    try {
      // This would integrate with a monitoring service like Sentry, LogRocket, etc.
      // For now, we'll just store it locally
      const existingReports = localStorage.getItem('puka-error-reports')
      const reports = existingReports ? JSON.parse(existingReports) : []
      reports.push(report)

      // Keep only the last 50 reports in localStorage
      const recentReports = reports.slice(-50)
      localStorage.setItem('puka-error-reports', JSON.stringify(recentReports))
    } catch (error) {
      console.warn('Failed to send error report to monitoring service:', error)
    }
  }
}

// Singleton instance
export const errorReporter = new ErrorReporter()
