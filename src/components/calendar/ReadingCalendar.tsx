import React, { useState, useMemo } from 'react';
import CalendarDayCell from './CalendarDayCell';
import { EnhancedReadingDayEntry } from '@/types';

interface ReadingCalendarProps {
  currentDate?: Date;
  readingData?: Map<string, EnhancedReadingDayEntry>; // Map of date strings to reading data
  onDateSelect?: (date: string) => void;
  onDateKeyDown?: (event: React.KeyboardEvent, date: string) => void;
  className?: string;
  showHeader?: boolean; // Whether to show the month header
}

const ReadingCalendar: React.FC<ReadingCalendarProps> = ({
  currentDate = new Date(),
  readingData = new Map(),
  onDateSelect,
  onDateKeyDown,
  className = '',
  showHeader = true
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get today's date as string for comparison
  const todayString = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // Generate calendar grid data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month and last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the first Sunday before the first day of month (or first day if it's Sunday)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Get the last Saturday after the last day of month (or last day if it's Saturday)  
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    // Generate array of dates for the calendar grid
    const dates: string[] = [];
    const currentIterDate = new Date(startDate);
    
    while (currentIterDate <= endDate) {
      dates.push(currentIterDate.toISOString().split('T')[0]);
      currentIterDate.setDate(currentIterDate.getDate() + 1);
    }
    
    return {
      dates,
      currentMonth: month,
      currentYear: year
    };
  }, [currentDate]);

  // Handle date selection
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  // Handle keyboard navigation
  const handleDateKeyDown = (event: React.KeyboardEvent, date: string) => {
    // Pass through to parent handler if provided
    if (onDateKeyDown) {
      onDateKeyDown(event, date);
    }
    
    // Handle arrow key navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      
      const currentIndex = calendarData.dates.indexOf(date);
      let newIndex = currentIndex;
      
      switch (event.key) {
        case 'ArrowLeft':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          newIndex = Math.min(calendarData.dates.length - 1, currentIndex + 1);
          break;
        case 'ArrowUp':
          newIndex = Math.max(0, currentIndex - 7);
          break;
        case 'ArrowDown':
          newIndex = Math.min(calendarData.dates.length - 1, currentIndex + 7);
          break;
      }
      
      if (newIndex !== currentIndex) {
        const newDate = calendarData.dates[newIndex];
        setSelectedDate(newDate);
        
        // Focus the new cell
        const newCell = document.querySelector(`[data-date="${newDate}"]`) as HTMLElement;
        if (newCell) {
          newCell.focus();
        }
      }
    }
  };

  // Get month header
  const monthHeader = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }, [currentDate]);

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Calendar Header */}
      {showHeader && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-text-primary text-center">
            {monthHeader}
          </h2>
        </div>
      )}
      
      {/* Calendar Grid */}
      <div 
        className="grid grid-cols-7 gap-1 p-4 bg-surface rounded-xl border border-border"
        role="grid"
        aria-label={`Calendar for ${monthHeader}`}
      >
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-text-secondary py-2"
            role="columnheader"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarData.dates.map((date) => {
          const dateObj = new Date(date + 'T00:00:00');
          const isCurrentMonth = dateObj.getMonth() === calendarData.currentMonth;
          const isToday = date === todayString;
          const isSelected = date === selectedDate;
          const readingEntry = readingData.get(date);
          
          return (
            <CalendarDayCell
              key={date}
              date={date}
              readingData={readingEntry}
              isSelected={isSelected}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              onClick={handleDateClick}
              onKeyDown={handleDateKeyDown}
            />
          );
        })}
      </div>
      
      {/* Selected Date Info */}
      {selectedDate && (
        <div className="mt-4 p-3 bg-background rounded-lg border border-border">
          <p className="text-sm text-text-primary">
            Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {readingData.has(selectedDate) && (
            <p className="text-xs text-text-secondary mt-1">
              Reading activity recorded
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReadingCalendar;