import { test, expect, Page } from '@playwright/test';

/**
 * Phase 4: API Endpoints Testing
 * 
 * Tests all API endpoints to ensure:
 * - Proper authentication and authorization
 * - Correct HTTP status codes and response formats
 * - Data integrity and consistency
 * - Error handling and edge cases
 * - Performance within acceptable limits
 */

// Test user credentials for consistent authentication
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

// Helper function to authenticate and get session
async function authenticateUser(page: Page): Promise<void> {
  await page.goto('/');
  
  // Check if auth modal is open or trigger it
  const signInButton = page.locator('button:has-text("Sign In")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }
  
  // Fill in credentials and sign in
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // Wait for authentication to complete
  await page.waitForSelector('h1:has-text("Puka Reading Tracker")', { timeout: 10000 });
}

// Helper function to make authenticated API requests
async function makeApiRequest(page: Page, endpoint: string, options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
} = {}) {
  const { method = 'GET', body, headers = {} } = options;
  
  const response = await page.evaluate(async ({ endpoint, method, body, headers }) => {
    const requestOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      credentials: 'include' // Include session cookies
    };
    
    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(endpoint, requestOptions);
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: response.status === 204 ? null : await response.json().catch(() => null)
    };
  }, { endpoint, method, body, headers });
  
  return response;
}

test.describe('API Endpoints - Authentication and Authorization', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should require authentication for all protected endpoints', async ({ page }) => {
    // Test each protected endpoint without authentication
    const protectedEndpoints = [
      '/api/books',
      '/api/books/1',
      '/api/streak',
      '/api/streak/enhanced',
      '/api/settings'
    ];

    // Clear session to test unauthenticated access
    await page.context().clearCookies();
    
    for (const endpoint of protectedEndpoints) {
      const response = await makeApiRequest(page, endpoint);
      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.status).toBeLessThanOrEqual(403);
    }
  });

  test('should allow access to public endpoints without authentication', async ({ page }) => {
    // Clear session
    await page.context().clearCookies();
    
    // Test public endpoints
    const publicEndpoints = [
      '/api/health'
    ];

    for (const endpoint of publicEndpoints) {
      const response = await makeApiRequest(page, endpoint);
      expect(response.status).toBe(200);
    }
  });

  test('should return proper CORS headers', async ({ page }) => {
    const response = await makeApiRequest(page, '/api/health');
    
    // Check for essential CORS headers
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-methods');
    expect(response.headers).toHaveProperty('access-control-allow-headers');
  });
});

test.describe('API Endpoints - Books CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should create, read, update, and delete books', async ({ page }) => {
    const testBook = {
      title: 'API Test Book',
      author: 'API Test Author',
      progress: 25,
      status: 'reading'
    };

    // CREATE: Add a new book
    const createResponse = await makeApiRequest(page, '/api/books', {
      method: 'POST',
      body: testBook
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty('id');
    expect(createResponse.data.title).toBe(testBook.title);
    expect(createResponse.data.author).toBe(testBook.author);

    const bookId = createResponse.data.id;

    // READ: Get the created book
    const readResponse = await makeApiRequest(page, `/api/books/${bookId}`);
    
    expect(readResponse.status).toBe(200);
    expect(readResponse.data.id).toBe(bookId);
    expect(readResponse.data.title).toBe(testBook.title);

    // UPDATE: Modify the book
    const updatedBook = {
      title: 'Updated API Test Book',
      progress: 50
    };

    const updateResponse = await makeApiRequest(page, `/api/books/${bookId}`, {
      method: 'PUT',
      body: updatedBook
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.title).toBe(updatedBook.title);
    expect(updateResponse.data.progress).toBe(updatedBook.progress);

    // DELETE: Remove the book
    const deleteResponse = await makeApiRequest(page, `/api/books/${bookId}`, {
      method: 'DELETE'
    });

    expect(deleteResponse.status).toBe(204);

    // Verify deletion
    const verifyResponse = await makeApiRequest(page, `/api/books/${bookId}`);
    expect(verifyResponse.status).toBe(404);
  });

  test('should validate book data on creation', async ({ page }) => {
    // Test with invalid data
    const invalidBook = {
      // Missing required title
      author: 'Test Author',
      progress: 150 // Invalid progress > 100
    };

    const response = await makeApiRequest(page, '/api/books', {
      method: 'POST',
      body: invalidBook
    });

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('errors');
  });

  test('should list books with filtering and pagination', async ({ page }) => {
    // Create test books
    const testBooks = [
      { title: 'Book 1', author: 'Author A', status: 'reading', progress: 25 },
      { title: 'Book 2', author: 'Author B', status: 'completed', progress: 100 },
      { title: 'Book 3', author: 'Author A', status: 'unread', progress: 0 }
    ];

    for (const book of testBooks) {
      await makeApiRequest(page, '/api/books', {
        method: 'POST',
        body: book
      });
    }

    // Test basic listing
    const listResponse = await makeApiRequest(page, '/api/books');
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.data)).toBe(true);
    expect(listResponse.data.length).toBeGreaterThanOrEqual(3);

    // Test filtering by status
    const filterResponse = await makeApiRequest(page, '/api/books?status=reading');
    expect(filterResponse.status).toBe(200);
    expect(filterResponse.data.every((book: any) => book.status === 'reading')).toBe(true);

    // Test search functionality
    const searchResponse = await makeApiRequest(page, '/api/books?search=Author A');
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.data.every((book: any) => book.author.includes('Author A'))).toBe(true);
  });
});

