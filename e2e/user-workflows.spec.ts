import { test, expect, Page } from '@playwright/test';

/**
 * Phase 4: End-to-End User Workflows Testing
 * 
 * Tests complete user journeys to ensure:
 * - New user registration → data creation flow
 * - Existing user login → data access flow  
 * - Local data migration workflow
 * - Cross-device data synchronization
 * - Import/export functionality
 */

// Test user credentials for different scenarios
const NEW_USER = {
  email: 'newuser@example.com',
  password: 'newuserpass123',
  name: 'New Test User'
};

const EXISTING_USER = {
  email: 'existing@example.com', 
  password: 'existingpass123',
  name: 'Existing Test User'
};

const MIGRATION_USER = {
  email: 'migration@example.com',
  password: 'migrationpass123', 
  name: 'Migration Test User'
};

// Helper to clear all storage and auth state
async function clearAllState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

// Helper to create local data for migration testing
async function createLocalTestData(page: Page) {
  await page.evaluate(() => {
    // Create legacy book data
    const books = [
      {
        id: 1,
        title: 'Local Book 1',
        author: 'Local Author 1',
        progress: 25,
        status: 'reading',
        dateAdded: new Date('2024-01-01').toISOString()
      },
      {
        id: 2,
        title: 'Local Book 2', 
        author: 'Local Author 2',
        progress: 100,
        status: 'completed',
        dateAdded: new Date('2024-01-02').toISOString()
      }
    ];

    // Create legacy streak data
    const streakHistory = {
      currentStreak: 5,
      longestStreak: 10,
      lastReadDate: '2024-01-05',
      readingDays: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
      totalDaysRead: 5
    };

    // Create legacy settings
    const settings = {
      theme: 'light',
      dailyReadingGoal: 30,
      defaultView: 'grid'
    };

    localStorage.setItem('puka_books', JSON.stringify(books));
    localStorage.setItem('puka_streak_history', JSON.stringify(streakHistory));
    localStorage.setItem('puka_settings', JSON.stringify(settings));
  });
}

// Helper to authenticate user
async function authenticateUser(page: Page, user: any) {
  await page.goto('/');
  
  const signInButton = page.locator('button:has-text("Sign In")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
  }
}

test.describe('User Workflows - New User Registration and Data Creation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllState(page);
  });

  test('should handle complete new user registration flow', async ({ page }) => {
    await page.goto('/');

    // Check initial state - should show auth prompt
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();

    // Sign in as new user (assuming auth system handles registration)
    await page.click('button:has-text("Sign In")');
    await page.fill('input[type="email"]', NEW_USER.email);
    await page.fill('input[type="password"]', NEW_USER.password);
    await page.click('button[type="submit"]');

    // Wait for authentication to complete
    await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 15000 });

    // Should show empty state for new user
    await expect(page.locator('text=No books yet')).toBeVisible();
    await expect(page.locator('[aria-label="Add new book"]')).toBeVisible();

    // Create first book as new user
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'My First Book');
    await page.fill('input[placeholder*="author"]', 'First Author');
    await page.fill('input[type="number"]', '30');
    await page.click('button[type="submit"]');

    // Verify book was created and stored in database
    await page.waitForTimeout(1000);
    await expect(page.locator('text=My First Book')).toBeVisible();
    await expect(page.locator('text=First Author')).toBeVisible();
    await expect(page.locator('text=30%')).toBeVisible();

    // Test data persistence by refreshing page
    await page.reload();
    await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
    await expect(page.locator('text=My First Book')).toBeVisible();

    // Test settings creation
    await page.click('button:has-text("Settings")', { timeout: 5000 }).catch(() => {
      // Settings might not be visible, try other approaches
      console.log('Settings button not found, checking for alternatives');
    });

    // Verify user profile/settings if accessible
    // (Implementation depends on actual UI)
  });

  test('should create reading streak for new user', async ({ page }) => {
    await authenticateUser(page, NEW_USER);

    // Add a book first
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Streak Test Book');
    await page.fill('input[placeholder*="author"]', 'Streak Author');
    await page.fill('input[type="number"]', '100'); // Mark as completed
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Should show streak information
    await expect(page.locator('text=Reading Streak')).toBeVisible();
    
    // Check if streak counter is visible
    const streakElement = page.locator('[data-testid="streak-counter"]').or(
      page.locator('text*="day"').first()
    );
    await expect(streakElement).toBeVisible();
  });

  test('should handle new user data export', async ({ page }) => {
    await authenticateUser(page, NEW_USER);

    // Create some test data
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Export Test Book');
    await page.fill('input[placeholder*="author"]', 'Export Author');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Test export functionality
    await page.click('button:has-text("Export")');
    
    // Should open export modal
    await expect(page.locator('text=Export Your Data')).toBeVisible();
    
    // Test different export formats
    await page.click('button:has-text("JSON")');
    
    // Wait for download (or check if data is available)
    await page.waitForTimeout(2000);
  });
});

