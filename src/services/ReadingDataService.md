# ReadingDataService

The `ReadingDataService` is a utility service that merges reading data from multiple sources in the Puka Reading Tracker application. It provides a unified interface for combining manual reading entries, book completion dates, and progress update timestamps.

## Features

- **Multi-source data merging**: Combines manual entries, book completion dates, and progress updates
- **Conflict resolution**: Intelligent merging with priority-based resolution
- **Date range filtering**: Efficient filtering of reading days within specific time periods
- **Performance optimization**: Handles large datasets efficiently
- **Data validation**: Comprehensive validation and error detection
- **Type-safe**: Full TypeScript support with detailed type definitions

## Data Sources

The service merges data from three primary sources:

### 1. Manual Entries (Highest Priority)
- "I read today" button clicks stored in `StreakHistory`
- Represents explicit user confirmation of reading activity
- Always takes precedence in conflict resolution

### 2. Book Completion Dates (Medium Priority)
- Reading periods derived from `dateStarted` and `dateFinished` on books
- Generates reading days for the entire duration between start and finish dates
- Includes book metadata like progress and total pages

### 3. Progress Updates (Lowest Priority)
- Recent modifications to book progress (within 7 days)
- Today's reading activity based on `dateModified`
- Includes progress percentage and current page information

## Usage Examples

### Basic Data Merging

```typescript
import { ReadingDataService } from '@/services/ReadingDataService';
import { Book, StreakHistory } from '@/types';

// Example streak history with manual entries
const streakHistory: StreakHistory = {
  readingDays: new Set(['2024-01-01', '2024-01-02']),
  bookPeriods: [],
  lastCalculated: new Date()
};

// Example books with completion dates
const books: Book[] = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    status: 'finished',
    progress: 100,
    dateStarted: new Date('2024-01-03'),
    dateFinished: new Date('2024-01-05'),
    dateAdded: new Date('2024-01-01'),
    totalPages: 180
  },
  {
    id: 2,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    status: 'currently_reading',
    progress: 50,
    dateAdded: new Date('2024-01-01'),
    dateModified: new Date(), // Recently updated
    totalPages: 281
  }
];

// Merge all reading data
const readingData = ReadingDataService.mergeReadingData(streakHistory, books);

console.log(`Total reading days: ${readingData.size}`);
```

### Date Range Filtering

```typescript
// Get reading days for January 2024
const januaryReading = ReadingDataService.getReadingDaysInRange(
  '2024-01-01',
  '2024-01-31',
  readingData
);

console.log(`Reading days in January: ${januaryReading.length}`);

// Print each reading day with details
januaryReading.forEach(day => {
  console.log(`${day.date}: ${day.sources.length} sources, ${day.bookIds.length} books`);
  if (day.notes) {
    console.log(`  Notes: ${day.notes}`);
  }
});
```

### Conflict Resolution

```typescript
import { ReadingDayEntry, ReadingDataSource } from '@/types';

// Example: Same day with multiple sources
const conflictingEntries: ReadingDayEntry[] = [
  {
    date: '2024-01-15',
    sources: [{
      type: 'manual',
      timestamp: new Date('2024-01-15T10:00:00Z')
    }],
    bookIds: [],
    notes: 'Manual reading entry'
  },
  {
    date: '2024-01-15',
    sources: [{
      type: 'book_completion',
      timestamp: new Date('2024-01-15T15:00:00Z'),
      bookId: 1,
      metadata: { progress: 100, pages: 200 }
    }],
    bookIds: [1],
    notes: 'Finished "The Great Gatsby"'
  }
];

// Resolve conflicts with priority-based merging
const resolved = ReadingDataService.resolveConflicts(conflictingEntries);

console.log('Resolved entry:', resolved);
// Output will prioritize manual entry but include both sources
```

### Reading Statistics

```typescript
// Get comprehensive statistics
const stats = ReadingDataService.getReadingStatistics(readingData);

console.log('Reading Statistics:');
console.log(`- Total reading days: ${stats.totalReadingDays}`);
console.log(`- Total books involved: ${stats.totalBooks}`);
console.log(`- Manual entries: ${stats.sourceBreakdown.manual}`);
console.log(`- Book completions: ${stats.sourceBreakdown.book_completion}`);
console.log(`- Progress updates: ${stats.sourceBreakdown.progress_update}`);
console.log(`- Date range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
```

### Data Validation

```typescript
// Validate merged reading data
const validation = ReadingDataService.validateReadingData(readingData);

if (!validation.isValid) {
  console.error('Data validation failed:');
  validation.errors.forEach(error => console.error(`- ${error}`));
}

