import Plausible from 'plausible-tracker'

// Analytics configuration
const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true'
const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || 'localhost'
const OPT_OUT_AVAILABLE = import.meta.env.VITE_ANALYTICS_OPT_OUT_AVAILABLE === 'true'

// Local storage key for opt-out preference
const OPT_OUT_KEY = 'puka-analytics-opt-out'

// Initialize Plausible tracker
const plausible = Plausible({
  domain: PLAUSIBLE_DOMAIN,
  trackLocalhost: false,
  apiHost: 'https://plausible.io'
})

// Check if user has opted out
export const hasOptedOut = (): boolean => {
  if (!OPT_OUT_AVAILABLE) return false
  return localStorage.getItem(OPT_OUT_KEY) === 'true'
}

// Set opt-out preference
export const setOptOut = (optOut: boolean): void => {
  if (!OPT_OUT_AVAILABLE) return
  if (optOut) {
    localStorage.setItem(OPT_OUT_KEY, 'true')
  } else {
    localStorage.removeItem(OPT_OUT_KEY)
  }
}

// Check if analytics should be tracked
const shouldTrack = (): boolean => {
  return ANALYTICS_ENABLED && !hasOptedOut()
}

// Track page views
export const trackPageView = (options?: { url?: string; referrer?: string }): void => {
  if (!shouldTrack()) return
  
  try {
    plausible.trackPageview(options)
  } catch (error) {
    console.warn('Analytics: Failed to track page view', error)
  }
}

// Track custom events
export const trackEvent = (eventName: string, props?: Record<string, string | number>): void => {
  if (!shouldTrack()) return
  
  try {
    plausible.trackEvent(eventName, { props })
  } catch (error) {
    console.warn('Analytics: Failed to track event', error)
  }
}

// Feature-specific tracking functions
export const trackBookAction = (action: 'add' | 'edit' | 'delete' | 'progress_update'): void => {
  trackEvent('Book Action', { action })
}

export const trackReadingAction = (action: 'mark_day' | 'update_streak' | 'view_calendar'): void => {
  trackEvent('Reading Action', { action })
}

export const trackImportExport = (action: 'import' | 'export', format?: string): void => {
  trackEvent('Data Transfer', { action, format: format || 'unknown' })
}

export const trackSearch = (hasResults: boolean): void => {
  trackEvent('Search', { has_results: hasResults ? 'true' : 'false' })
}

export const trackFilter = (filter: string): void => {
  trackEvent('Filter', { filter })
}

export const trackQuickAction = (action: string): void => {
  trackEvent('Quick Action', { action })
}

// Performance tracking
export const trackPerformance = (metric: string, value: number): void => {
  if (!shouldTrack()) return
  
  // Only track significant performance metrics
  if (metric === 'page_load_time' && value > 2000) {
    trackEvent('Performance Warning', { metric, value: Math.round(value) })
  }
}

// Error tracking (privacy-safe)
export const trackError = (errorType: string, component?: string): void => {
  if (!shouldTrack()) return
  
  trackEvent('Error', { 
    type: errorType,
    component: component || 'unknown'
  })
}

// Export analytics state for UI components
export const getAnalyticsState = () => ({
  enabled: ANALYTICS_ENABLED,
  optOutAvailable: OPT_OUT_AVAILABLE,
  hasOptedOut: hasOptedOut(),
  domain: PLAUSIBLE_DOMAIN
})

// Initialize analytics on app start
export const initializeAnalytics = (): void => {
  if (!shouldTrack()) {
    console.log('Analytics: Disabled or opted out')
    return
  }
  
  console.log('Analytics: Initialized with Plausible')
  
  // Track initial page view
  trackPageView()
  
  // Track app version for feature adoption
  trackEvent('App Load', { 
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    environment: import.meta.env.VITE_APP_ENV || 'development'
  })
}