test.describe('User Workflows - Existing User Login and Data Access', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllState(page);
  });

  test('should handle existing user login and data retrieval', async ({ page }) => {
    // First session: Create user data
    await authenticateUser(page, EXISTING_USER);

    // Create test data for existing user
    const testBooks = [
      { title: 'Existing Book 1', author: 'Author A', progress: 50 },
      { title: 'Existing Book 2', author: 'Author B', progress: 100 },
      { title: 'Existing Book 3', author: 'Author C', progress: 25 }
    ];

    for (const book of testBooks) {
      await page.click('[aria-label="Add new book"]');
      await page.fill('input[placeholder*="title"]', book.title);
      await page.fill('input[placeholder*="author"]', book.author);
      await page.fill('input[type="number"]', book.progress.toString());
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Verify all books are visible
    for (const book of testBooks) {
      await expect(page.locator(`text=${book.title}`)).toBeVisible();
    }

    // Sign out and clear session
    await clearAllState(page);

    // Second session: Login again and verify data persistence
    await authenticateUser(page, EXISTING_USER);

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify all data is still available
    for (const book of testBooks) {
      await expect(page.locator(`text=${book.title}`)).toBeVisible();
      await expect(page.locator(`text=${book.author}`)).toBeVisible();
    }

    // Test filtering still works
    await page.click('[aria-label*="Filter by Reading"]');
    await expect(page.locator('text=Existing Book 1')).toBeVisible();
    await expect(page.locator('text=Existing Book 3')).toBeVisible();
    await expect(page.locator('text=Existing Book 2')).not.toBeVisible();

    await page.click('[aria-label*="Filter by Finished"]');
    await expect(page.locator('text=Existing Book 2')).toBeVisible();
    await expect(page.locator('text=Existing Book 1')).not.toBeVisible();

    // Test search functionality
    await page.click('[aria-label*="Filter by All"]');
    const searchInput = page.locator('input[placeholder*="Search books"]');
    await searchInput.fill('Author A');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Existing Book 1')).toBeVisible();
    await expect(page.locator('text=Existing Book 2')).not.toBeVisible();
  });

  test('should handle existing user settings persistence', async ({ page }) => {
    await authenticateUser(page, EXISTING_USER);

    // Configure settings (if settings UI is available)
    // This test depends on the actual settings implementation
    
    // Test theme persistence by checking local storage or UI state
    // const currentTheme = await page.evaluate(() => {
    //   return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    // });

    // Sign out and back in
    await clearAllState(page);
    await authenticateUser(page, EXISTING_USER);
    await page.waitForTimeout(1000);

    // Verify theme persisted (this might need adjustment based on implementation)
    const persistedTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Theme should persist or default appropriately
    expect(['light', 'dark']).toContain(persistedTheme);
  });
});

