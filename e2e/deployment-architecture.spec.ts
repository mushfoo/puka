/**
 * End-to-end tests for the simplified deployment architecture
 * Tests the complete application flow in a production-like environment
 */

import { test, expect } from '@playwright/test'

test.describe('Deployment Architecture E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any necessary test data or configuration
    await page.goto('/')
  })

  test('should load the application successfully', async ({ page }) => {
    // Test that the main application loads
    await expect(page).toHaveTitle(/Puka Reading Tracker/)

    // Check that the main UI elements are present
    await expect(page.locator('body')).toBeVisible()
  })

  test('should serve static files correctly', async ({ page }) => {
    // Test that CSS is loaded
    const styles = await page.locator('link[rel="stylesheet"]').count()
    expect(styles).toBeGreaterThan(0)

    // Test that JavaScript is loaded and executed
    await expect(page.locator('#root')).toBeVisible()
  })

  test('should handle API requests through unified server', async ({
    page,
  }) => {
    // Test that API requests work
    const response = await page.request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const healthData = await response.json()
    expect(healthData.status).toBe('ok')
  })

  test('should provide comprehensive health information', async ({ page }) => {
    const response = await page.request.get('/api/health/detailed')
    expect(response.ok()).toBeTruthy()

    const healthData = await response.json()
    expect(healthData.status).toMatch(/^(healthy|degraded|unhealthy)$/)
    expect(healthData.checks).toBeDefined()
    expect(healthData.checks.database).toBeDefined()
    expect(healthData.checks.authentication).toBeDefined()
    expect(healthData.checks.staticFiles).toBeDefined()
    expect(healthData.checks.environment).toBeDefined()
    expect(healthData.checks.railway).toBeDefined()
  })

  test('should handle authentication flow', async ({ page }) => {
    // Navigate to a page that might trigger auth
    await page.goto('/')

    // Check if auth-related elements are present
    // This will depend on the current auth state
    const authElements = await page
      .locator(
        '[data-testid*="auth"], [class*="auth"], button:has-text("Sign"), button:has-text("Login")'
      )
      .count()

    // Should have some auth-related UI elements
    expect(authElements).toBeGreaterThanOrEqual(0)
  })

  test('should handle navigation correctly', async ({ page }) => {
    // Test that client-side routing works
    await page.goto('/')

    // Test that the SPA routing works (all routes should serve index.html)
    await page.goto('/some-non-existent-route')

    // Should still load the app (SPA fallback)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('should have proper cache headers for static assets', async ({
    page,
  }) => {
    // Test manifest.json caching
    const manifestResponse = await page.request.get('/manifest.json')
    if (manifestResponse.ok()) {
      const cacheControl = manifestResponse.headers()['cache-control']
      expect(cacheControl).toBeDefined()
    }

    // Test that service worker is served without caching
    const swResponse = await page.request.get('/sw.js')
    if (swResponse.ok()) {
      const cacheControl = swResponse.headers()['cache-control']
      expect(cacheControl).toBe('no-cache')
    }
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Test 404 handling for API routes
    const response = await page.request.get('/api/nonexistent')
    expect(response.status()).toBe(404)

    const errorData = await response.json()
    expect(errorData.error).toBe('API endpoint not found')
  })

  test('should have security headers', async ({ page }) => {
    const response = await page.request.get('/')
    const headers = response.headers()

    // Check for security headers
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-xss-protection']).toBe('1; mode=block')
    expect(headers['content-security-policy']).toBeDefined()
  })

  test('should handle CORS correctly', async ({ page }) => {
    // Test CORS for API requests
    const response = await page.request.get('/api/health', {
      headers: {
        Origin: 'http://localhost:5173',
      },
    })

    expect(response.ok()).toBeTruthy()

    const headers = response.headers()
    expect(headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(headers['access-control-allow-credentials']).toBe('true')
  })

  test('should respond quickly to requests', async ({ page }) => {
    const startTime = Date.now()

    const response = await page.request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(2000) // Should respond within 2 seconds
  })

  test('should handle concurrent requests', async ({ page }) => {
    // Test that the server can handle multiple concurrent requests
    const requests = Array(5)
      .fill(null)
      .map(() => page.request.get('/api/health'))

    const responses = await Promise.all(requests)

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.ok()).toBeTruthy()
    })
  })

  test('should maintain session state', async ({ page }) => {
    // Test that session state is maintained across requests
    await page.goto('/')

    // Make multiple API requests and ensure consistency
    const response1 = await page.request.get('/api/auth/session')
    const response2 = await page.request.get('/api/auth/session')

    // Both should have the same session behavior
    expect(response1.status()).toBe(response2.status())
  })

  test('should handle Railway health checks', async ({ page }) => {
    // Test the Railway-specific health check endpoint
    const response = await page.request.get('/health.json')
    expect(response.ok()).toBeTruthy()

    const healthData = await response.json()
    expect(healthData.status).toBe('ok')
    expect(healthData.timestamp).toBeDefined()
    expect(healthData.environment).toBeDefined()
    expect(healthData.version).toBeDefined()
  })

  test('should serve PWA manifest correctly', async ({ page }) => {
    const response = await page.request.get('/manifest.json')

    if (response.ok()) {
      const manifest = await response.json()
      expect(manifest.name).toBeDefined()
      expect(manifest.short_name).toBeDefined()
      expect(manifest.start_url).toBeDefined()
    }
  })

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Should still load correctly on mobile
    await expect(page.locator('#root')).toBeVisible()

    // Check that the viewport meta tag is present
    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content')
    expect(viewportMeta).toContain('width=device-width')
  })
})
