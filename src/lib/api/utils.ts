/**
 * Get the base URL for the application
 * In development, this will be the Vite dev server URL
 * In production, this should come from environment variables
 */
export function getAppBaseUrl(): string {
  // In a browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // In a server environment
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Default to localhost for development
  const port = process.env.PORT || 5173;
  return `http://localhost:${port}`;
}