# Puka Reading Tracker - Claude Code Onboarding

## Project Overview

**Puka Reading Tracker v1.0** is a clean, minimal reading tracker designed to replace bloated existing apps for heavy readers who want simple progress tracking and motivation without social features.

**Vision**: Personal-focused reading tracker that prioritizes functionality over features, with sub-30 second task completion and 100% offline capability.

**Current Status**: Starting fresh development with existing prototype and comprehensive planning documents completed.

---

## Getting Started Checklist

**Essential Reading (5-10 minutes)**:

- [ ] Review `planning/prd.md` - Complete product requirements and success criteria
- [ ] Review `planning/detailed-task-breakdown.md` - 47 development tasks organized by priority
- [ ] Examine `reading_tracker_react.tsx` - Working prototype with core components
- [ ] View `main-page-mockup.png` - Visual design reference

**Current Development Phase**:

- [ ] **Epic 1: Project Foundation** (Week 1-2) - Priority tasks F001-F004
- [ ] Starting with Task F001: Initialize React + TypeScript Project

**Immediate Priorities**:

1. Project setup and tooling configuration
2. Extract components from existing prototype
3. Implement File System Access API storage service
4. Build foundation for core CRUD functionality

---

## Development Workflow Standards

### Critical Git Workflow Rules

- **NEVER commit directly to main** - All changes via feature branches
- **Branch naming**: `feature/task-[id]-[short-description]` (e.g., `feature/task-f001-setup-react-project`)
- **Commit format**: `Task [ID]: [Clear description]` (e.g., `Task F001: Initialize React project with TypeScript and Vite`)
- **Pull Request workflow**: Every change requires PR, even for solo development
- **Code review**: Self-review all PRs before merging

### Testing & Quality Standards

- **Test-Driven Development**: Write tests first, then implement to make them pass
- **Coverage target**: 90%+ test coverage for all features
- **Testing tools**: Vitest + React Testing Library, End-to-end tests with Playwright (use the playwright mcp to validate changes to the UI and functionality)
- **Manual testing**: Test like a real user, not just unit tests
- **Performance targets**: <2s page load, <100ms interactions, <500KB bundle

### Key Project Principles

- **Simplicity over complexity** - Start simple, avoid over-engineering
- **Mobile-first design** - Optimized for mobile usage patterns
- **User-controlled data** - File System Access API for persistent, portable storage
- **Offline-first** - Full functionality without internet connection
- **MVP focus** - Essential features only, no bloat

---

## Technology Stack & Architecture

**Frontend**: React 18+ with TypeScript, hooks for state management
**Styling**: Tailwind CSS with mobile-first responsive design
**Build System**: Vite for fast development and optimized production builds
**Storage**: Progressive storage service:

- MVP: File System Access API + JSON files
- Enhanced: SQLite WASM for large libraries
- Advanced: Optional Node.js server

**Component Architecture**:

- Extract from prototype: StreakCard, AddBookModal, BookCard, CurrentlyReading
- Convert inline styles to Tailwind CSS classes
- Reusable UI library with consistent design patterns
- Custom hooks for business logic and data management

**Color Scheme** (from mockup):

- Primary: #8b5cf6 (purple)
- Status colors: Green (#22c55e), Blue (#3b82f6), Purple (#8b5cf6)
- Background: #f8f9fa, Text: #1a1a1a

---

## File Structure & Organization

```
puka/
├── planning/               # Project documentation
│   ├── prd.md             # Product requirements
│   ├── detailed-task-breakdown.md  # Development tasks
│   └── onboarding-prompt.md        # This file
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base components (Button, Input, Card)
│   │   ├── books/        # Book-specific components
│   │   └── reading/      # Reading tracking components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Data persistence and business logic
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Helper functions
├── tests/                # Test files (mirror src structure)
└── docs/                 # Additional documentation
```

**Simplicity Guidelines**:

- Keep component hierarchy shallow (max 3 levels deep)
- Group by feature, not by file type
- Co-locate related files when logical
- Avoid over-abstraction in early development

---

## Development Process

### Starting a New Task

1. **Read task details** in `planning/detailed-task-breakdown.md`
2. **Create feature branch**: `git checkout -b feature/task-[id]-[description]`
3. **Write tests first** (TDD approach) or alongside implementation
4. **Implement feature** following acceptance criteria
5. **Test manually** like a real user would
6. **Create PR** with clear description and testing notes
7. **Self-review** before merging
8. **Update task status** in breakdown document

### Key Commands

```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Lint and format
npm run lint
npm run format
```

### Testing Approach

- **Unit tests**: All business logic and utility functions
- **Component tests**: User interactions and rendering
- **Integration tests**: Data persistence and API integration
- **Manual testing**: Complete user workflows on multiple devices
- **Performance testing**: Load time and interaction responsiveness

---

## Existing Assets to Leverage

### Working Prototype (`reading_tracker_react.tsx`)

**Components to extract**:

- `StreakCard` - Fire emoji with streak count and "Active" status
- `AddBookModal` - Form with title, author, notes fields (lines 427-550)
- `BookCard` - Book display with progress bar and status badge
- `CurrentlyReading` - Featured book with progress tracking
- Progress bar implementation with purple fill color

**Data structures already defined**:

- Book interface with id, title, author, progress, status, notes
- Status management: want-to-read, reading, finished
- Progress tracking: 0-100% percentage-based

### Visual Design Reference (`main-page-mockup.png`)

- Header with "My Reading" title and "+ Add book" button
- Streak card with fire emoji and encouraging subtitle
- Currently Reading section with book cover and progress bar
- Library tabs (Library/Statistics/Wishlist)
- Status filter pills with live counts (All 5, Reading 1, Completed 2, Want to Read 2)
- Book grid with placeholder covers and status badges
- Import button for CSV data

### Development Guidelines Reference

- Refer to project toolkit development guidelines for:
  - Avoiding over-engineering patterns
  - User-focused testing approaches
  - Simplicity-first development principles
  - Real-world validation techniques

---

## Current Development Context

**Target User**: Heavy reader who wants simple, fast book management without social features
**Success Criteria**: Replace existing reading app with sub-30 second task completion
**MVP Timeline**: 6-8 weeks with weekly milestones
**Deployment Target**: Static hosting with PWA capabilities

**Critical Requirements**:

- File System Access API for user-controlled data storage
- 100% offline functionality for core features
- Mobile-first responsive design
- CSV import/export for data portability
- Reading streak motivation system

**Performance Targets**:

- Page load: <2 seconds on mobile networks
- UI interactions: <100ms response time
- Bundle size: <500KB for optimal mobile loading
- Test coverage: 90%+ across all features

---

## Next Steps

1. **Start with Task F001**: Initialize React + TypeScript project with Vite
2. **Reference existing prototype**: Extract components and convert styling
3. **Follow task priority order**: Foundation → Storage → Book Management → Progress Tracking
4. **Maintain TDD approach**: Write tests first, implement to pass
5. **Regular validation**: Test against mockup design and user workflow requirements

**Remember**: This project prioritizes simplicity and user value over technical complexity. When in doubt, choose the simpler solution that meets user needs effectively.

---

_This onboarding prompt should be updated when project context changes significantly or when moving between major development phases._

