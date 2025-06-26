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
  summary?: string;
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

test.describe('Puka Reading Tracker - Comprehensive Performance Validation', () => {
  
  test.afterAll(async () => {
    // Generate comprehensive performance report
    const report = generatePerformanceReport(performanceResults);
    console.log('\n' + '='.repeat(80));
    console.log('PUKA READING TRACKER PERFORMANCE VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(report);
  });

  test('📊 Initial Load Performance', async ({ page }) => {
    console.log('\n🚀 Testing Initial Load Performance...');
    
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
      memoryUsage,
      summary: `Load: ${loadTime}ms, FCP: ${metrics.firstContentfulPaint.toFixed(0)}ms, Memory: ${memoryUsage.toFixed(1)}MB`
    };

    performanceResults.push(result);

    // Validate load performance
    expect(loadTime).toBeLessThan(3000); // 3 second load time
    expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5 second FCP
    
    console.log(`✅ Load Time: ${loadTime}ms (target: <3000ms)`);
    console.log(`✅ First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms (target: <1500ms)`);
    console.log(`📊 Memory Usage: ${memoryUsage.toFixed(2)}MB`);
  });

  test('🎯 Filter Tab Performance', async ({ page }) => {
    console.log('\n🔄 Testing Filter Tab Performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Get all filter tabs
    const filterTabs = await page.locator('[role="tab"]').all();
    
    console.log(`Found ${filterTabs.length} filter tabs`);

    for (let i = 0; i < filterTabs.length; i++) {
      const tab = filterTabs[i];
      const tabText = (await tab.textContent())?.trim() || `Tab ${i + 1}`;
      
      try {
        const result = await measureInteraction(page, `Filter: ${tabText}`, async () => {
          await tab.click();
          await page.waitForTimeout(50); // Allow UI to update
        });
        
        measurements.push({
          action: `Filter Tab: ${tabText}`,
          responseTime: result.responseTime,
          passed: result.passed,
          threshold: INTERACTION_THRESHOLD
        });

        console.log(`   ${tabText}: ${result.responseTime}ms ${result.passed ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${tabText}: ERROR - ${error}`);
      }
    }

    const result: PerformanceResult = {
      testName: 'Filter Tab Performance',
      measurements,
      summary: `${measurements.length} tabs tested, ${measurements.filter(m => m.passed).length} passed`
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(80);
      console.log(`📊 Pass Rate: ${passRate.toFixed(1)}%`);
    }
  });

  test('⚡ Progress Slider Performance', async ({ page }) => {
    console.log('\n📊 Testing Progress Slider Performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Find progress sliders
    const progressSliders = await page.locator('input[type="range"]').all();
    
    console.log(`Found ${progressSliders.length} progress sliders`);
    
    if (progressSliders.length > 0) {
      const firstSlider = progressSliders[0];
      
      // Test slider adjustments
      const progressValues = [10, 25, 50, 75, 90];
      for (const progress of progressValues) {
        try {
          const result = await measureInteraction(page, `Progress: ${progress}%`, async () => {
            await firstSlider.fill(progress.toString());
            await page.waitForTimeout(50);
          });
          
          measurements.push({
            action: `Progress: ${progress}%`,
            responseTime: result.responseTime,
            passed: result.passed,
            threshold: INTERACTION_THRESHOLD
          });

          console.log(`   ${progress}%: ${result.responseTime}ms ${result.passed ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`   ${progress}%: ERROR`);
        }
      }
    } else {
      console.log('   No progress sliders found');
    }

    const result: PerformanceResult = {
      testName: 'Progress Slider Performance',
      measurements,
      summary: `${measurements.length} slider interactions tested`
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(80);
      console.log(`📊 Pass Rate: ${passRate.toFixed(1)}%`);
    }
  });

  test('🔍 Search Input Performance', async ({ page }) => {
    console.log('\n🔍 Testing Search Input Performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Test search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    
    if (await searchInput.count() > 0) {
      const searchQueries = ['Gatsby', 'Dune', 'test', 'xyz'];

      for (const query of searchQueries) {
        try {
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

          console.log(`   "${query}": ${result.responseTime}ms ${result.passed ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`   "${query}": ERROR`);
        }
      }
    } else {
      console.log('   No search input found');
    }

    const result: PerformanceResult = {
      testName: 'Search Performance',
      measurements,
      summary: `${measurements.length} search queries tested`
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(80);
    }
  });

  test('🖱️ Button Click Performance', async ({ page }) => {
    console.log('\n🖱️ Testing Button Click Performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Test various button interactions
    const buttonTests = [
      { name: 'Add New Book', selector: 'button[aria-label*="Add"]' },
      { name: '+10% Button', selector: 'button:has-text("+10%")' },
      { name: '+25% Button', selector: 'button:has-text("+25%")' },
      { name: 'Done Button', selector: 'button:has-text("Done")' }
    ];

    for (const buttonTest of buttonTests) {
      try {
        const buttonLocator = page.locator(buttonTest.selector).first();
        const buttonExists = await buttonLocator.count() > 0;
        
        if (buttonExists) {
          const result = await measureInteraction(page, buttonTest.name, async () => {
            await buttonLocator.click();
            await page.waitForTimeout(50);
          });
          
          measurements.push({
            action: buttonTest.name,
            responseTime: result.responseTime,
            passed: result.passed,
            threshold: INTERACTION_THRESHOLD
          });

          console.log(`   ${buttonTest.name}: ${result.responseTime}ms ${result.passed ? '✅' : '❌'}`);
        } else {
          console.log(`   ${buttonTest.name}: Not found`);
        }
      } catch (error) {
        console.log(`   ${buttonTest.name}: ERROR`);
      }
    }

    const result: PerformanceResult = {
      testName: 'Button Click Performance',
      measurements,
      summary: `${measurements.length} button interactions tested`
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(70);
    }
  });

  test('🔥 Stress Test - Rapid Interactions', async ({ page }) => {
    console.log('\n🔥 Testing Rapid Interaction Performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const measurements: Array<{ action: string; responseTime: number; passed: boolean; threshold: number }> = [];

    // Get filter tabs for rapid switching
    const filterTabs = await page.locator('[role="tab"]').all();
    
    if (filterTabs.length >= 2) {
      console.log(`Performing rapid switching between ${filterTabs.length} tabs`);
      
      // Perform rapid switching
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let i = 0; i < Math.min(2, filterTabs.length); i++) {
          const tab = filterTabs[i];
          const tabText = (await tab.textContent())?.trim() || `Tab ${i}`;
          
          try {
            const result = await measureInteraction(page, `Rapid Switch ${cycle + 1}: ${tabText}`, async () => {
              await tab.click();
              await page.waitForTimeout(25); // Minimal delay
            });
            
            measurements.push({
              action: `Rapid Switch ${cycle + 1}: ${tabText}`,
              responseTime: result.responseTime,
              passed: result.passed,
              threshold: INTERACTION_THRESHOLD
            });

            console.log(`   Cycle ${cycle + 1} ${tabText}: ${result.responseTime}ms ${result.passed ? '✅' : '❌'}`);
          } catch (error) {
            console.log(`   Cycle ${cycle + 1} ${tabText}: ERROR`);
          }
        }
      }
    } else {
      console.log('   Insufficient tabs for stress test');
    }

    const result: PerformanceResult = {
      testName: 'Rapid Interaction Stress Test',
      measurements,
      summary: `${measurements.length} rapid interactions tested`
    };

    performanceResults.push(result);

    if (measurements.length > 0) {
      const passRate = (measurements.filter(m => m.passed).length / measurements.length) * 100;
      expect(passRate).toBeGreaterThan(85);
      console.log(`📊 Stress Test Pass Rate: ${passRate.toFixed(1)}%`);
    }
  });

  test('💾 Memory Usage Analysis', async ({ page }) => {
    console.log('\n💾 Testing Memory Usage...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startMemory = await getMemoryUsage(page);
    console.log(`   Initial Memory: ${startMemory.toFixed(2)}MB`);
    
    // Perform various interactions to stress memory
    const filterTabs = await page.locator('[role="tab"]').all();
    const progressSliders = await page.locator('input[type="range"]').all();

    // Simulate extended user session
    for (let i = 0; i < 15; i++) {
      if (filterTabs.length > 0) {
        const randomTab = filterTabs[i % filterTabs.length];
        await randomTab.click();
        await page.waitForTimeout(100);
      }

      if (progressSliders.length > 0) {
        const randomSlider = progressSliders[0];
        const randomValue = Math.floor(Math.random() * 100);
        await randomSlider.fill(randomValue.toString());
        await page.waitForTimeout(50);
      }
    }

    const endMemory = await getMemoryUsage(page);
    const memoryChange = endMemory - startMemory;
    
    console.log(`   Final Memory: ${endMemory.toFixed(2)}MB`);
    console.log(`   Memory Change: ${memoryChange.toFixed(2)}MB`);

    const result: PerformanceResult = {
      testName: 'Memory Usage Analysis',
      measurements: [],
      memoryUsage: memoryChange,
      summary: `Memory change: ${memoryChange.toFixed(2)}MB during extended session`
    };

    performanceResults.push(result);

    // Memory increase should be reasonable (no major leaks)
    expect(Math.abs(memoryChange)).toBeLessThan(15);
    
    if (memoryChange > 10) {
      console.log('⚠️  High memory usage detected - consider investigating for leaks');
    } else {
      console.log('✅ Memory usage within acceptable limits');
    }
  });
});

function generatePerformanceReport(results: PerformanceResult[]): string {
  let report = '\n';
  
  let totalInteractions = 0;
  let passedInteractions = 0;
  let totalResponseTime = 0;
  let slowestInteraction = { name: '', time: 0 };
  let fastestInteraction = { name: '', time: Infinity };
  let loadTime = 0;
  let memoryChange = 0;

  // Calculate overall statistics
  results.forEach(result => {
    if (result.loadMetrics) {
      loadTime = result.loadMetrics.loadTime;
    }
    
    if (result.memoryUsage) {
      memoryChange = result.memoryUsage;
    }

    result.measurements.forEach(measurement => {
      totalInteractions++;
      totalResponseTime += measurement.responseTime;
      
      if (measurement.passed) passedInteractions++;
      
      if (measurement.responseTime > slowestInteraction.time) {
        slowestInteraction = { name: measurement.action, time: measurement.responseTime };
      }
      
      if (measurement.responseTime < fastestInteraction.time) {
        fastestInteraction = { name: measurement.action, time: measurement.responseTime };
      }
    });
  });

  const overallPassRate = totalInteractions > 0 ? (passedInteractions / totalInteractions) * 100 : 100;
  const avgResponseTime = totalInteractions > 0 ? totalResponseTime / totalInteractions : 0;

  // Header
  report += '╔═══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                          PERFORMANCE SUMMARY                                 ║\n';
  report += '╚═══════════════════════════════════════════════════════════════════════════════╝\n\n';

  // Key Metrics
  report += '📊 KEY PERFORMANCE METRICS:\n';
  report += `   • Load Time: ${loadTime}ms\n`;
  report += `   • Total Interactions Tested: ${totalInteractions}\n`;
  report += `   • Overall Pass Rate: ${overallPassRate.toFixed(1)}% (${passedInteractions}/${totalInteractions})\n`;
  report += `   • Average Response Time: ${avgResponseTime.toFixed(2)}ms\n`;
  
  if (fastestInteraction.time !== Infinity) {
    report += `   • Fastest Interaction: ${fastestInteraction.name} (${fastestInteraction.time}ms)\n`;
  }
  if (slowestInteraction.time > 0) {
    report += `   • Slowest Interaction: ${slowestInteraction.name} (${slowestInteraction.time}ms)\n`;
  }
  
  report += `   • Memory Change: ${memoryChange.toFixed(2)}MB\n\n`;

  // Performance Grade
  let grade = 'F';
  let gradeColor = '🔴';
  
  if (overallPassRate >= 95 && avgResponseTime < 50 && loadTime < 1000) {
    grade = 'A+';
    gradeColor = '🟢';
  } else if (overallPassRate >= 90 && avgResponseTime < 75 && loadTime < 1500) {
    grade = 'A';
    gradeColor = '🟢';
  } else if (overallPassRate >= 85 && avgResponseTime < 100 && loadTime < 2000) {
    grade = 'B';
    gradeColor = '🟡';
  } else if (overallPassRate >= 80 && loadTime < 3000) {
    grade = 'C';
    gradeColor = '🟡';
  } else if (overallPassRate >= 70) {
    grade = 'D';
    gradeColor = '🟠';
  }

  report += `${gradeColor} PERFORMANCE GRADE: ${grade}\n\n`;

  // Requirement Validation
  report += '🎯 REQUIREMENT VALIDATION:\n';
  report += `   • <100ms Interaction Requirement: ${overallPassRate >= 90 ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `     (${overallPassRate.toFixed(1)}% pass rate - target: 90%+)\n`;
  report += `   • <3s Load Time Requirement: ${loadTime < 3000 ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `     (${loadTime}ms - target: <3000ms)\n`;
  report += `   • Memory Stability: ${Math.abs(memoryChange) < 15 ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `     (${memoryChange.toFixed(2)}MB change - target: <15MB)\n\n`;

  // Detailed Test Results
  report += '📋 DETAILED TEST RESULTS:\n';
  results.forEach(result => {
    report += `\n   ${result.testName}:\n`;
    if (result.summary) {
      report += `     └─ ${result.summary}\n`;
    }
    
    if (result.measurements.length > 0) {
      const passRate = (result.measurements.filter(m => m.passed).length / result.measurements.length) * 100;
      report += `     └─ Pass Rate: ${passRate.toFixed(1)}%\n`;
      
      // Show failed interactions
      const failed = result.measurements.filter(m => !m.passed);
      if (failed.length > 0) {
        report += `     └─ Failed: ${failed.map(f => `${f.action} (${f.responseTime}ms)`).join(', ')}\n`;
      }
    }
  });

  // Recommendations
  report += '\n💡 OPTIMIZATION RECOMMENDATIONS:\n';
  
  if (overallPassRate < 90) {
    report += '   🔴 CRITICAL: Address slow interactions exceeding 100ms threshold\n';
  }
  if (avgResponseTime > 75) {
    report += '   🟡 MODERATE: Consider optimizing interaction response times\n';
  }
  if (loadTime > 2000) {
    report += '   🟡 MODERATE: Optimize initial load time\n';
  }
  if (Math.abs(memoryChange) > 10) {
    report += '   🟡 MODERATE: Monitor memory usage for potential leaks\n';
  }
  
  report += '   • Implement React.memo() for frequently re-rendering components\n';
  report += '   • Add debouncing for search and rapid filter operations\n';
  report += '   • Consider virtualization for large lists\n';
  report += '   • Profile component render times in production\n';
  report += '   • Implement performance monitoring dashboard\n\n';

  report += '╔═══════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                    PERFORMANCE VALIDATION COMPLETED                          ║\n';
  report += '╚═══════════════════════════════════════════════════════════════════════════════╝\n';

  return report;
}