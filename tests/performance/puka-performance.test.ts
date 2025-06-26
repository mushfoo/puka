import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  testName: string;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay?: number;
  interactionResponseTimes: Array<{
    interaction: string;
    responseTime: number;
    passed: boolean;
  }>;
  memoryUsage?: number;
  cpuUsage?: number;
  frameDrops?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async startMonitoring() {
    // Enable performance monitoring
    await this.page.evaluate(() => {
      (window as any).performanceMetrics = {
        interactions: [],
        startTime: Date.now()
      };
    });
  }

  async measureInteractionTime(interactionName: string, action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    await this.page.evaluate((data) => {
      (window as any).performanceMetrics.interactions.push({
        name: data.name,
        responseTime: data.responseTime,
        timestamp: Date.now()
      });
    }, { name: interactionName, responseTime });

    return responseTime;
  }

  async getPerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
        interactions: (window as any).performanceMetrics?.interactions || []
      };
    });
  }

  async measureMemoryUsage(): Promise<number> {
    try {
      return await this.page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
      });
    } catch {
      return 0;
    }
  }
}

test.describe('Puka Reading Tracker Performance Validation', () => {
  let performanceMonitor: PerformanceMonitor;
  const INTERACTION_THRESHOLD = 100; // 100ms requirement
  const performanceResults: PerformanceMetrics[] = [];

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor(page);
    await performanceMonitor.startMonitoring();
  });

  test.afterAll(async () => {
    // Generate performance report
    const report = generatePerformanceReport(performanceResults);
    console.log('\n=== PERFORMANCE VALIDATION REPORT ===');
    console.log(report);
  });

  test('1. Initial Load Performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    const metrics = await performanceMonitor.getPerformanceMetrics();
    const memoryUsage = await performanceMonitor.measureMemoryUsage();

    const testMetrics: PerformanceMetrics = {
      testName: 'Initial Load Performance',
      loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      interactionResponseTimes: [],
      memoryUsage
    };

    performanceResults.push(testMetrics);

    // Validate load performance
    expect(loadTime).toBeLessThan(3000); // 3 second load time
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 second FCP
    expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5 second LCP

    console.log(`Load Time: ${loadTime}ms`);
    console.log(`First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms`);
    console.log(`Memory Usage: ${memoryUsage.toFixed(2)}MB`);
  });

  test('2. Button Click Response Times', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactionResults: Array<{ interaction: string; responseTime: number; passed: boolean }> = [];

    // Test Add Book button
    const addBookTime = await performanceMonitor.measureInteractionTime('Add Book Button', async () => {
      await page.click('button[aria-label="Add new book"], button:has-text("Add"):first');
      await page.waitForTimeout(100); // Wait for any modal or form to appear
    });
    interactionResults.push({
      interaction: 'Add Book Button',
      responseTime: addBookTime,
      passed: addBookTime < INTERACTION_THRESHOLD
    });

    // Test filter buttons using the actual UI structure
    const filterButtons = [
      { name: 'All', selector: 'tab:has-text("All")' },
      { name: 'Want to Read', selector: 'tab:has-text("Want to Read")' },
      { name: 'Reading', selector: 'tab:has-text("Reading")' },
      { name: 'Finished', selector: 'tab:has-text("Finished")' }
    ];
    
    for (const filter of filterButtons) {
      const filterTime = await performanceMonitor.measureInteractionTime(`Filter: ${filter.name}`, async () => {
        await page.click(filter.selector);
        await page.waitForTimeout(50); // Small delay for UI update
      });
      interactionResults.push({
        interaction: `Filter: ${filter.name}`,
        responseTime: filterTime,
        passed: filterTime < INTERACTION_THRESHOLD
      });
    }

    const testMetrics: PerformanceMetrics = {
      testName: 'Button Click Response Times',
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      interactionResponseTimes: interactionResults
    };

    performanceResults.push(testMetrics);

    // Validate all interactions meet the 100ms requirement
    interactionResults.forEach(result => {
      console.log(`${result.interaction}: ${result.responseTime}ms - ${result.passed ? 'PASSED' : 'FAILED'}`);
      expect(result.responseTime).toBeLessThan(INTERACTION_THRESHOLD);
    });
  });

  test('3. Progress Slider Performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactionResults: Array<{ interaction: string; responseTime: number; passed: boolean }> = [];

    // Test progress slider interactions with existing books
    const progressSliders = page.locator('slider[aria-label="Progress"]');
    const sliderCount = await progressSliders.count();
    
    if (sliderCount > 0) {
      // Test the first available slider
      const firstSlider = progressSliders.first();
      
      // Test multiple slider adjustments
      const progressValues = [10, 25, 50, 75, 90];
      for (const progress of progressValues) {
        const sliderTime = await performanceMonitor.measureInteractionTime(`Progress to ${progress}%`, async () => {
          await firstSlider.fill(progress.toString());
          await page.waitForTimeout(50); // Allow for UI update
        });
        interactionResults.push({
          interaction: `Progress Slider: ${progress}%`,
          responseTime: sliderTime,
          passed: sliderTime < INTERACTION_THRESHOLD
        });
      }
    } else {
      console.log('No progress sliders found - skipping slider performance tests');
    }

    const testMetrics: PerformanceMetrics = {
      testName: 'Progress Slider Performance',
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      interactionResponseTimes: interactionResults
    };

    performanceResults.push(testMetrics);

    interactionResults.forEach(result => {
      console.log(`${result.interaction}: ${result.responseTime}ms - ${result.passed ? 'PASSED' : 'FAILED'}`);
      expect(result.responseTime).toBeLessThan(INTERACTION_THRESHOLD);
    });
  });

  test('4. Load Testing with Existing Books', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startMemory = await performanceMonitor.measureMemoryUsage();
    const interactionResults: Array<{ interaction: string; responseTime: number; passed: boolean }> = [];

    // Test rapid interactions with existing books
    const bookCards = page.locator('[role="article"], .book-card, [class*="book"]').first();
    const progressSliders = page.locator('slider[aria-label="Progress"]');
    const quickActionButtons = page.locator('button:has-text("+10%"), button:has-text("+25%"), button:has-text("Done")');

    // Test multiple rapid progress slider interactions
    if (await progressSliders.count() > 0) {
      const slider = progressSliders.first();
      const progressValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95];
      
      for (let i = 0; i < progressValues.length; i++) {
        const progress = progressValues[i];
        const updateTime = await performanceMonitor.measureInteractionTime(
          `Rapid Progress Update ${i + 1}`, 
          async () => {
            await slider.fill(progress.toString());
            await page.waitForTimeout(25); // Minimal delay
          }
        );
        
        interactionResults.push({
          interaction: `Rapid Progress Update ${i + 1}: ${progress}%`,
          responseTime: updateTime,
          passed: updateTime < INTERACTION_THRESHOLD
        });
      }
    }

    // Test quick action buttons if available
    if (await quickActionButtons.count() > 0) {
      const buttons = await quickActionButtons.all();
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const button = buttons[i];
        const buttonText = await button.textContent();
        
        const clickTime = await performanceMonitor.measureInteractionTime(
          `Quick Action: ${buttonText}`, 
          async () => {
            await button.click();
            await page.waitForTimeout(25);
          }
        );
        
        interactionResults.push({
          interaction: `Quick Action: ${buttonText?.trim()}`,
          responseTime: clickTime,
          passed: clickTime < INTERACTION_THRESHOLD
        });
      }
    }

    const endMemory = await performanceMonitor.measureMemoryUsage();
    const memoryChange = endMemory - startMemory;

    const testMetrics: PerformanceMetrics = {
      testName: 'Load Testing with Existing Books',
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      interactionResponseTimes: interactionResults,
      memoryUsage: memoryChange
    };

    performanceResults.push(testMetrics);

    console.log(`Memory change during load testing: ${memoryChange.toFixed(2)}MB`);
    
    // Validate reasonable memory usage
    expect(Math.abs(memoryChange)).toBeLessThan(20); // Less than 20MB change
  });

  test('5. Rapid Filter Switching Stress Test', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactionResults: Array<{ interaction: string; responseTime: number; passed: boolean }> = [];
    const filters = ['All', 'Currently Reading', 'Want to Read', 'Completed'];

    // Perform rapid filter switching (10 cycles)
    for (let cycle = 0; cycle < 10; cycle++) {
      for (const filter of filters) {
        const filterTime = await performanceMonitor.measureInteractionTime(
          `Rapid Filter ${cycle + 1}: ${filter}`, 
          async () => {
            await page.click(`button:has-text("${filter}")`);
            await page.waitForTimeout(25); // Minimal delay
          }
        );
        
        interactionResults.push({
          interaction: `Rapid Filter ${cycle + 1}: ${filter}`,
          responseTime: filterTime,
          passed: filterTime < INTERACTION_THRESHOLD
        });
      }
    }

    const testMetrics: PerformanceMetrics = {
      testName: 'Rapid Filter Switching Stress Test',
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      interactionResponseTimes: interactionResults
    };

    performanceResults.push(testMetrics);

    // Calculate average response time
    const avgResponseTime = interactionResults.reduce((sum, result) => sum + result.responseTime, 0) / interactionResults.length;
    console.log(`Average rapid filter response time: ${avgResponseTime.toFixed(2)}ms`);

    // At least 95% of interactions should meet the threshold
    const passedInteractions = interactionResults.filter(r => r.passed).length;
    const passRate = (passedInteractions / interactionResults.length) * 100;
    
    console.log(`Pass rate for rapid filtering: ${passRate.toFixed(1)}%`);
    expect(passRate).toBeGreaterThan(95);
  });

  test('6. Search Performance with Various Queries', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactionResults: Array<{ interaction: string; responseTime: number; passed: boolean }> = [];
    
    // Test search functionality with the actual search input
    const searchInput = page.locator('textbox[placeholder="Search books..."]');
    
    if (await searchInput.count() > 0) {
      const searchQueries = [
        'Gatsby', 'Dune', 'Midnight', 'Frank', 'Matt', 
        'nonexistent', 'the', 'book'
      ];

      for (const query of searchQueries) {
        const searchTime = await performanceMonitor.measureInteractionTime(
          `Search: "${query}"`, 
          async () => {
            await searchInput.fill('');
            await searchInput.fill(query);
            await page.waitForTimeout(50); // Allow for search filtering
          }
        );
        
        interactionResults.push({
          interaction: `Search: "${query}"`,
          responseTime: searchTime,
          passed: searchTime < INTERACTION_THRESHOLD
        });
      }
    } else {
      console.log('No search functionality found - skipping search performance tests');
    }

    const testMetrics: PerformanceMetrics = {
      testName: 'Search Performance',
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      interactionResponseTimes: interactionResults
    };

    performanceResults.push(testMetrics);

    if (interactionResults.length > 0) {
      interactionResults.forEach(result => {
        console.log(`${result.interaction}: ${result.responseTime}ms - ${result.passed ? 'PASSED' : 'FAILED'}`);
        expect(result.responseTime).toBeLessThan(INTERACTION_THRESHOLD);
      });
    }
  });

  test('7. Sequential Progress Updates Performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const interactionResults: Array<{ interaction: string; responseTime: number; passed: boolean }> = [];
    
    // Test sequential progress updates with existing books
    const progressSliders = page.locator('slider[aria-label="Progress"]');
    if (await progressSliders.count() > 0) {
      const firstSlider = progressSliders.first();
      
      // Perform 15 sequential progress updates
      for (let i = 1; i <= 15; i++) {
        const progress = i * 6; // 6, 12, 18, ... 90
        const updateTime = await performanceMonitor.measureInteractionTime(
          `Sequential Update ${i}`, 
          async () => {
            await firstSlider.fill(progress.toString());
            await page.waitForTimeout(25);
          }
        );
        
        interactionResults.push({
          interaction: `Sequential Progress Update ${i} (${progress}%)`,
          responseTime: updateTime,
          passed: updateTime < INTERACTION_THRESHOLD
        });
      }
    } else {
      console.log('No progress sliders found - skipping sequential update tests');
    }

    const testMetrics: PerformanceMetrics = {
      testName: 'Sequential Progress Updates',
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      interactionResponseTimes: interactionResults
    };

    performanceResults.push(testMetrics);

    if (interactionResults.length > 0) {
      const avgResponseTime = interactionResults.reduce((sum, result) => sum + result.responseTime, 0) / interactionResults.length;
      console.log(`Average sequential update response time: ${avgResponseTime.toFixed(2)}ms`);

      interactionResults.forEach(result => {
        expect(result.responseTime).toBeLessThan(INTERACTION_THRESHOLD);
      });
    }
  });
});

