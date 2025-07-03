import React, { useState, useMemo, useEffect } from "react";
import { EnhancedReadingDayEntry, Book } from "@/types";

interface DayDetailPanelProps {
  selectedDate?: string;
  readingData?: EnhancedReadingDayEntry;
  books: Book[];
  onToggleReading: (date: string, isReading: boolean) => void;
  onUpdateNotes: (date: string, notes: string) => void;
  onUpdateBooks?: (date: string, bookIds: number[]) => void;
  loading?: boolean;
  className?: string;
}

interface BookAssociationProps {
  book: Book;
  associationType: "started" | "finished" | "progress";
}

const BookAssociation: React.FC<BookAssociationProps> = ({
  book,
  associationType,
}) => {
  const getTypeInfo = () => {
    switch (associationType) {
      case "started":
        return {
          icon: "📖",
          label: "Started",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        };
      case "finished":
        return {
          icon: "✅",
          label: "Finished",
          color: "text-success",
          bgColor: "bg-success-light/20",
        };
      case "progress":
        return {
          icon: "📈",
          label: "Progress",
          color: "text-warning",
          bgColor: "bg-warning-light/20",
        };
      default:
        return {
          icon: "📚",
          label: "Reading",
          color: "text-text-secondary",
          bgColor: "bg-surface",
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border border-border ${typeInfo.bgColor}`}
    >
      <div className="text-xl" role="img" aria-label={typeInfo.label}>
        {typeInfo.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className="font-medium text-text-primary truncate"
          title={book.title}
        >
          {book.title}
        </h4>
        <p className="text-sm text-text-secondary truncate" title={book.author}>
          {book.author}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-medium ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          {book.progress > 0 && book.progress < 100 && (
            <span className="text-xs text-text-secondary">
              {book.progress}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
  selectedDate,
  readingData,
  books,
  onToggleReading,
  onUpdateNotes,
  onUpdateBooks,
  loading = false,
  className = "",
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(readingData?.notes || "");
  const [isEditingBooks, setIsEditingBooks] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>(
    readingData?.bookIds || [],
  );

  // Update selected book IDs when reading data changes
  useEffect(() => {
    setSelectedBookIds(readingData?.bookIds || []);
  }, [readingData?.bookIds]);

  // Update notes value when reading data changes
  useEffect(() => {
    setNotesValue(readingData?.notes || "");
  }, [readingData?.notes]);

  // Parse the selected date for display
  const formattedDate = useMemo(() => {
    if (!selectedDate) return "";

    const dateObj = new Date(selectedDate + "T00:00:00");
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  // Check if the selected date is today
  const isToday = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return selectedDate === today;
  }, [selectedDate]);

  // Check if it's a future date
  const isFuture = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return selectedDate > today;
  }, [selectedDate]);

  // Determine if this is a reading day
  const isReadingDay = useMemo(() => {
    return Boolean(readingData?.source);
  }, [readingData, selectedDate]);

  // Get associated books based on date
  const associatedBooks = useMemo(() => {
    if (!selectedDate || !readingData?.bookIds?.length) return [];

    return readingData.bookIds
      .map((bookId) => {
        const book = books.find((b) => b.id === bookId);
        if (!book) return null;

        // Determine association type based on dates
        const dateObj = new Date(selectedDate + "T00:00:00");
        const bookStartDate = book.dateStarted
          ? new Date(book.dateStarted)
          : null;
        const bookFinishDate = book.dateFinished
          ? new Date(book.dateFinished)
          : null;

        let associationType: "started" | "finished" | "progress" = "progress";

        if (
          bookStartDate &&
          dateObj.toDateString() === bookStartDate.toDateString()
        ) {
          associationType = "started";
        } else if (
          bookFinishDate &&
          dateObj.toDateString() === bookFinishDate.toDateString()
        ) {
          associationType = "finished";
        }

        return {
          book,
          associationType,
        };
      })
      .filter(Boolean) as Array<{
      book: Book;
      associationType: "started" | "finished" | "progress";
    }>;
  }, [selectedDate, readingData, books]);

  // Handle reading day toggle
  const handleToggleReading = () => {
    if (!selectedDate || isFuture) {
      return;
    }
    if (!onToggleReading) {
      return;
    }
    onToggleReading(selectedDate, !isReadingDay);
  };

  // Handle notes save
  const handleSaveNotes = () => {
    if (!selectedDate) return;
    onUpdateNotes(selectedDate, notesValue.trim());
    setIsEditingNotes(false);
  };

  // Handle notes cancel
  const handleCancelNotes = () => {
    setNotesValue(readingData?.notes || "");
    setIsEditingNotes(false);
  };

  // Handle book selection toggle
  const handleToggleBook = (bookId: number) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  // Handle book selection save
  const handleSaveBooks = () => {
    if (!selectedDate || !onUpdateBooks) return;
    onUpdateBooks(selectedDate, selectedBookIds);
    setIsEditingBooks(false);
  };

  // Handle book selection cancel
  const handleCancelBooks = () => {
    setSelectedBookIds(readingData?.bookIds || []);
    setIsEditingBooks(false);
  };

  // If no date is selected
  if (!selectedDate) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4" role="img" aria-label="Calendar">
            📅
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Select a Date
          </h3>
          <p className="text-text-secondary">
            Choose a day from the calendar to view or edit reading activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Date Header */}
      <div className="text-center border-b border-border pb-4">
        <h3 className="text-xl font-semibold text-text-primary">
          {formattedDate}
        </h3>
        {isToday && (
          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            Today
          </span>
        )}
        {isFuture && (
          <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-text-secondary/10 text-text-secondary rounded-full">
            Future Date
          </span>
        )}
      </div>

      {/* Reading Day Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-text-primary">Reading Activity</h4>
          {!isFuture && (
            <button
              onClick={handleToggleReading}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : isReadingDay
                    ? "bg-success text-white hover:bg-success-dark"
                    : "bg-surface border border-border text-text-primary hover:bg-background"
              }`}
              type="button"
            >
              {loading
                ? "Loading..."
                : isReadingDay
                  ? "✓ Reading Day"
                  : "+ Mark as Reading Day"}
            </button>
          )}
        </div>

        {isReadingDay && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span
                className="text-success text-xl"
                role="img"
                aria-label="Success"
              >
                ✓
              </span>
              <span className="text-success font-medium">
                This is marked as a reading day
              </span>
            </div>

            {/* Reading Source */}
            {readingData?.source && (
              <div className="mt-3">
                <p className="text-sm text-text-primary mb-2">
                  Reading activity from:
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block px-2 py-1 text-xs bg-surface border border-border rounded text-primary">
                    {readingData.source === "manual" && "👤 Manual entry"}
                    {readingData.source === "book" && "📚 Book activity"}
                    {readingData.source === "progress" && "📈 Progress update"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!isReadingDay && !isFuture && (
          <div className="bg-surface border border-border rounded-lg p-3">
            <p className="text-text-secondary text-sm">
              No reading activity recorded for this day.
            </p>
          </div>
        )}

        {isFuture && (
          <div className="bg-text-secondary/5 border border-text-secondary/20 rounded-lg p-3">
            <p className="text-text-secondary text-sm">
              Cannot mark future dates as reading days.
            </p>
          </div>
        )}
      </div>

      {/* Associated Books */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-text-primary">Associated Books</h4>
          {onUpdateBooks && !isFuture && (
            <button
              onClick={() => setIsEditingBooks(true)}
              className="text-sm text-primary hover:text-primary-dark"
              type="button"
            >
              {associatedBooks.length > 0 ? "Edit Books" : "Add Books"}
            </button>
          )}
        </div>

        {isEditingBooks ? (
          <div className="space-y-3">
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-sm text-text-secondary mb-3">
                Select books to associate with this reading day:
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {books.map((book) => (
                  <label
                    key={book.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-background cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBookIds.includes(book.id)}
                      onChange={() => handleToggleBook(book.id)}
                      className="rounded border-border focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-text-primary truncate"
                        title={book.title}
                      >
                        {book.title}
                      </p>
                      <p
                        className="text-sm text-text-secondary truncate"
                        title={book.author}
                      >
                        {book.author}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-secondary capitalize">
                          {book.status.replace("_", " ")}
                        </span>
                        {book.progress > 0 && (
                          <span className="text-xs text-text-secondary">
                            {book.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelBooks}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-surface text-text-secondary hover:text-text-primary"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBooks}
                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {associatedBooks.length > 0 ? (
              <div className="space-y-2">
                {associatedBooks.map(({ book, associationType }, index) => (
                  <BookAssociation
                    key={`${book.id}-${index}`}
                    book={book}
                    associationType={associationType}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-lg p-3">
                <p className="text-text-secondary text-sm">
                  No books associated with this reading day.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-text-primary">Notes</h4>
          {!isEditingNotes && !isFuture && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-sm text-primary hover:text-primary-dark"
              type="button"
            >
              {readingData?.notes ? "Edit" : "Add Note"}
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="space-y-3">
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes about your reading activity..."
              className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                {notesValue.length}/500 characters
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelNotes}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-surface text-text-secondary hover:text-text-primary"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg p-3">
            {readingData?.notes ? (
              <p className="text-text-primary text-sm whitespace-pre-wrap">
                {readingData.notes}
              </p>
            ) : (
              <p className="text-text-secondary text-sm italic">
                No notes for this day.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayDetailPanel;

