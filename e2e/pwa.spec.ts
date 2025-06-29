import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  test('should have PWA manifest', async ({ page }) => {
    await page.goto('/');
    
    // Check for manifest link in head
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
    
    // Check manifest content
    const response = await page.request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest.name).toBe('Puka Reading Tracker');
    expect(manifest.short_name).toBe('Puka');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
  });

  test('should have service worker', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration
    await page.waitForTimeout(2000);
    
    // Check if service worker is registered
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.ready.then(registration => {
        return !!registration;
      });
    });
    
    expect(swRegistration).toBe(true);
  });

  test('should have proper PWA meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check theme color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#3b82f6');
    
    // Check description
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /reading tracker/i);
    
    // Check Apple PWA meta tags
    const appleCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleCapable).toHaveAttribute('content', 'yes');
    
    const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(appleTitle).toHaveAttribute('content', 'Puka');
  });

  test('should work offline (basic functionality)', async ({ page, context }) => {
    await page.goto('/');
    
    // Wait for service worker to be ready
    await page.waitForTimeout(3000);
    
    // Add a book while online
    await page.click('button:has-text("Add Book")');
    await page.fill('input[placeholder*="title"]', 'Offline Test Book');
    await page.fill('input[placeholder*="author"]', 'Offline Author');
    await page.click('button:has-text("Add Book"):not(:has-text("Cancel"))');
    
    await page.waitForTimeout(500);
    
    // Simulate offline condition
    await context.setOffline(true);
    
    // Reload page to test offline functionality
    await page.reload();
    
    // Check if page still loads (service worker cache)
    await expect(page.locator('h1')).toBeVisible();
    
    // Check if previously added book is still visible (localStorage)
    await expect(page.locator('text=Offline Test Book')).toBeVisible();
    
    // Restore online connection
    await context.setOffline(false);
  });

  test('should have proper viewport settings for mobile', async ({ page }) => {
    await page.goto('/');
    
    // Check viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
    await expect(viewport).toHaveAttribute('content', /initial-scale=1/);
  });

  test('should handle installability prompt (if supported)', async ({ page }) => {
    await page.goto('/');
    
    // Listen for beforeinstallprompt event
    await page.evaluate(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        (window as any).installPromptEvent = e;
      });
    });
    
    // Wait a bit for potential install prompt
    await page.waitForTimeout(2000);
    
    // Check if install prompt is available (not all browsers/conditions will trigger this)
    const hasInstallPrompt = await page.evaluate(() => {
      return !!(window as any).installPromptEvent;
    });
    
    // This test is informational - install prompt availability depends on many factors
    console.log('Install prompt available:', hasInstallPrompt);
  });
});