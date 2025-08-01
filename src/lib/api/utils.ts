import { getServerConfig } from '../config/environment.js'

/**
 * Get the base URL for the application
 * Uses centralized environment configuration
 */
export function getAppBaseUrl(): string {
  // In a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // In a server environment, use centralized config
  const config = getServerConfig()
  return config.appUrl
}
