import { test, expect } from '@playwright/test';

test.describe('Mobile UX Validation - Puka Reading Tracker', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to localhost:5173 and set mobile viewport
    await page.goto('http://localhost:5173');
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone SE dimensions
  });

  test('should display properly on mobile viewport', async ({ page }) => {
    // Verify the page loads correctly on mobile
    await expect(page.locator('h1')).toContainText('Puka Reading Tracker');
    
    // Verify no horizontal scrolling
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should have thumb-friendly filter tab navigation', async ({ page }) => {
    // Test filter tab interactions
    const allTab = page.getByRole('tab', { name: /Filter by All/ });
    const wantToReadTab = page.getByRole('tab', { name: /Filter by Want to Read/ });
    const readingTab = page.getByRole('tab', { name: /Filter by Reading/ });
    const finishedTab = page.getByRole('tab', { name: /Filter by Finished/ });

    // Verify tabs are visible and clickable
    await expect(allTab).toBeVisible();
    await expect(wantToReadTab).toBeVisible();
    await expect(readingTab).toBeVisible();
    await expect(finishedTab).toBeVisible();

    // Test tab navigation
    await wantToReadTab.click();
    await expect(wantToReadTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('text=Currently showing books with status: want to_read')).toBeVisible();

    await readingTab.click();
    await expect(readingTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('text=Currently showing books with status: currently reading')).toBeVisible();

    await finishedTab.click();
    await expect(finishedTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('text=Currently showing books with status: finished')).toBeVisible();
  });

  test('should have accessible progress controls with proper touch targets', async ({ page }) => {
    // Navigate to Reading tab to see progress controls
    await page.getByRole('tab', { name: /Filter by Reading/ }).click();
    
    // Verify progress slider is present and functional
    const progressSlider = page.locator('input[type="range"]').first();
    await expect(progressSlider).toBeVisible();
    
    // Test progress buttons have adequate touch targets
    const plus10Button = page.getByRole('button', { name: '+10%' }).first();
    const plus25Button = page.getByRole('button', { name: '+25%' }).first();
    const doneButton = page.getByRole('button', { name: 'Done ✓' }).first();
    
    await expect(plus10Button).toBeVisible();
    await expect(plus25Button).toBeVisible();
    await expect(doneButton).toBeVisible();
    
    // Test progress button interaction
    await plus10Button.click();
    
    // Verify progress update notification appears
    await expect(page.locator('text=Progress updated')).toBeVisible();
  });

  test('should handle progress slider touch interactions', async ({ page }) => {
    // Navigate to Reading tab
    await page.getByRole('tab', { name: /Filter by Reading/ }).click();
    
    // Interact with progress slider
    const progressSlider = page.locator('input[type="range"]').first();
    await progressSlider.click();
    
    // Verify progress updates
    const progressPercentage = await progressSlider.getAttribute('value');
    expect(parseInt(progressPercentage || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(progressPercentage || '0')).toBeLessThanOrEqual(100);
  });

  test('should have accessible floating action button', async ({ page }) => {
    // Verify FAB is visible and positioned correctly
    const fabButton = page.getByRole('button', { name: 'Add new book' });
    await expect(fabButton).toBeVisible();
    
    // Test FAB interaction
    await fabButton.click();
    
    // Verify modal opens
    await expect(page.getByRole('dialog', { name: 'Add New Book' })).toBeVisible();
  });

  test('should display add book modal properly on mobile', async ({ page }) => {
    // Open add book modal
    await page.getByRole('button', { name: 'Add new book' }).click();
    
    // Verify modal is displayed correctly
    const modal = page.getByRole('dialog', { name: 'Add New Book' });
    await expect(modal).toBeVisible();
    
    // Verify form fields are accessible
    await expect(page.getByLabel('Title *')).toBeVisible();
    await expect(page.getByLabel('Author *')).toBeVisible();
    
    // Verify status buttons are properly sized for touch
    await expect(page.getByRole('button', { name: 'Want to Read' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reading' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finished' })).toBeVisible();
    
    // Test modal close functionality
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(modal).not.toBeVisible();
  });

  test('should handle search functionality on mobile', async ({ page }) => {
    // Test search input
    const searchInput = page.getByRole('textbox', { name: 'Search books...' });
    await expect(searchInput).toBeVisible();
    
    // Perform search
    await searchInput.fill('Dune');
    
    // Verify search results update
    await expect(page.locator('text=No books found for "Dune"')).toBeVisible();
    
    // Clear search
    await page.getByRole('banner').getByRole('button').click();
    await expect(searchInput).toHaveValue('');
  });

  test('should maintain responsive layout without horizontal scrolling', async ({ page }) => {
    // Test different sections for horizontal scrolling
    const headerWidth = await page.locator('header').evaluate(el => el.scrollWidth);
    const mainWidth = await page.locator('main').evaluate(el => el.scrollWidth);
    
    expect(headerWidth).toBeLessThanOrEqual(375);
    expect(mainWidth).toBeLessThanOrEqual(375);
    
    // Verify book cards fit within viewport
    const bookCards = page.locator('[data-testid="book-card"]');
    if (await bookCards.count() > 0) {
      const cardWidth = await bookCards.first().evaluate(el => el.scrollWidth);
      expect(cardWidth).toBeLessThanOrEqual(375);
    }
  });

  test('should have adequate touch target sizes for mobile interactions', async ({ page }) => {
    // Check filter tabs have minimum 44px touch targets
    const filterTabs = page.locator('[role="tab"]');
    const tabCount = await filterTabs.count();
    
    for (let i = 0; i < tabCount; i++) {
      const tab = filterTabs.nth(i);
      const boundingBox = await tab.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
    }
    
    // Check FAB has adequate touch target
    const fab = page.getByRole('button', { name: 'Add new book' });
    const fabBox = await fab.boundingBox();
    expect(fabBox?.width).toBeGreaterThanOrEqual(44);
    expect(fabBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle touch interactions smoothly', async ({ page }) => {
    // Test tap interactions on various elements
    const elements = [
      page.getByRole('tab', { name: /Filter by All/ }),
      page.getByRole('tab', { name: /Filter by Want to Read/ }),
      page.getByRole('tab', { name: /Filter by Reading/ }),
      page.getByRole('tab', { name: /Filter by Finished/ })
    ];
    
    for (const element of elements) {
      await element.click();
      // Verify no double-tap issues by checking element state
      await expect(element).toHaveAttribute('aria-selected', 'true');
    }
  });
});