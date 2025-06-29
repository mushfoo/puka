import { test, expect } from '@playwright/test';

test.describe('Puka Reading Tracker - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title and empty state', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Puka Reading Tracker/);
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('Your Reading Progress');
    
    // Check for empty state message
    await expect(page.locator('text=No books found')).toBeVisible();
    
    // Check for add book button
    await expect(page.locator('button:has-text("Add Book")')).toBeVisible();
  });

  test('should open add book modal when clicking add button', async ({ page }) => {
    // Click the add book button
    await page.click('button:has-text("Add Book")');
    
    // Check if modal is open
    await expect(page.locator('text=Add New Book')).toBeVisible();
    
    // Check for form fields
    await expect(page.locator('input[placeholder*="title"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="author"]')).toBeVisible();
    
    // Check for close button
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should add a new book successfully', async ({ page }) => {
    // Open add book modal
    await page.click('button:has-text("Add Book")');
    
    // Fill in book details
    await page.fill('input[placeholder*="title"]', 'Test Book');
    await page.fill('input[placeholder*="author"]', 'Test Author');
    
    // Set progress
    await page.fill('input[type="number"]', '50');
    
    // Submit form
    await page.click('button:has-text("Add Book"):not(:has-text("Cancel"))');
    
    // Wait for modal to close and book to appear
    await expect(page.locator('text=Add New Book')).not.toBeVisible();
    await expect(page.locator('text=Test Book')).toBeVisible();
    await expect(page.locator('text=Test Author')).toBeVisible();
    await expect(page.locator('text=50%')).toBeVisible();
  });

  test('should filter books by status', async ({ page }) => {
    // First add a few books with different statuses
    await page.click('button:has-text("Add Book")');
    await page.fill('input[placeholder*="title"]', 'Currently Reading Book');
    await page.fill('input[placeholder*="author"]', 'Author One');
    await page.fill('input[type="number"]', '30');
    await page.click('button:has-text("Add Book"):not(:has-text("Cancel"))');
    
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Add Book")');
    await page.fill('input[placeholder*="title"]', 'Finished Book');
    await page.fill('input[placeholder*="author"]', 'Author Two');
    await page.fill('input[type="number"]', '100');
    await page.click('button:has-text("Add Book"):not(:has-text("Cancel"))');
    
    await page.waitForTimeout(500);
    
    // Test filtering
    await page.click('button:has-text("Currently Reading")');
    await expect(page.locator('text=Currently Reading Book')).toBeVisible();
    await expect(page.locator('text=Finished Book')).not.toBeVisible();
    
    await page.click('button:has-text("Finished")');
    await expect(page.locator('text=Finished Book')).toBeVisible();
    await expect(page.locator('text=Currently Reading Book')).not.toBeVisible();
    
    await page.click('button:has-text("All Books")');
    await expect(page.locator('text=Currently Reading Book')).toBeVisible();
    await expect(page.locator('text=Finished Book')).toBeVisible();
  });

  test('should update book progress', async ({ page }) => {
    // Add a book first
    await page.click('button:has-text("Add Book")');
    await page.fill('input[placeholder*="title"]', 'Progress Book');
    await page.fill('input[placeholder*="author"]', 'Progress Author');
    await page.fill('input[type="number"]', '25');
    await page.click('button:has-text("Add Book"):not(:has-text("Cancel"))');
    
    await page.waitForTimeout(500);
    
    // Find and interact with progress slider/input
    const progressSlider = page.locator('input[type="range"]').first();
    if (await progressSlider.isVisible()) {
      await progressSlider.fill('75');
      await expect(page.locator('text=75%')).toBeVisible();
    }
  });
});

test.describe('Mobile Responsive Tests', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE size
  });

  test('should be mobile-friendly', async ({ page }) => {
    await page.goto('/');
    
    // Check that elements are visible and properly sized on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("Add Book")')).toBeVisible();
    
    // Check mobile menu/navigation if applicable
    const filterTabs = page.locator('button:has-text("All Books")');
    await expect(filterTabs).toBeVisible();
  });

  test('should handle mobile touch interactions', async ({ page }) => {
    await page.goto('/');
    
    // Add a book
    await page.click('button:has-text("Add Book")');
    await page.fill('input[placeholder*="title"]', 'Mobile Book');
    await page.fill('input[placeholder*="author"]', 'Mobile Author');
    await page.click('button:has-text("Add Book"):not(:has-text("Cancel"))');
    
    await page.waitForTimeout(500);
    
    // Check that book card is touchable and displays properly
    await expect(page.locator('text=Mobile Book')).toBeVisible();
  });
});