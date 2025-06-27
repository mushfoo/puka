import React from 'react';
import { Book, StatusFilter } from '@/types';

interface FilterTabsProps {
  books: Book[];
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  className?: string;
}

interface TabConfig {
  key: StatusFilter;
  label: string;
  icon: string;
  count: number;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  books,
  activeFilter,
  onFilterChange,
  className = ''
}) => {
  const getBookCounts = () => {
    const counts = {
      all: books.length,
      want_to_read: books.filter(book => book.status === 'want_to_read').length,
      currently_reading: books.filter(book => book.status === 'currently_reading').length,
      finished: books.filter(book => book.status === 'finished').length
    };
    return counts;
  };

  const counts = getBookCounts();

  const tabs: TabConfig[] = [
    {
      key: 'all',
      label: 'All',
      icon: '📚',
      count: counts.all
    },
    {
      key: 'want_to_read',
      label: 'Want to Read',
      icon: '💭',
      count: counts.want_to_read
    },
    {
      key: 'currently_reading',
      label: 'Reading',
      icon: '📖',
      count: counts.currently_reading
    },
    {
      key: 'finished',
      label: 'Finished',
      icon: '✅',
      count: counts.finished
    }
  ];

  const handleTabClick = (filter: StatusFilter) => {
    onFilterChange(filter);
  };

  const getTabClasses = (tab: TabConfig) => {
    const isActive = activeFilter === tab.key;
    
    const baseClasses = 'flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px] min-w-[44px]';
    
    if (isActive) {
      return `${baseClasses} bg-primary text-white shadow-md transform scale-105`;
    } else {
      return `${baseClasses} bg-surface hover:bg-background text-text-primary border border-border hover:border-primary/30 hover:shadow-sm`;
    }
  };

  const renderTab = (tab: TabConfig) => (
    <button
      key={tab.key}
      onClick={() => handleTabClick(tab.key)}
      className={getTabClasses(tab)}
      role="tab"
      aria-selected={activeFilter === tab.key}
      aria-label={`Filter by ${tab.label} (${tab.count} books)`}
    >
      <span className="text-base" role="img" aria-hidden="true">
        {tab.icon}
      </span>
      <span className="text-sm sm:text-base whitespace-nowrap">
        {tab.label}
      </span>
      <span className={`text-xs px-2 py-1 rounded-full min-w-6 text-center ${
        activeFilter === tab.key 
          ? 'bg-white/20 text-white' 
          : 'bg-background text-text-secondary'
      }`}>
        {tab.count}
      </span>
    </button>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile: Horizontal scroll tabs */}
      <div className="block sm:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(renderTab)}
        </div>
      </div>

      {/* Desktop: Full width tabs */}
      <div className="hidden sm:flex gap-2 flex-wrap">
        {tabs.map(renderTab)}
      </div>

      {/* Active filter indicator for accessibility */}
      <div className="sr-only" aria-live="polite">
        Currently showing {activeFilter === 'all' ? 'all books' : `books with status: ${activeFilter.replace('_', ' ')}`}
      </div>
    </div>
  );
};

export default FilterTabs;