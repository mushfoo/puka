# E2E Testing Guide - Puka Reading Tracker

## Overview

This document outlines the end-to-end testing setup and methodology for the Puka Reading Tracker application using Playwright.

## Test Structure

### Test Files

- **`e2e/app-basic.spec.ts`** - Core application functionality tests
- **`e2e/import-export.spec.ts`** - Import/Export feature tests  
- **`e2e/pwa.spec.ts`** - Progressive Web App functionality tests

### Test Coverage

#### Core Functionality Tests (`app-basic.spec.ts`)

1. **Basic App Loading**
   - Page title verification
   - Empty state display
   - Add book button availability

2. **Book Management**
   - Adding new books via modal
   - Form validation
   - Book display in grid

3. **Filtering System**
   - Filter by status (All, Currently Reading, Finished, Want to Read)
   - Status-based book visibility

4. **Progress Management**
   - Progress slider interaction
   - Progress percentage updates

5. **Mobile Responsiveness**
   - 375px viewport testing (iPhone SE)
   - Touch interaction handling
   - Mobile-friendly layout verification

#### Import/Export Tests (`import-export.spec.ts`)

1. **Import Functionality**
   - Import modal opening
   - CSV file upload interface
   - Drag and drop area testing

2. **Export Functionality**
   - Export modal access
   - Format selection (CSV, JSON, Goodreads)
   - Export summary display
   - Format-specific options

#### PWA Tests (`pwa.spec.ts`)

1. **Manifest Verification**
   - Manifest file availability
   - Correct manifest content
   - PWA metadata validation

2. **Service Worker**
   - Registration verification
   - Basic caching functionality

3. **Offline Functionality**
   - Offline mode simulation
   - Data persistence testing
   - Basic offline functionality

4. **Mobile PWA Features**
   - Viewport configuration
   - Apple PWA meta tags
   - Install prompt handling

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Test Commands

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Test Configuration

Tests are configured in `playwright.config.ts` with:

- **Base URL**: `http://localhost:4173` (preview server)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Devices**: Pixel 5, iPhone 12
- **Parallel Execution**: Enabled for faster test runs
- **Retry Strategy**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Video**: Retained on failure
- **Trace**: On first retry

## Test Environment Setup

### Local Development

1. Build the application: `npm run build`
2. Start preview server: `npm run preview`
3. Run tests: `npm run test:e2e`

### CI/CD Integration

The test configuration is optimized for CI environments with:
- Reduced parallelism
- Automatic retries
- Comprehensive reporting

## PWA Testing Methodology

### Manifest Testing

Tests verify:
- Manifest file accessibility
- Required PWA properties (name, start_url, display, etc.)
- Icon configurations
- Shortcuts and categories

### Service Worker Testing

Tests check:
- Registration success
- Basic caching functionality
- Offline capability simulation

### Offline Testing

- Simulates network offline state
- Verifies data persistence
- Tests basic functionality without network

## Mobile Testing Strategy

### Responsive Design Verification

- Tests at 375px width (iPhone SE baseline)
- Verifies touch interaction compatibility
- Checks mobile-specific UI adaptations

### Device-Specific Testing

- iOS Safari simulation
- Android Chrome simulation
- Various screen sizes and orientations

## Best Practices

### Test Writing Guidelines

1. **Use Descriptive Test Names**: Clearly describe what is being tested
2. **Setup/Teardown**: Use beforeEach for consistent test state
3. **Wait Strategies**: Use appropriate waits for dynamic content
4. **Selectors**: Prefer text-based selectors for better maintainability
5. **Assertions**: Use specific expectations with meaningful error messages

### Test Data Management

- Use realistic test data
- Clean up test data between runs
- Avoid dependencies between tests

### Error Handling

- Tests include proper error scenarios
- Graceful handling of missing features
- Skip tests when features are unavailable

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase wait times for slow operations
2. **Element Not Found**: Verify selectors and timing
3. **Mobile Tests Failing**: Check viewport configuration
4. **PWA Tests Skipped**: Ensure PWA features are properly implemented

### Debug Strategies

- Use `--headed` flag to see browser interactions
- Add `page.pause()` for interactive debugging
- Check browser console for JavaScript errors
- Review screenshots and videos from failed tests

## Continuous Integration

For CI/CD pipelines, ensure:

1. **Browser Installation**: Include Playwright browser installation
2. **Build Step**: Build application before testing
3. **Server Startup**: Start preview server
4. **Test Execution**: Run with CI-optimized settings
5. **Report Generation**: Collect and publish test reports

## Future Enhancements

### Planned Test Additions

1. **Performance Testing**: Core Web Vitals measurement
2. **Accessibility Testing**: A11y compliance verification
3. **Cross-Browser Testing**: Extended browser coverage
4. **API Testing**: Backend integration tests
5. **Visual Regression**: Screenshot comparison testing

### Test Automation

- Automated test runs on PR creation
- Performance benchmarking
- Automated accessibility auditing
- Cross-device testing expansion