test.describe('API Endpoints - Streak Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should manage basic streak history', async ({ page }) => {
    // Get initial streak history
    const getResponse = await makeApiRequest(page, '/api/streak');
    expect([200, 404]).toContain(getResponse.status);

    // Create/update streak history
    const streakData = {
      readingDays: ['2024-01-01', '2024-01-02', '2024-01-03'],
      currentStreak: 3,
      longestStreak: 5,
      lastCalculated: new Date().toISOString()
    };

    const updateResponse = await makeApiRequest(page, '/api/streak', {
      method: 'PUT',
      body: streakData
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.readingDays).toEqual(expect.arrayContaining(streakData.readingDays));
  });

  test('should manage enhanced streak history', async ({ page }) => {
    // Test enhanced streak endpoints
    const enhancedStreakData = {
      readingDayEntries: [
        {
          date: '2024-01-01',
          source: 'book',
          bookIds: [],
          notes: 'Great reading day',
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString()
        }
      ],
      version: 1,
      lastSyncDate: new Date().toISOString()
    };

    const updateResponse = await makeApiRequest(page, '/api/streak/enhanced', {
      method: 'PUT',
      body: enhancedStreakData
    });

    expect([200, 201]).toContain(updateResponse.status);
    expect(updateResponse.data.readingDayEntries).toBeDefined();
    expect(updateResponse.data.version).toBe(1);
  });

  test('should handle streak entry ranges', async ({ page }) => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    
    const response = await makeApiRequest(page, `/api/streak/entries?start=${startDate}&end=${endDate}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
});

test.describe('API Endpoints - Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should manage user settings', async ({ page }) => {
    // Get current settings
    const getResponse = await makeApiRequest(page, '/api/settings');
    expect([200, 404]).toContain(getResponse.status);

    // Update settings
    const settingsData = {
      theme: 'dark',
      dailyReadingGoal: 60,
      defaultView: 'grid',
      sortBy: 'title',
      sortOrder: 'asc',
      notificationsEnabled: true,
      autoBackup: false,
      backupFrequency: 'weekly'
    };

    const updateResponse = await makeApiRequest(page, '/api/settings', {
      method: 'PUT',
      body: settingsData
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.theme).toBe(settingsData.theme);
    expect(updateResponse.data.dailyReadingGoal).toBe(settingsData.dailyReadingGoal);
  });

  test('should validate settings data', async ({ page }) => {
    const invalidSettings = {
      theme: 'invalid-theme',
      dailyReadingGoal: -10,
      sortOrder: 'invalid-order'
    };

    const response = await makeApiRequest(page, '/api/settings', {
      method: 'PUT',
      body: invalidSettings
    });

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('errors');
  });
});

test.describe('API Endpoints - Performance and Response Times', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should respond within 200ms for standard operations', async ({ page }) => {
    const endpoints = [
      { url: '/api/books', method: 'GET' },
      { url: '/api/streak', method: 'GET' },
      { url: '/api/settings', method: 'GET' },
      { url: '/api/health', method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      const response = await makeApiRequest(page, endpoint.url, {
        method: endpoint.method
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBeLessThan(500);
      expect(responseTime).toBeLessThan(200);
    }
  });

  test('should handle concurrent requests efficiently', async ({ page }) => {
    // Create multiple concurrent requests
    const requests = Array.from({ length: 10 }, (_, i) => 
      makeApiRequest(page, '/api/books', {
        method: 'POST',
        body: {
          title: `Concurrent Book ${i}`,
          author: `Author ${i}`,
          progress: Math.floor(Math.random() * 100)
        }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });

    // Total time should be reasonable for concurrent operations
    expect(totalTime).toBeLessThan(2000); // 2 seconds for 10 concurrent requests
  });
});

test.describe('API Endpoints - Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('should handle malformed requests gracefully', async ({ page }) => {
    // Test malformed JSON
    const response = await page.evaluate(async () => {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
        credentials: 'include'
      });
      
      return {
        status: response.status,
        data: await response.text()
      };
    });

    expect(response.status).toBe(400);
  });

  test('should handle missing Content-Type header', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const response = await fetch('/api/books', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
        credentials: 'include'
      });
      
      return {
        status: response.status
      };
    });

    expect([400, 415]).toContain(response.status);
  });

  test('should handle requests to non-existent resources', async ({ page }) => {
    const response = await makeApiRequest(page, '/api/books/999999');
    expect(response.status).toBe(404);
  });

  test('should handle unsupported HTTP methods', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const response = await fetch('/api/books', {
        method: 'PATCH', // Unsupported method
        credentials: 'include'
      });
      
      return {
        status: response.status
      };
    });

    expect(response.status).toBe(405);
  });

  test('should validate request size limits', async ({ page }) => {
    // Create a very large request body
    const largeBook = {
      title: 'A'.repeat(10000),
      author: 'B'.repeat(10000),
      notes: 'C'.repeat(100000)
    };

    const response = await makeApiRequest(page, '/api/books', {
      method: 'POST',
      body: largeBook
    });

    expect([400, 413]).toContain(response.status);
  });
});