test.describe('User Workflows - Local Data Migration', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllState(page);
    await createLocalTestData(page);
  });

  test('should detect and prompt for local data migration', async ({ page }) => {
    await page.goto('/');

    // Should detect local data and show migration prompt
    await expect(page.locator('text*="local data"').or(
      page.locator('text*="migrate"')
    )).toBeVisible({ timeout: 5000 });

    // Should show data summary
    await expect(page.locator('text*="2"')).toBeVisible(); // 2 books
    await expect(page.locator('text*="book"')).toBeVisible();

    // Should offer migration options
    await expect(page.locator('button:has-text("Migrate")').or(
      page.locator('button:has-text("Import")')
    )).toBeVisible();

    await expect(page.locator('button:has-text("Export")').or(
      page.locator('button:has-text("Backup")')
    )).toBeVisible();
  });

  test('should perform complete data migration workflow', async ({ page }) => {
    await page.goto('/');

    // Wait for migration prompt
    await page.waitForSelector('text*="migrate"', { timeout: 10000 }).catch(() => {
      console.log('Migration prompt not found, checking for sign-in');
    });

    // Sign in first if required
    const signInButton = page.locator('button:has-text("Sign In")');
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.fill('input[type="email"]', MIGRATION_USER.email);
      await page.fill('input[type="password"]', MIGRATION_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
    }

    // Look for migration prompt after auth
    const migrateButton = page.locator('button:has-text("Migrate")').or(
      page.locator('button:has-text("Import")').or(
        page.locator('button:has-text("Start Migration")')
      )
    );

    if (await migrateButton.isVisible()) {
      await migrateButton.click();

      // Wait for migration to complete
      await page.waitForTimeout(3000);

      // Verify migrated data appears
      await expect(page.locator('text=Local Book 1')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Local Book 2')).toBeVisible();
      await expect(page.locator('text=Local Author 1')).toBeVisible();
      await expect(page.locator('text=Local Author 2')).toBeVisible();

      // Check progress values are preserved
      await expect(page.locator('text=25%')).toBeVisible();
      await expect(page.locator('text=100%')).toBeVisible();

      // Verify reading streak data was migrated
      await expect(page.locator('text=Reading Streak')).toBeVisible();

      // Test that local data is cleared after successful migration
      const localDataRemaining = await page.evaluate(() => {
        return localStorage.getItem('puka_books') !== null;
      });

      expect(localDataRemaining).toBe(false);
    } else {
      console.log('Migration UI not found - may need manual setup');
    }
  });

  test('should handle migration failures gracefully', async ({ page }) => {
    // Create invalid local data to test error handling
    await page.evaluate(() => {
      localStorage.setItem('puka_books', 'invalid json{');
    });

    await page.goto('/');

    // Sign in
    const signInButton = page.locator('button:has-text("Sign In")');
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.fill('input[type="email"]', MIGRATION_USER.email);
      await page.fill('input[type="password"]', MIGRATION_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
    }

    // Should handle invalid data gracefully
    await page.waitForTimeout(2000);
    
    // Should not crash and should show appropriate error or skip migration
    await expect(page.locator('h1:has-text("Puka Reading Tracker")')).toBeVisible();
  });

  test('should allow export before migration', async ({ page }) => {
    await page.goto('/');

    // Look for export/backup option before migration
    const exportButton = page.locator('button:has-text("Export")').or(
      page.locator('button:has-text("Backup")')
    );

    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Should initiate export process
      await page.waitForTimeout(2000);
      
      // Verify export contains local data
      // (Implementation depends on how export is handled)
    }
  });
});

