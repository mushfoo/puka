#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Puka Reading Tracker Performance Validation...\n');

// Ensure test results directory exists
const testResultsDir = path.join(__dirname, '..', 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// Run Playwright performance tests
const playwrightProcess = spawn('npx', ['playwright', 'test', '--config=playwright.config.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

playwrightProcess.on('close', (code) => {
  console.log(`\n📊 Performance tests completed with exit code: ${code}`);
  
  // Check if results file exists and display summary
  const resultsFile = path.join(testResultsDir, 'performance-results.json');
  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      displayTestSummary(results);
    } catch (error) {
      console.error('Error reading performance results:', error.message);
    }
  }

  // Show HTML report location
  const htmlReportDir = path.join(testResultsDir, 'performance-report');
  if (fs.existsSync(htmlReportDir)) {
    console.log(`\n📋 Detailed HTML report available at: ${htmlReportDir}/index.html`);
    console.log('   Run: npx playwright show-report test-results/performance-report');
  }

  process.exit(code);
});

playwrightProcess.on('error', (error) => {
  console.error('Error running performance tests:', error.message);
  process.exit(1);
});

function displayTestSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(60));
  
  const stats = results.stats || {};
  console.log(`Tests: ${stats.expected || 0} passed, ${stats.unexpected || 0} failed, ${stats.skipped || 0} skipped`);
  console.log(`Duration: ${((results.stats?.duration || 0) / 1000).toFixed(2)}s`);
  
  if (stats.unexpected > 0) {
    console.log('\n❌ Some performance tests failed - check the detailed report for optimization recommendations');
  } else {
    console.log('\n✅ All performance tests passed - your application meets the <100ms interaction requirement');
  }
}