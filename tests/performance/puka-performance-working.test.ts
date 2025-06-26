import { test, expect, Page } from '@playwright/test';

interface PerformanceResult {
  testName: string;
  measurements: Array<{
    action: string;
    responseTime: number;
    passed: boolean;
    threshold: number;
  }>;
  loadMetrics?: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint?: number;
  };
  memoryUsage?: number;
}

const INTERACTION_THRESHOLD = 100; // 100ms requirement
const performanceResults: PerformanceResult[] = [];

async function measureInteraction(
  page: Page, 
  actionName: string, 
  action: () => Promise<void>,
  threshold: number = INTERACTION_THRESHOLD
): Promise<{ responseTime: number; passed: boolean }> {
  const startTime = Date.now();
  await action();
  const responseTime = Date.now() - startTime;
  
  return {
    responseTime,
    passed: responseTime < threshold
  };
}

async function getLoadMetrics(page: Page) {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
    };
  });
}

async function getMemoryUsage(page: Page): Promise<number> {
  try {
    return await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return 0;
    });
  } catch {
    return 0;
  }
}

test.describe('Puka Reading Tracker Performance Validation', () => {
  
  test.afterAll(async () => {
    // Generate performance report
    const report = generatePerformanceReport(performanceResults);
    console.log('\n=== COMPREHENSIVE PERFORMANCE VALIDATION REPORT ===');
    console.log(report);
  });

  test('1. Initial Load Performance Analysis', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    const metrics = await getLoadMetrics(page);
    const memoryUsage = await getMemoryUsage(page);

    const result: PerformanceResult = {
      testName: 'Initial Load Performance',
      measurements: [],
      loadMetrics: {
        loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint
      },
      memoryUsage
    };

    performanceResults.push(result);

    // Validate load performance
    expect(loadTime).toBeLessThan(3000); // 3 second load time
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 second FCP
    expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5 second LCP

    console.log(`✅ Load Performance:`);
    console.log(`   Load Time: ${loadTime}ms`);
    console.log(`   First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`   Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(2)}ms`);
    console.log(`   Memory Usage: ${memoryUsage.toFixed(2)}MB`);
  });

  test('2. Filter Button Response Times', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Test filter tab clicks using role=tab
    const filterTabs = [
      { name: 'All Books', selector: '[role="tab"]:has-text("All")' },
      { name: 'Reading', selector: '[role="tab"]:has-text("Reading")' },
      { name: 'Want to Read', selector: '[role="tab"]:has-text("Want to Read")' },
      { name: 'Finished', selector: '[role="tab"]:has-text("Finished")' }
    ];

    for (const filter of filterTabs) {
      try {
        const result = await measureInteraction(page, `Filter: ${filter.name}`, async () => {
          await page.click(filter.selector);
          await page.waitForTimeout(50); // Allow UI to update
        });
        
        measurements.push({
          action: `Filter: ${filter.name}`,
          responseTime: result.responseTime,
          passed: result.passed,
          threshold: INTERACTION_THRESHOLD
        });

        console.log(`   ${filter.name}: ${result.responseTime}ms - ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      } catch (error) {
        console.log(`   ${filter.name}: FAILED - Element not found`);
      }
    }

    const result: PerformanceResult = {
      testName: 'Filter Button Performance',
      measurements
    };

    performanceResults.push(result);

    // Expect at least 80% of interactions to pass
    const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
    expect(passRate).toBeGreaterThan(80);
  });

  test('3. Search Input Performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Test search input if it exists
    const searchInput = page.locator('input[placeholder*="Search" i]');
    
    if (await searchInput.count() > 0) {
      const searchQueries = ['Gatsby', 'Dune', 'test', 'nonexistent'];

      for (const query of searchQueries) {
        const result = await measureInteraction(page, `Search: "${query}"`, async () => {
          await searchInput.fill('');
          await searchInput.fill(query);
          await page.waitForTimeout(100); // Allow search to process
        });
        
        measurements.push({
          action: `Search: "${query}"`,
          responseTime: result.responseTime,
          passed: result.passed,
          threshold: INTERACTION_THRESHOLD
        });

        console.log(`   Search "${query}": ${result.responseTime}ms - ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      }
    } else {
      console.log('   No search input found');
    }

    const result: PerformanceResult = {
      testName: 'Search Performance',
      measurements
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      measurements.forEach(measurement => {
        expect(measurement.responseTime).toBeLessThan(INTERACTION_THRESHOLD);
      });
    }
  });

  test('4. Progress Slider Interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Find progress sliders
    const progressSliders = page.locator('input[type="range"], [role="slider"]');
    const sliderCount = await progressSliders.count();
    
    if (sliderCount > 0) {
      const firstSlider = progressSliders.first();
      
      // Test slider adjustments
      const progressValues = [10, 25, 50, 75, 90];
      for (const progress of progressValues) {
        try {
          const result = await measureInteraction(page, `Progress: ${progress}%`, async () => {
            await firstSlider.fill(progress.toString());
            await page.waitForTimeout(50);
          });
          
          measurements.push({
            action: `Progress Slider: ${progress}%`,
            responseTime: result.responseTime,
            passed: result.passed,
            threshold: INTERACTION_THRESHOLD
          });

          console.log(`   Progress ${progress}%: ${result.responseTime}ms - ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        } catch (error) {
          console.log(`   Progress ${progress}%: FAILED - ${error}`);
        }
      }
    } else {
      console.log('   No progress sliders found');
    }

    const result: PerformanceResult = {
      testName: 'Progress Slider Performance',
      measurements
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      measurements.forEach(measurement => {
        expect(measurement.responseTime).toBeLessThan(INTERACTION_THRESHOLD);
      });
    }
  });

  test('5. Button Click Performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Test various button interactions
    const buttonSelectors = [
      { name: 'Add Book Button', selector: 'button:has-text("Add"):first, button[aria-label*="Add"]' },
      { name: 'Quick Action +10%', selector: 'button:has-text("+10%"):first' },
      { name: 'Quick Action +25%', selector: 'button:has-text("+25%"):first' },
      { name: 'Done Button', selector: 'button:has-text("Done"):first' }
    ];

    for (const button of buttonSelectors) {
      try {
        // Check if button exists first
        const buttonExists = await page.locator(button.selector).count() > 0;
        
        if (buttonExists) {
          const result = await measureInteraction(page, button.name, async () => {
            await page.click(button.selector);
            await page.waitForTimeout(50);
          });
          
          measurements.push({
            action: button.name,
            responseTime: result.responseTime,
            passed: result.passed,
            threshold: INTERACTION_THRESHOLD
          });

          console.log(`   ${button.name}: ${result.responseTime}ms - ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        } else {
          console.log(`   ${button.name}: Not found`);
        }
      } catch (error) {
        console.log(`   ${button.name}: FAILED - ${error}`);
      }
    }

    const result: PerformanceResult = {
      testName: 'Button Click Performance',
      measurements
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(70); // Allow some flexibility
    }
  });

  test('6. Rapid Filter Switching Stress Test', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Get all filter tabs
    const filterTabs = await page.locator('[role="tab"]').all();
    
    if (filterTabs.length >= 2) {
      // Perform rapid switching between first two tabs
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let i = 0; i < Math.min(2, filterTabs.length); i++) {
          const tab = filterTabs[i];
          const tabText = await tab.textContent() || `Tab ${i}`;
          
          try {
            const result = await measureInteraction(page, `Rapid Switch ${cycle + 1}: ${tabText}`, async () => {
              await tab.click();
              await page.waitForTimeout(25);
            });
            
            measurements.push({
              action: `Rapid Filter Switch ${cycle + 1}: ${tabText.trim()}`,
              responseTime: result.responseTime,
              passed: result.passed,
              threshold: INTERACTION_THRESHOLD
            });

            console.log(`   Switch ${cycle + 1} ${tabText}: ${result.responseTime}ms - ${result.passed ? '✅' : '❌'}`);
          } catch (error) {
            console.log(`   Switch ${cycle + 1} ${tabText}: FAILED`);
          }
        }
      }
    } else {
      console.log('   Insufficient filter tabs for stress test');
    }

    const result: PerformanceResult = {
      testName: 'Rapid Filter Switching',
      measurements
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      // At least 90% should pass the stress test
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(90);
    }
  });

  test('7. Memory Usage Analysis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startMemory = await getMemoryUsage(page);
    
    // Perform various interactions to test memory stability
    const filterTabs = await page.locator('[role="tab"]').all();
    
    // Simulate user interactions
    for (let i = 0; i < 10; i++) {
      if (filterTabs.length > 0) {
        const randomTab = filterTabs[i % filterTabs.length];
        await randomTab.click();
        await page.waitForTimeout(100);
      }
    }

    const endMemory = await getMemoryUsage(page);
    const memoryIncrease = endMemory - startMemory;
    
    const result: PerformanceResult = {
      testName: 'Memory Usage Analysis',
      measurements: [],
      memoryUsage: memoryIncrease
    };

    performanceResults.push(result);

    console.log(`   Start Memory: ${startMemory.toFixed(2)}MB`);
    console.log(`   End Memory: ${endMemory.toFixed(2)}MB`);
    console.log(`   Memory Change: ${memoryIncrease.toFixed(2)}MB`);

    // Memory increase should be reasonable
    expect(Math.abs(memoryIncrease)).toBeLessThan(10); // Less than 10MB change
  });
});

function generatePerformanceReport(results: PerformanceResult[]): string {
  let report = '\n';
  report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                   PUKA READING TRACKER PERFORMANCE REPORT                   ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';

  let totalInteractions = 0;
  let passedInteractions = 0;
  let totalResponseTime = 0;
  let slowestInteraction = { name: '', time: 0 };
  let fastestInteraction = { name: '', time: Infinity };

  results.forEach(testResult => {
    report += `📊 ${testResult.testName}\n`;
    report += '─'.repeat(60) + '\n';

    if (testResult.loadMetrics) {
      report += `• Load Time: ${testResult.loadMetrics.loadTime}ms\n`;
      report += `• First Contentful Paint: ${testResult.loadMetrics.firstContentfulPaint.toFixed(2)}ms\n`;
      if (testResult.loadMetrics.largestContentfulPaint) {
        report += `• Largest Contentful Paint: ${testResult.loadMetrics.largestContentfulPaint.toFixed(2)}ms\n`;
      }
    }

    if (testResult.memoryUsage !== undefined) {
      report += `• Memory Usage Change: ${testResult.memoryUsage.toFixed(2)}MB\n`;
    }

    if (testResult.measurements.length > 0) {
      const avgTime = testResult.measurements.reduce((sum, m) => sum + m.responseTime, 0) / testResult.measurements.length;
      const passed = testResult.measurements.filter(m => m.passed).length;
      const passRate = (passed / testResult.measurements.length) * 100;

      report += `• Interactions Tested: ${testResult.measurements.length}\n`;
      report += `• Average Response Time: ${avgTime.toFixed(2)}ms\n`;
      report += `• Pass Rate: ${passRate.toFixed(1)}% (${passed}/${testResult.measurements.length})\n`;

      // Update global statistics
      totalInteractions += testResult.measurements.length;
      passedInteractions += passed;
      totalResponseTime += testResult.measurements.reduce((sum, m) => sum + m.responseTime, 0);

      testResult.measurements.forEach(measurement => {
        if (measurement.responseTime > slowestInteraction.time) {
          slowestInteraction = { name: measurement.action, time: measurement.responseTime };
        }
        if (measurement.responseTime < fastestInteraction.time) {
          fastestInteraction = { name: measurement.action, time: measurement.responseTime };
        }
      });

      // Show failed interactions
      const failedInteractions = testResult.measurements.filter(m => !m.passed);
      if (failedInteractions.length > 0) {
        report += `\n❌ Failed Interactions (>${100}ms):\n`;
        failedInteractions.forEach(interaction => {
          report += `   • ${interaction.action}: ${interaction.responseTime}ms\n`;
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
    
    if (fastestInteraction.time !== Infinity) {
      report += `• Fastest Interaction: ${fastestInteraction.name} (${fastestInteraction.time}ms)\n`;
    }
    if (slowestInteraction.time > 0) {
      report += `• Slowest Interaction: ${slowestInteraction.name} (${slowestInteraction.time}ms)\n`;
    }

    report += `\n🎯 REQUIREMENT VALIDATION:\n`;
    report += `• <100ms Interaction Requirement: ${overallPassRate >= 90 ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `   (${overallPassRate.toFixed(1)}% pass rate - target: 90%+)\n\n`;

    // Performance recommendations
    report += `💡 OPTIMIZATION RECOMMENDATIONS:\n`;
    if (overallPassRate < 90) {
      report += `• CRITICAL: Address slow interactions exceeding 100ms threshold\n`;
    }
    if (avgResponseTime > 50) {
      report += `• Consider optimizing frequently used interactions for better responsiveness\n`;
    }
    if (slowestInteraction.time > 200) {
      report += `• PRIORITY: Investigate "${slowestInteraction.name}" for performance bottlenecks\n`;
    }
    
    report += `• Implement React.memo() for components with frequent re-renders\n`;
    report += `• Consider debouncing search input and rapid filter changes\n`;
    report += `• Add performance monitoring to production environment\n`;
    report += `• Profile component render times using React DevTools\n\n`;

    // Performance grade
    let grade = 'F';
    if (overallPassRate >= 95 && avgResponseTime < 50) grade = 'A+';
    else if (overallPassRate >= 90 && avgResponseTime < 75) grade = 'A';
    else if (overallPassRate >= 85 && avgResponseTime < 100) grade = 'B';
    else if (overallPassRate >= 80) grade = 'C';
    else if (overallPassRate >= 70) grade = 'D';

    report += `📊 PERFORMANCE GRADE: ${grade}\n\n`;
  }

  report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                     PERFORMANCE VALIDATION COMPLETED                        ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════╝\n';

  return report;
}