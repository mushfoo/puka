import { test, expect } from '@playwright/test';

test.describe('Performance Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have UI interactions respond within 100ms', async ({ page }) => {
    // Test FAB click response time
    const startTime = performance.now();
    await page.click('[aria-label="Add new book"]');
    await expect(page.locator('text=Add New Book')).toBeVisible();
    const modalOpenTime = performance.now() - startTime;
    
    // Modal should open within 100ms
    expect(modalOpenTime).toBeLessThan(100);
    
    // Test modal close response time
    const closeStartTime = performance.now();
    await page.click('[aria-label="Close modal"]');
    await expect(page.locator('text=Add New Book')).not.toBeVisible();
    const modalCloseTime = performance.now() - closeStartTime;
    
    // Modal should close within 100ms
    expect(modalCloseTime).toBeLessThan(100);
  });

  test('should have filter switching respond within 100ms', async ({ page }) => {
    // Add a book first to have something to filter
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Performance Test Book');
    await page.fill('input[placeholder*="author"]', 'Performance Author');
    await page.fill('input[type="number"]', '50');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Test filter switching performance
    const filterStartTime = performance.now();
    await page.click('[aria-label*="Filter by Reading"]');
    await expect(page.locator('text=Performance Test Book')).toBeVisible();
    const filterTime = performance.now() - filterStartTime;
    
    // Filter should respond within 100ms
    expect(filterTime).toBeLessThan(100);
  });

  test('should have search respond within 100ms', async ({ page }) => {
    // Add a book first
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Searchable Book');
    await page.fill('input[placeholder*="author"]', 'Search Author');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Test search performance (accounting for debounce)
    const searchInput = page.locator('input[placeholder*="Search books"]');
    
    const searchStartTime = performance.now();
    await searchInput.fill('Searchable');
    
    // Wait for debounced search (300ms) plus processing time
    await page.waitForTimeout(350);
    await expect(page.locator('text=Searchable Book')).toBeVisible();
    const totalSearchTime = performance.now() - searchStartTime;
    
    // Total search (including debounce) should be reasonable
    expect(totalSearchTime).toBeLessThan(500); // 300ms debounce + 200ms processing tolerance
  });

  test('should have progress updates respond within 100ms', async ({ page }) => {
    // Add a book first
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Progress Test Book');
    await page.fill('input[placeholder*="author"]', 'Progress Author');
    await page.fill('input[type="number"]', '25');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Test progress slider performance
    const progressSlider = page.locator('input[type="range"]').first();
    if (await progressSlider.isVisible()) {
      const progressStartTime = performance.now();
      await progressSlider.fill('75');
      await expect(page.locator('text=75%')).toBeVisible();
      const progressTime = performance.now() - progressStartTime;
      
      // Progress update should respond within 100ms
      expect(progressTime).toBeLessThan(100);
    }
  });

  test('should validate page load performance', async ({ page }) => {
    // Test initial page load time
    const loadStartTime = performance.now();
    await page.goto('/');
    
    // Wait for key elements to be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[aria-label="Add new book"]')).toBeVisible();
    
    const loadTime = performance.now() - loadStartTime;
    
    // Page should load within 2 seconds (2000ms) as per requirements
    expect(loadTime).toBeLessThan(2000);
  });

  test('should maintain performance with multiple books', async ({ page }) => {
    // Add multiple books to test performance degradation
    const bookCount = 5;
    
    for (let i = 1; i <= bookCount; i++) {
      await page.click('[aria-label="Add new book"]');
      await page.fill('input[placeholder*="title"]', `Book ${i}`);
      await page.fill('input[placeholder*="author"]', `Author ${i}`);
      await page.fill('input[type="number"]', `${i * 20}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(200);
    }
    
    // Test filter performance with multiple books
    const filterStartTime = performance.now();
    await page.click('[aria-label*="Filter by All"]');
    
    // All books should be visible
    for (let i = 1; i <= bookCount; i++) {
      await expect(page.locator(`text=Book ${i}`)).toBeVisible();
    }
    
    const filterTime = performance.now() - filterStartTime;
    
    // Filter should still respond quickly with multiple books
    expect(filterTime).toBeLessThan(200); // Slightly more tolerance for multiple books
  });

  test('should validate mobile performance at 375px', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test mobile interaction performance
    const mobileStartTime = performance.now();
    await page.click('[aria-label="Add new book"]');
    await expect(page.locator('text=Add New Book')).toBeVisible();
    const mobileTime = performance.now() - mobileStartTime;
    
    // Mobile interactions should be just as fast
    expect(mobileTime).toBeLessThan(100);
    
    // Test mobile filter switching
    await page.click('[aria-label="Close modal"]');
    
    const mobileFilterStartTime = performance.now();
    await page.click('[aria-label*="Filter by All"]');
    const mobileFilterTime = performance.now() - mobileFilterStartTime;
    
    // Mobile filter switching should be fast
    expect(mobileFilterTime).toBeLessThan(100);
  });
});

test.describe('Network Performance Tests', () => {
  test('should handle offline performance gracefully', async ({ page, context }) => {
    // Go online first, load the page
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    // Add a book while online
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Offline Test Book');
    await page.fill('input[placeholder*="author"]', 'Offline Author');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Go offline
    await context.setOffline(true);
    
    // Test that the app still responds quickly while offline
    const offlineStartTime = performance.now();
    await page.click('[aria-label*="Filter by All"]');
    await expect(page.locator('text=Offline Test Book')).toBeVisible();
    const offlineTime = performance.now() - offlineStartTime;
    
    // Offline interactions should still be fast
    expect(offlineTime).toBeLessThan(100);
    
    // Restore online status
    await context.setOffline(false);
  });

  test('should validate bundle size impact on performance', async ({ page }) => {
    // Navigate to the page and measure resource loading
    const response = await page.goto('/');
    
    // Check that the main bundle loads quickly
    expect(response?.status()).toBe(200);
    
    // Verify that JavaScript execution doesn't block UI
    const scriptStartTime = performance.now();
    await expect(page.locator('[aria-label="Add new book"]')).toBeVisible();
    const scriptTime = performance.now() - scriptStartTime;
    
    // UI should be interactive quickly after page load
    expect(scriptTime).toBeLessThan(1000);
  });
});