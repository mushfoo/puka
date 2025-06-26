# Performance Testing Quick Start Guide

## Running Performance Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Start Development Server
```bash
# Start the development server
npm run dev
# Application should be running at http://localhost:5174
```

### Execute Performance Tests
```bash
# Run comprehensive performance validation
npm run test:performance

# Run all Playwright tests
npm run test:perf

# Run with full reporting
npm run test:perf:full
```

## Test Coverage

### 1. Initial Load Performance ✅
- Page load time
- First Contentful Paint
- Memory usage analysis

### 2. Interaction Response Times ⚠️
- Filter tab switching
- Progress slider adjustments
- Search input responsiveness
- Button click performance

### 3. Stress Testing
- Rapid filter switching
- Memory stability analysis
- Extended session simulation

## Performance Requirements

| Metric | Requirement | Current Status |
|--------|-------------|----------------|
| Load Time | <3000ms | ✅ 580ms |
| First Contentful Paint | <1500ms | ✅ 252ms |
| Interaction Response | <100ms (90% pass rate) | ❌ 40% pass rate |
| Memory Stability | <15MB change | ✅ 9.54MB |

## Quick Fixes for Common Issues

### Search Performance (CRITICAL)
```typescript
// Add debouncing to search input
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 150);
```

### Component Re-renders
```typescript
// Memoize components
const BookCard = React.memo(({ book, onUpdate }) => {
  // Component implementation
});
```

### Event Handler Optimization
```typescript
// Use useCallback for event handlers
const handleUpdate = useCallback((id, data) => {
  // Update logic
}, []);
```

## Test Results Interpretation

### Performance Grades
- **A+**: >95% pass rate, <50ms avg response, <1000ms load
- **A**: >90% pass rate, <75ms avg response, <1500ms load  
- **B**: >85% pass rate, <100ms avg response, <2000ms load
- **C**: >80% pass rate, <3000ms load
- **D**: >70% pass rate
- **F**: Below 70% pass rate

### Current Status: Grade C
- **Priority**: Optimize search input performance
- **Target**: Achieve Grade A with 90%+ pass rate

## Continuous Monitoring

### During Development
```bash
# Run performance tests before commits
npm run test:performance
```

### In CI/CD
```yaml
- name: Performance Validation
  run: npm run test:performance
```

### Production Monitoring
```typescript
// Add Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP } from 'web-vitals';

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
```

## Troubleshooting

### Common Issues
1. **Server not running**: Ensure `npm run dev` is active
2. **Port mismatch**: Check if app is on 5174 vs 5173
3. **Browser timeout**: Increase timeout in playwright.config.ts
4. **Memory variations**: Run tests multiple times for baseline

### Test Debugging
```bash
# Run tests with browser visible
npx playwright test tests/performance/puka-performance-final.test.ts --headed

# Generate trace for debugging
npx playwright test --trace on
```

## Performance Optimization Workflow

1. **Baseline**: Run tests to establish current performance
2. **Identify**: Focus on interactions exceeding 100ms
3. **Optimize**: Implement specific fixes (debouncing, memoization)
4. **Validate**: Re-run tests to measure improvement
5. **Monitor**: Set up continuous performance tracking

## Quick Commands Reference

```bash
# Essential commands
npm run dev                    # Start development server
npm run test:performance      # Run performance validation
npx playwright show-report    # View detailed test report

# Debugging commands
npx playwright test --headed  # Visual test execution
npx playwright test --debug   # Debug mode
npx playwright codegen        # Generate test selectors
```

## Next Steps

1. **Immediate**: Fix search input performance (highest impact)
2. **Short-term**: Optimize button response times
3. **Long-term**: Implement comprehensive performance monitoring

---

**Performance Target**: 90%+ interactions under 100ms
**Current Status**: 40% pass rate - requires optimization
**Primary Focus**: Search input responsiveness