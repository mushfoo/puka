// Performance Test Script for Puka Reading Tracker
// This script will add test books and measure performance

const testBooks = [
  { title: "1984", author: "George Orwell", pages: 328, status: "reading" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", pages: 281, status: "finished" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", pages: 234, status: "want_to_read" },
  { title: "Lord of the Flies", author: "William Golding", pages: 182, status: "reading" },
  { title: "The Hobbit", author: "J.R.R. Tolkien", pages: 310, status: "finished" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", pages: 158, status: "reading" },
  { title: "Jane Eyre", author: "Charlotte Brontë", pages: 500, status: "want_to_read" },
  { title: "Wuthering Heights", author: "Emily Brontë", pages: 416, status: "reading" },
  { title: "The Picture of Dorian Gray", author: "Oscar Wilde", pages: 254, status: "finished" },
  { title: "Brave New World", author: "Aldous Huxley", pages: 268, status: "reading" },
  { title: "Animal Farm", author: "George Orwell", pages: 112, status: "finished" },
  { title: "The Lord of the Rings", author: "J.R.R. Tolkien", pages: 1216, status: "reading" },
  { title: "Dune", author: "Frank Herbert", pages: 688, status: "want_to_read" },
  { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", pages: 224, status: "finished" },
  { title: "Neuromancer", author: "William Gibson", pages: 271, status: "reading" },
  { title: "Foundation", author: "Isaac Asimov", pages: 244, status: "want_to_read" },
  { title: "Ender's Game", author: "Orson Scott Card", pages: 324, status: "finished" },
  { title: "The Martian", author: "Andy Weir", pages: 369, status: "reading" },
  { title: "Ready Player One", author: "Ernest Cline", pages: 374, status: "want_to_read" },
  { title: "The Handmaid's Tale", author: "Margaret Atwood", pages: 311, status: "finished" }
];

// Performance measurement utilities
const performanceTests = {
  // Test button click responsiveness
  testButtonResponsiveness: async (buttonSelector, expectedMaxTime = 100) => {
    const button = document.querySelector(buttonSelector);
    if (!button) return null;
    
    const startTime = performance.now();
    button.click();
    // Wait for DOM update
    await new Promise(resolve => requestAnimationFrame(resolve));
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      passed: (endTime - startTime) < expectedMaxTime,
      element: buttonSelector
    };
  },

  // Test filter switching performance
  testFilterSwitching: async () => {
    const filters = document.querySelectorAll('[role="tab"]');
    const results = [];
    
    for(let filter of filters) {
      const startTime = performance.now();
      filter.click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const endTime = performance.now();
      
      results.push({
        filterName: filter.textContent,
        duration: endTime - startTime,
        passed: (endTime - startTime) < 100
      });
    }
    
    return results;
  },

  // Test search performance
  testSearchPerformance: async (searchQueries) => {
    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (!searchInput) return null;
    
    const results = [];
    
    for(let query of searchQueries) {
      const startTime = performance.now();
      searchInput.value = query;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => requestAnimationFrame(resolve));
      const endTime = performance.now();
      
      results.push({
        query: query,
        duration: endTime - startTime,
        passed: (endTime - startTime) < 100
      });
    }
    
    return results;
  }
};

console.log('Performance test script loaded. Ready to test Puka Reading Tracker.');