if (validation.warnings.length > 0) {
  console.warn('Data validation warnings:');
  validation.warnings.forEach(warning => console.warn(`- ${warning}`));
}
```

## Integration with React Components

### Custom Hook Example

```typescript
// hooks/useReadingData.ts
import { useMemo } from 'react';
import { ReadingDataService } from '@/services/ReadingDataService';
import { useBooks } from './useBooks';
import { useStreakHistory } from './useStreakHistory';

export function useReadingData() {
  const books = useBooks();
  const streakHistory = useStreakHistory();

  const readingData = useMemo(() => {
    return ReadingDataService.mergeReadingData(streakHistory, books);
  }, [streakHistory, books]);

  const getReadingDaysInRange = (startDate: string, endDate: string) => {
    return ReadingDataService.getReadingDaysInRange(startDate, endDate, readingData);
  };

  const statistics = useMemo(() => {
    return ReadingDataService.getReadingStatistics(readingData);
  }, [readingData]);

  return {
    readingData,
    getReadingDaysInRange,
    statistics
  };
}
```

### Component Example

```typescript
// components/ReadingCalendar.tsx
import React from 'react';
import { useReadingData } from '@/hooks/useReadingData';

export function ReadingCalendar() {
  const { getReadingDaysInRange, statistics } = useReadingData();

  // Get current month's reading days
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const monthlyReading = getReadingDaysInRange(
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  );

  return (
    <div className="reading-calendar">
      <h2>Reading Calendar</h2>
      <div className="stats">
        <p>Total reading days: {statistics.totalReadingDays}</p>
        <p>Books involved: {statistics.totalBooks}</p>
      </div>
      <div className="monthly-reading">
        <h3>This Month ({monthlyReading.length} days)</h3>
        {monthlyReading.map(day => (
          <div key={day.date} className="reading-day">
            <span className="date">{day.date}</span>
            <span className="sources">{day.sources.length} sources</span>
            {day.notes && <span className="notes">{day.notes}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Performance Considerations

### Large Dataset Handling

The service is optimized for large datasets with several performance features:

1. **Efficient Map Operations**: Uses native Map for O(1) lookups
2. **Lazy Evaluation**: Only processes data when requested
3. **Deduplication**: Removes duplicate sources and book IDs
4. **Memory Optimization**: Processes data in streaming fashion where possible

```typescript
// Example: Handling large datasets
const largeStreakHistory: StreakHistory = {
  readingDays: new Set(Array.from({ length: 1000 }, (_, i) => {
    const date = new Date('2020-01-01');
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  })),
  bookPeriods: [],
  lastCalculated: new Date()
};

const manyBooks: Book[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  title: `Book ${i + 1}`,
  author: 'Author',
  status: 'finished' as const,
  progress: 100,
  dateAdded: new Date(),
  dateStarted: new Date('2020-01-01'),
  dateFinished: new Date('2020-01-03')
}));

// This will complete efficiently even with large datasets
const startTime = performance.now();
const merged = ReadingDataService.mergeReadingData(largeStreakHistory, manyBooks);
const endTime = performance.now();

console.log(`Processed ${merged.size} reading days in ${endTime - startTime}ms`);
```

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  // Invalid date range
  const result = ReadingDataService.getReadingDaysInRange(
    '2024-01-31',
    '2024-01-01', // End before start
    readingData
  );
} catch (error) {
  console.error('Date range error:', error.message);
  // Output: "Start date must be before or equal to end date."
}

try {
  // Invalid date format
  const result = ReadingDataService.getReadingDaysInRange(
    'invalid-date',
    '2024-01-31',
    readingData
  );
} catch (error) {
  console.error('Date format error:', error.message);
  // Output: "Invalid date format. Use YYYY-MM-DD format."
}
```

## Type Definitions

### ReadingDayEntry

```typescript
interface ReadingDayEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  sources: ReadingDataSource[];
  bookIds: number[];
  notes?: string;
}
```

### ReadingDataSource

```typescript
interface ReadingDataSource {
  type: 'manual' | 'book_completion' | 'progress_update';
  timestamp: Date;
  bookId?: number;
  metadata?: {
    progress?: number;
    pages?: number;
    [key: string]: any;
  };
}
```

### ReadingDayMap

```typescript
type ReadingDayMap = Map<string, ReadingDayEntry>;
```

## Best Practices

1. **Always validate input data** before processing
2. **Use the service methods in the correct order**: merge → filter → analyze
3. **Cache results** when working with large datasets
4. **Handle edge cases** like empty data sets and invalid dates
5. **Monitor performance** with large numbers of books or long reading histories
6. **Use TypeScript strictly** to catch potential issues at compile time

## Testing

The service includes comprehensive unit tests covering:

- ✅ Basic data merging from all sources
- ✅ Conflict resolution with different priorities
- ✅ Date range filtering and validation
- ✅ Performance with large datasets
- ✅ Edge cases and error conditions
- ✅ Data validation and statistics
- ✅ Integration scenarios

Run tests with:

```bash
npm test ReadingDataService.test.ts
```