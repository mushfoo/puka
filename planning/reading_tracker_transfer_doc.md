# Reading Tracker - Project Transfer Documentation

## 📝 Project Overview

A personal reading tracking application to replace subscription-based third-party apps. The goal is to build a clean, modern reading tracker with percentage-based progress tracking, reading streaks, and eventual iOS app development.

## 🎯 Core Requirements Identified

### Primary Features
- **Book Management**: Add, edit, delete books with title, author, notes
- **Progress Tracking**: Percentage-based (0-100%) instead of page numbers
- **Reading Status**: Want to Read, Currently Reading, Finished
- **Reading Streaks**: Daily and monthly streak tracking
- **Reading Sessions**: Log daily reading with progress updates
- **CSV Import/Export**: Bulk import books and export data
- **Reading History**: Track progress changes over time

### Design Requirements
- **Modern, clean UI** with light theme and purple accents (#8b5cf6)
- **Mobile-first responsive design**
- **Card-based layout** with proper spacing and visual hierarchy
- **Status badges** with color coding (purple=reading, green=finished, blue=want-to-read)
- **Progress bars** with visual percentage indicators
- **Streak display** with fire emoji and "Active" status

### Reference Design
Based on modern book tracking apps with:
- Header with "My Reading" title and "+ Add book" button
- Streak card with fire icon and encouraging subtitle
- Currently Reading section with book cover placeholder and progress bar
- Library navigation tabs (Library/Statistics/Wishlist)
- Status filter pills with live counts
- Book grid with cover placeholders and status badges

## 🏗️ Technical Architecture Decisions

### Frontend Stack
- **React** - Component-based architecture, hooks for state management
- **Path to Mobile**: React Native for iOS app development
- **Styling**: CSS-in-JS or Tailwind CSS
- **State Management**: useState/useReducer, potential for Context API or Redux

### Component Structure (Current)
```
App
├── Header (My Reading + Add Book button)
├── StreakCard
├── CurrentlyReading
├── LibraryTabs
├── StatusFilters  
├── BookGrid
│   └── BookCard (reusable)
└── Modals
    ├── AddBookModal
    ├── ReadingLogModal
    └── ImportCSVModal
```

### Data Structure
```javascript
Book {
  id: number,
  title: string,
  author: string,
  progress: number (0-100),
  status: 'want-to-read' | 'reading' | 'finished',
  startDate: string,
  finishDate: string,
  notes: string
}

ReadingLogEntry {
  date: string,
  books: [{
    id: number,
    title: string,
    progressBefore: number,
    progressAfter: number
  }]
}
```

## 🎯 MVP vs Future Features

### Phase 1 (MVP)
- ✅ Book CRUD operations
- ✅ Progress tracking (percentage-based)
- ✅ Reading status management
- ✅ Basic streak calculation
- ✅ CSV import/export
- ✅ Responsive web interface
- 🔲 Local storage persistence
- 🔲 Reading session logging

### Phase 2 (Enhanced Features)
- 🔲 User accounts and authentication
- 🔲 Cloud data sync
- 🔲 Reading goals and challenges
- 🔲 Statistics and analytics dashboard
- 🔲 Book cover integration (Google Books API)
- 🔲 Reading recommendations

### Phase 3 (Advanced Features)
- 🔲 iOS app (React Native)
- 🔲 Plex integration for audiobooks
- 🔲 Social features (sharing, friends)
- 🔲 Advanced analytics and insights
- 🔲 Reading habits tracking

## 💻 Current React Implementation

### Key Components Built
- **ReadingTracker** - Main app with state management
- **StreakCard** - Fire emoji with streak count and status
- **CurrentlyReading** - Featured current book with progress bar
- **BookCard** - Reusable card component for book grid
- **AddBookModal** - Form modal for adding new books

### Features Implemented
- ✅ Book listing and filtering by status
- ✅ Add new books with full metadata
- ✅ Progress updates with visual indicators
- ✅ Status filter pills with live counts
- ✅ Responsive card-based layout
- ✅ Modal interactions

## 🚀 Claude Code Development Workflow

### 1. PRD Creation
- [ ] Complete Product Requirements Document
- [ ] User stories with acceptance criteria
- [ ] Technical specifications
- [ ] Success metrics and KPIs

### 2. Technical Architecture
- [ ] Database schema design
- [ ] API endpoint specification
- [ ] Frontend architecture decisions
- [ ] Deployment and hosting strategy

### 3. Development Environment
- [ ] React project setup with TypeScript
- [ ] Development tooling (ESLint, Prettier, testing)
- [ ] Git repository initialization
- [ ] CI/CD pipeline configuration

### 4. Task Breakdown
- [ ] GitHub issues creation
- [ ] Sprint planning and milestones
- [ ] Feature prioritization
- [ ] Risk assessment and mitigation

### 5. Implementation Plan
- [ ] Component library development
- [ ] State management implementation
- [ ] Data persistence layer
- [ ] Testing strategy and coverage

## 🎨 Design System

### Color Palette
- **Primary**: #8b5cf6 (Purple)
- **Success**: #22c55e (Green)
- **Info**: #3b82f6 (Blue)
- **Background**: #f8f9fa (Light gray)
- **Text**: #1a1a1a (Dark gray)
- **Border**: #e5e7eb (Light border)

### Typography
- **Font Family**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Headings**: 700 weight, varied sizes
- **Body**: 400-500 weight, 14-16px
- **Labels**: 600 weight, 14px

### Spacing
- **Container**: max-width 1000px
- **Padding**: 16-32px consistent spacing
- **Gaps**: 8-24px for grid and flex layouts
- **Border Radius**: 6-16px for modern feel

## 📊 Success Metrics

### User Experience
- Time to add a book < 30 seconds
- Page load time < 2 seconds
- Mobile responsiveness score > 95%
- User satisfaction with streak motivation

### Technical
- Test coverage > 90%
- Zero critical accessibility violations
- Performance score > 90%
- Zero production bugs for core features

## 🔄 Migration Notes

### From Current Implementation
- React components can be used as foundation
- Styling system needs CSS-in-JS or Tailwind migration
- Add TypeScript for better development experience
- Implement proper testing framework

### To Production
- Add proper error handling and loading states
- Implement data validation and sanitization
- Add user feedback and confirmation messages
- Optimize for production builds and deployment

## 📱 iOS App Considerations

### React Native Migration Path
- Shared business logic between web and mobile
- Platform-specific UI components
- Native navigation patterns
- iOS-specific features (widgets, shortcuts)

### Future Plex Integration
- API authentication and connection
- Audiobook progress synchronization
- Cross-platform reading status updates
- Real-time progress tracking

---

## 🎯 Next Steps for Claude Code

1. **Create comprehensive PRD** based on this foundation
2. **Set up development environment** with proper tooling
3. **Design database schema** for production scalability
4. **Break down into development tasks** with clear milestones
5. **Implement MVP features** with thorough testing
6. **Plan iOS migration strategy** for future development

This foundation provides a solid starting point for structured development with clear goals, technical decisions, and implementation roadmap.