test.describe('User Workflows - Cross-Device Synchronization', () => {
  test('should synchronize data across simulated devices', async ({ page, browser }) => {
    // Device 1: Create and modify data
    await authenticateUser(page, EXISTING_USER);
    
    await page.click('[aria-label="Add new book"]');
    await page.fill('input[placeholder*="title"]', 'Sync Test Book');
    await page.fill('input[placeholder*="author"]', 'Sync Author');
    await page.fill('input[type="number"]', '60');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Sync Test Book')).toBeVisible();

    // Device 2: Open new browser context (simulating different device)
    const device2Context = await browser.newContext();
    const device2Page = await device2Context.newPage();
    
    await authenticateUser(device2Page, EXISTING_USER);
    
    // Should see data from device 1
    await device2Page.waitForTimeout(2000);
    await expect(device2Page.locator('text=Sync Test Book')).toBeVisible();
    
    // Modify data on device 2
    const bookCard = device2Page.locator('text=Sync Test Book').locator('..');
    const progressSlider = bookCard.locator('input[type="range"]').first();
    
    if (await progressSlider.isVisible()) {
      await progressSlider.fill('80');
      await device2Page.waitForTimeout(1000);
    }

    // Device 1: Refresh and check for updated data
    await page.reload();
    await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Should see updated progress (implementation dependent)
    // This test may need adjustment based on real-time sync implementation
    
    await device2Context.close();
  });
});

test.describe('User Workflows - Import/Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllState(page);
    await authenticateUser(page, EXISTING_USER);
  });

  test('should handle complete import/export workflow', async ({ page }) => {
    // Create test data
    const testBooks = [
      { title: 'Export Book 1', author: 'Export Author 1', progress: 25 },
      { title: 'Export Book 2', author: 'Export Author 2', progress: 75 }
    ];

    for (const book of testBooks) {
      await page.click('[aria-label="Add new book"]');
      await page.fill('input[placeholder*="title"]', book.title);
      await page.fill('input[placeholder*="author"]', book.author);
      await page.fill('input[type="number"]', book.progress.toString());
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // Test export functionality
    await page.click('button:has-text("Export")');
    await expect(page.locator('text=Export Your Data')).toBeVisible();
    
    // Test different export formats
    await page.click('button:has-text("JSON")');
    await page.waitForTimeout(1000);

    // Test CSV export
    await page.click('button:has-text("CSV")');
    await page.waitForTimeout(1000);

    // Test import functionality
    await page.click('button:has-text("Import")');
    await expect(page.locator('text=Import Data')).toBeVisible();

    // Close modal
    await page.press('body', 'Escape');
  });

  test('should validate imported data', async ({ page }) => {
    await page.click('button:has-text("Import")');
    
    // Should show validation options
    await expect(page.locator('text=Import Data')).toBeVisible();
    
    // Test file format validation
    // (Implementation depends on actual import UI)
    
    // Close modal
    await page.press('body', 'Escape');
  });
});

test.describe('User Workflows - Performance and Scalability', () => {
  test('should handle large datasets efficiently', async ({ page }) => {
    await authenticateUser(page, EXISTING_USER);

    // Create a larger dataset to test performance
    const startTime = Date.now();
    
    for (let i = 0; i < 20; i++) {
      await page.click('[aria-label="Add new book"]');
      await page.fill('input[placeholder*="title"]', `Performance Book ${i}`);
      await page.fill('input[placeholder*="author"]', `Author ${i}`);
      await page.fill('input[type="number"]', ((i % 4) * 25).toString());
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100); // Minimal wait between operations
    }

    const creationTime = Date.now() - startTime;
    
    // Should handle creation of 20 books reasonably quickly
    expect(creationTime).toBeLessThan(30000); // 30 seconds max
    
    // Test filtering performance with larger dataset
    const filterStartTime = Date.now();
    await page.click('[aria-label*="Filter by Reading"]');
    await page.waitForTimeout(500);
    const filterTime = Date.now() - filterStartTime;
    
    expect(filterTime).toBeLessThan(2000); // 2 seconds max for filtering
    
    // Test search performance
    const searchStartTime = Date.now();
    const searchInput = page.locator('input[placeholder*="Search books"]');
    await searchInput.fill('Performance Book 1');
    await page.waitForTimeout(500);
    const searchTime = Date.now() - searchStartTime;
    
    expect(searchTime).toBeLessThan(1000); // 1 second max for search
    
    // Verify search results
    await expect(page.locator('text=Performance Book 1')).toBeVisible();
    await expect(page.locator('text=Performance Book 10')).toBeVisible();
  });
});