# Scripts Directory

This directory contains development and testing scripts for the Puka Reading Tracker project.

## Contents

### `/performance/`
Performance testing scripts and data files for validating application responsiveness and scalability.

- `performance-test.js` - Comprehensive performance testing script
- `performance-test-script.js` - Additional performance validation script  
- `performance-test-books.csv` - Test data for performance scenarios

### Root Scripts

- `clear-storage.js` - Utility script for clearing application storage during development

## Usage

These scripts are development utilities and are not part of the main application build or testing pipeline. They were used for one-off testing and validation during development.

### Running Performance Tests

```bash
# Navigate to performance directory
cd scripts/performance

# Run performance tests (requires dev server running)
node performance-test.js
node performance-test-script.js
```

### Clear Storage

```bash
# From project root
node scripts/clear-storage.js
```

## Note

These scripts are preserved for historical reference and potential future use, but are not actively maintained as part of the regular development workflow.