function generatePerformanceReport(results: PerformanceMetrics[]): string {
  let report = '\n';
  report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                    PUKA READING TRACKER PERFORMANCE REPORT                  ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

  // Summary statistics
  let totalInteractions = 0;
  let passedInteractions = 0;
  let totalResponseTime = 0;
  let slowestInteraction = { name: '', time: 0 };
  let fastestInteraction = { name: '', time: Infinity };

  results.forEach(testMetrics => {
    report += `📊 ${testMetrics.testName}\n`;
    report += '─'.repeat(50) + '\n';

    if (testMetrics.loadTime > 0) {
      report += `• Load Time: ${testMetrics.loadTime}ms\n`;
    }
    if (testMetrics.firstContentfulPaint > 0) {
      report += `• First Contentful Paint: ${testMetrics.firstContentfulPaint.toFixed(2)}ms\n`;
    }
    if (testMetrics.largestContentfulPaint > 0) {
      report += `• Largest Contentful Paint: ${testMetrics.largestContentfulPaint.toFixed(2)}ms\n`;
    }
    if (testMetrics.memoryUsage !== undefined) {
      report += `• Memory Usage: ${testMetrics.memoryUsage.toFixed(2)}MB\n`;
    }

    if (testMetrics.interactionResponseTimes.length > 0) {
      const avgTime = testMetrics.interactionResponseTimes.reduce((sum, r) => sum + r.responseTime, 0) / testMetrics.interactionResponseTimes.length;
      const passed = testMetrics.interactionResponseTimes.filter(r => r.passed).length;
      const passRate = (passed / testMetrics.interactionResponseTimes.length) * 100;

      report += `• Interactions Tested: ${testMetrics.interactionResponseTimes.length}\n`;
      report += `• Average Response Time: ${avgTime.toFixed(2)}ms\n`;
      report += `• Pass Rate: ${passRate.toFixed(1)}% (${passed}/${testMetrics.interactionResponseTimes.length})\n`;

      // Update global statistics
      totalInteractions += testMetrics.interactionResponseTimes.length;
      passedInteractions += passed;
      totalResponseTime += testMetrics.interactionResponseTimes.reduce((sum, r) => sum + r.responseTime, 0);

      testMetrics.interactionResponseTimes.forEach(interaction => {
        if (interaction.responseTime > slowestInteraction.time) {
          slowestInteraction = { name: interaction.interaction, time: interaction.responseTime };
        }
        if (interaction.responseTime < fastestInteraction.time) {
          fastestInteraction = { name: interaction.interaction, time: interaction.responseTime };
        }
      });

      // Show failed interactions
      const failedInteractions = testMetrics.interactionResponseTimes.filter(r => !r.passed);
      if (failedInteractions.length > 0) {
        report += `\n❌ Failed Interactions (>${100}ms):\n`;
        failedInteractions.forEach(interaction => {
          report += `   • ${interaction.interaction}: ${interaction.responseTime}ms\n`;
        });
      }
    }

    report += '\n';
  });

  // Overall summary
  report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                              OVERALL SUMMARY                                 ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

  if (totalInteractions > 0) {
    const overallPassRate = (passedInteractions / totalInteractions) * 100;
    const avgResponseTime = totalResponseTime / totalInteractions;

    report += `📈 PERFORMANCE METRICS:\n`;
    report += `• Total Interactions Tested: ${totalInteractions}\n`;
    report += `• Overall Pass Rate: ${overallPassRate.toFixed(1)}% (${passedInteractions}/${totalInteractions})\n`;
    report += `• Average Response Time: ${avgResponseTime.toFixed(2)}ms\n`;
    report += `• Fastest Interaction: ${fastestInteraction.name} (${fastestInteraction.time}ms)\n`;
    report += `• Slowest Interaction: ${slowestInteraction.name} (${slowestInteraction.time}ms)\n\n`;

    // Performance validation
    report += `🎯 REQUIREMENT VALIDATION:\n`;
    report += `• <100ms Interaction Requirement: ${overallPassRate >= 95 ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `   (${overallPassRate.toFixed(1)}% pass rate - target: 95%+)\n\n`;

    // Recommendations
    report += `💡 OPTIMIZATION RECOMMENDATIONS:\n`;
    if (overallPassRate < 95) {
      report += `• Critical: Address slow interactions exceeding 100ms threshold\n`;
    }
    if (avgResponseTime > 50) {
      report += `• Consider optimizing frequently used interactions\n`;
    }
    if (slowestInteraction.time > 200) {
      report += `• Investigate "${slowestInteraction.name}" for performance bottlenecks\n`;
    }
    
    report += `• Implement performance monitoring in production\n`;
    report += `• Consider lazy loading for large datasets\n`;
    report += `• Optimize re-renders with React.memo where appropriate\n`;
    report += `• Profile memory usage during extended sessions\n\n`;
  }

  report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                        PERFORMANCE TEST COMPLETED                           ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════╝\n';

  return report;
}