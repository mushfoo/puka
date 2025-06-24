import { test, expect } from '@playwright/test';

test.describe('Puka Reading Tracker UI', () => {
  test('main page matches mockup design', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    
    // Take screenshot of main page
    await expect(page).toHaveScreenshot('main-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('streak card design matches mockup', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="streak-card"]');
    
    const streakCard = page.locator('[data-testid="streak-card"]');
    await expect(streakCard).toHaveScreenshot('streak-card.png');
  });

  test('currently reading section matches mockup', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="currently-reading"]');
    
    const currentlyReading = page.locator('[data-testid="currently-reading"]');
    await expect(currentlyReading).toHaveScreenshot('currently-reading.png');
  });

  test('book grid layout matches mockup', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="book-grid"]');
    
    const bookGrid = page.locator('[data-testid="book-grid"]');
    await expect(bookGrid).toHaveScreenshot('book-grid.png');
  });

  test('status filters match mockup design', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="status-filters"]');
    
    const statusFilters = page.locator('[data-testid="status-filters"]');
    await expect(statusFilters).toHaveScreenshot('status-filters.png');
  });
});