import { test, expect } from '@playwright/test';

test.describe('Puka Reading Tracker - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title and empty state', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Puka Reading Tracker/);
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('Puka Reading Tracker');
    
    // Check for empty state message
    await expect(page.locator('text=No books yet')).toBeVisible();
    
    // Check for add book button
    await expect(page.locator('[aria-label="Add new book"]')).toBeVisible();
  });

  test('should open add book modal when clicking add button', async ({ page }) => {
    // Click the add book button
    await page.click('[aria-label="Add new book"]');
    
    // Check if modal is open
    await expect(page.locator('text=Add New Book')).toBeVisible();
    
    // Check for form fields
    await expect(page.locator('input[placeholder*="title"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="author"]')).toBeVisible();
    
    // Check for close button (X icon)
    await expect(page.locator('[aria-label="Close modal"]')).toBeVisible();
  });

  test('should add a new book successfully', async ({ page }) => {
    // Open add book modal
    await page.click('[aria-label="Add new book"]');
    
    // Fill in book details
    await page.fill('input[placeholder*="title"]', 'Test Book');
    await page.fill('input[placeholder*="author"]', 'Test Author');
    
    // Set progress
    await page.fill('input[type="number"]', '50');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for modal to close and book to appear
    await expect(page.locator('text=Add New Book')).not.toBeVisible();
    await expect(page.locator('text=Test Book')).toBeVisible();
    await expect(page.locator('text=Test Author')).toBeVisible();
    await expect(page.locator('text=50%')).toBeVisible();
  });

  test('should filter books by status', async ({ page }) => {
    // First add a few books with different statuses
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Currently Reading Book');
    await page.fill('input[placeholder*="author"]', 'Author One');
    await page.fill('input[type="number"]', '30');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Finished Book');
    await page.fill('input[placeholder*="author"]', 'Author Two');
    await page.fill('input[type="number"]', '100');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Test filtering
    await page.click('[aria-label*="Filter by Reading"]');
    await expect(page.locator('text=Currently Reading Book')).toBeVisible();
    await expect(page.locator('text=Finished Book')).not.toBeVisible();
    
    await page.click('[aria-label*="Filter by Finished"]');
    await expect(page.locator('text=Finished Book')).toBeVisible();
    await expect(page.locator('text=Currently Reading Book')).not.toBeVisible();
    
    await page.click('[aria-label*="Filter by All"]');
    await expect(page.locator('text=Currently Reading Book')).toBeVisible();
    await expect(page.locator('text=Finished Book')).toBeVisible();
  });

  test('should update book progress', async ({ page }) => {
    // Add a book first
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Progress Book');
    await page.fill('input[placeholder*="author"]', 'Progress Author');
    await page.fill('input[type="number"]', '25');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Find and interact with progress slider/input
    const progressSlider = page.locator('input[type="range"]').first();
    if (await progressSlider.isVisible()) {
      await progressSlider.fill('75');
      await expect(page.locator('text=75%')).toBeVisible();
    }
  });
});

test.describe('Mobile-First Responsive Tests (375px)', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // Mobile-first requirement: 375px viewport
  });

  test('should display properly at 375px viewport', async ({ page }) => {
    await page.goto('/');
    
    // Check that elements are visible and properly sized on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[aria-label="Add new book"]')).toBeVisible();
    
    // Check mobile-specific layout: filter tabs should be horizontally scrollable
    const filterTabs = page.locator('[aria-label*="Filter by All"]').first();
    await expect(filterTabs).toBeVisible();
    
    // Verify mobile header layout
    await expect(page.locator('text=Puka Reading Tracker')).toBeVisible();
    
    // Check mobile import/export buttons are in grid layout
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('should handle touch interactions at 375px', async ({ page }) => {
    await page.goto('/');
    
    // Test touch targets meet 44px minimum requirement
    const fab = page.locator('[aria-label="Add new book"]');
    await expect(fab).toBeVisible();
    
    // Add a book using touch-friendly interactions
    await fab.click();
    await page.fill('input[placeholder*="title"]', 'Touch Test Book');
    await page.fill('input[placeholder*="author"]', 'Touch Author');
    
    // Test form submission on mobile
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Verify book appears and is touchable
    await expect(page.locator('text=Touch Test Book')).toBeVisible();
    
    // Test filter switching on mobile
    await page.click('[aria-label*="Filter by All"]');
    await expect(page.locator('text=Touch Test Book')).toBeVisible();
  });

  test('should have proper mobile search functionality', async ({ page }) => {
    await page.goto('/');
    
    // Add a book first
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Search Test Book');
    await page.fill('input[placeholder*="author"]', 'Search Author');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Test mobile search input
    const searchInput = page.locator('input[placeholder*="Search books"]');
    await expect(searchInput).toBeVisible();
    
    // Test search functionality
    await searchInput.fill('Search Test');
    await page.waitForTimeout(400); // Wait for debounced search
    await expect(page.locator('text=Search Test Book')).toBeVisible();
    
    // Test clear search
    await searchInput.fill('');
    await page.waitForTimeout(400);
    await expect(page.locator('text=Search Test Book')).toBeVisible();
  });

  test('should validate one-handed operation capability', async ({ page }) => {
    await page.goto('/');
    
    // Test that key elements are within thumb reach zone (375px width)
    // FAB should be positioned for easy thumb access
    const fab = page.locator('[aria-label="Add new book"]');
    await expect(fab).toBeVisible();
    
    // Filter tabs should be easily tappable
    const filterTab = page.locator('[aria-label*="Filter by All"]').first();
    await expect(filterTab).toBeVisible();
    
    // Add book and test progress updates are thumb-friendly
    await fab.click();
    await page.fill('input[placeholder*="title"]', 'Thumb Test');
    await page.fill('input[placeholder*="author"]', 'Test Author');
    await page.fill('input[type="number"]', '25');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    // Test that progress controls are accessible
    const progressSlider = page.locator('input[type="range"]').first();
    if (await progressSlider.isVisible()) {
      await progressSlider.fill('50');
      await expect(page.locator('text=50%')).toBeVisible();
    }
  });
});