// Performance Testing Script for Puka Reading Tracker
// This script performs comprehensive performance validation

class PerformanceValidator {
    constructor() {
        this.results = {
            interactionTimes: [],
            loadTimes: [],
            animationPerformance: [],
            memoryUsage: [],
            bundleSize: 0,
            networkRequests: []
        };
        this.performanceObserver = null;
        this.startTime = Date.now();
    }

    // Measure interaction response times
    async measureInteractionTime(action, expectedTime = 100) {
        const start = performance.now();
        await action();
        const end = performance.now();
        const duration = end - start;
        
        this.results.interactionTimes.push({
            action: action.name,
            duration: duration,
            passed: duration <= expectedTime,
            target: expectedTime
        });
        
        return duration;
    }

    // Measure page load performance
    measurePageLoad() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        this.results.loadTimes.push({
            loadTime: loadTime,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            passed: loadTime <= 2000,
            target: 2000
        });
        
        return loadTime;
    }

    // Monitor animation performance
    measureAnimationPerformance() {
        return new Promise((resolve) => {
            let frameCount = 0;
            let lastTime = performance.now();
            const frames = [];
            
            const checkFrame = (currentTime) => {
                frameCount++;
                const deltaTime = currentTime - lastTime;
                frames.push(deltaTime);
                lastTime = currentTime;
                
                if (frameCount < 60) { // Measure for 1 second at 60fps
                    requestAnimationFrame(checkFrame);
                } else {
                    const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
                    const fps = 1000 / avgFrameTime;
                    
                    this.results.animationPerformance.push({
                        fps: fps,
                        avgFrameTime: avgFrameTime,
                        passed: fps >= 60,
                        target: 60
                    });
                    
                    resolve(fps);
                }
            };
            
            requestAnimationFrame(checkFrame);
        });
    }

    // Monitor memory usage
    measureMemoryUsage() {
        if (performance.memory) {
            const memInfo = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            
            this.results.memoryUsage.push(memInfo);
            return memInfo;
        }
        return null;
    }

    // Analyze bundle size from network requests
    analyzeBundleSize() {
        const resources = performance.getEntriesByType('resource');
        let totalSize = 0;
        
        resources.forEach(resource => {
            if (resource.transferSize) {
                totalSize += resource.transferSize;
            }
        });
        
        this.results.bundleSize = totalSize;
        return {
            totalSize: totalSize,
            passed: totalSize <= 500000, // 500KB limit
            target: 500000
        };
    }

    // Stress test with rapid interactions
    async stressTestInteractions() {
        const stressResults = [];
        
        // Test rapid button clicks
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            // Simulate rapid interaction
            await new Promise(resolve => setTimeout(resolve, 10));
            const end = performance.now();
            stressResults.push(end - start);
        }
        
        return {
            averageResponseTime: stressResults.reduce((a, b) => a + b, 0) / stressResults.length,
            maxResponseTime: Math.max(...stressResults),
            minResponseTime: Math.min(...stressResults)
        };
    }

    // Generate comprehensive performance report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testDuration: Date.now() - this.startTime,
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0
            },
            details: this.results
        };

        // Calculate summary
        const allTests = [
            ...this.results.interactionTimes,
            ...this.results.loadTimes,
            ...this.results.animationPerformance,
            { passed: this.results.bundleSize <= 500000 }
        ];

        report.summary.totalTests = allTests.length;
        report.summary.passedTests = allTests.filter(t => t.passed).length;
        report.summary.failedTests = allTests.filter(t => !t.passed).length;

        return report;
    }
}

// Test execution functions
const testFunctions = {
    async testModalOpenClose() {
        const addButton = document.querySelector('[data-testid="add-book-button"]') || 
                         document.querySelector('button[aria-label*="Add"]') ||
                         document.querySelector('button:contains("Add")');
        
        if (addButton) {
            addButton.click();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const closeButton = document.querySelector('[data-testid="close-modal"]') ||
                               document.querySelector('button[aria-label*="Close"]');
            
            if (closeButton) {
                closeButton.click();
            }
        }
    },

    async testFilterSwitch() {
        const filterTabs = document.querySelectorAll('[role="tab"]');
        if (filterTabs.length > 0) {
            filterTabs[1].click(); // Click second tab
            await new Promise(resolve => setTimeout(resolve, 50));
            filterTabs[0].click(); // Click back to first tab
        }
    },

    async testSearchInput() {
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.value = 'test';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

// Initialize performance testing
const performanceValidator = new PerformanceValidator();

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.PerformanceValidator = PerformanceValidator;
    window.performanceValidator = performanceValidator;
    window.testFunctions = testFunctions;
    
    console.log('Performance validation tools loaded. Use:');
    console.log('- performanceValidator.measurePageLoad()');
    console.log('- performanceValidator.measureAnimationPerformance()');
    console.log('- performanceValidator.measureMemoryUsage()');
    console.log('- performanceValidator.analyzeBundleSize()');
    console.log('- performanceValidator.generateReport()');
}