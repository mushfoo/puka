# Puka Reading Tracker - Claude Code Project Context

## Project Context

### Overview
**Project Name**: Puka Reading Tracker  
**Repository**: https://github.com/mushfoo/puka  
**Vision**: A clean, minimal reading tracker that focuses on essential functionality without bloat, designed to replace existing apps for heavy readers who want simple progress tracking and motivation.  
**Current Phase**: Epic 1 Foundation completed (June 25, 2025)

### Technology Stack
- **Frontend**: React 18+ with TypeScript and hooks for state management
- **Styling**: Tailwind CSS for mobile-first responsive design  
- **Storage**: File System Access API + JSON files for MVP
- **Build**: Vite for fast development and optimized production builds
- **Testing**: Vitest + React Testing Library (90%+ coverage requirement)
- **Deployment**: Static hosting (Netlify/Vercel)

### Target Users & Core Functionality
- **Primary Users**: Heavy readers (multiple books per month) who want personal tracking only
- **Core Features**: 
  - Book management (add/edit with title, author, notes)
  - Progress tracking (0-100% with visual indicators)
  - Reading status (Want to Read, Currently Reading, Finished)
  - Reading streaks with daily tracking
  - CSV import/export for data portability
  - Full offline functionality

### Current Development Status
- **Completed**: Epic 1 Foundation (Tasks F001-F004)
  - Enhanced type system with comprehensive interfaces
  - File System Storage Service with error handling
  - Storage interface abstraction
  - Validation system
- **Next Phase**: Epic 2 Core Dashboard Implementation (Weeks 3-5)
- **UI Decision**: Option 2 (Contextual Dashboard) selected for implementation

## Development Workflow

### Critical Git Workflow Rules
- **Feature branches**: Create feature branches from main (e.g., `feature/task-c001-enhanced-bookcard`)
- **Never commit to main directly**: All changes via pull requests
- **Branch naming**: `feature/task-[ID]-[description]` format
- **Commit conventions**: Clear, descriptive messages focusing on "why"
- **PR process**: Include task ID and acceptance criteria validation

### Testing and Quality Standards
- **Test coverage**: Maintain >90% coverage across all features
- **Manual testing**: Test all mobile viewports (375px primary)
- **TypeScript**: Strict mode compliance with no type errors
- **Performance**: <2s page load, <100ms UI interactions, <500KB bundle

### Key Project Principles
- **MVP focus**: Only essential functionality, no feature bloat
- **User-centered testing**: Validate against actual usage patterns
- **Simplicity**: Clean, minimal interface without unnecessary complexity
- **Mobile-first**: All designs start at 375px viewport
- **Offline-first**: Full functionality without internet connection

## Getting Started Instructions

### Step 1: Review Key Documents
1. **Read the PRD**: `/planning/PRD.md` - Complete product requirements
2. **Review UI Decision**: `/planning/ui-prototypes/RECOMMENDATION.md` - Option 2 selected
3. **Check Task Breakdown**: `/planning/tasks.md` - 47 tasks across 4 epics
4. **Understand Current State**: Epic 1 Foundation completed (F001-F004)

### Step 2: Identify Next Tasks
Current focus is **Epic 2: Core Dashboard Implementation**:
- **C001**: Enhanced BookCard Component (4 days) - PRIORITY
- **C002**: BookGrid with Responsive Layout (3 days)
- **C003**: FilterTabs Component (2 days)
- **C004**: ProgressSlider Component (2 days)
- **C005**: FloatingActionButton (2 days)

### Step 3: Development Process
1. Create feature branch: `git checkout -b feature/task-[ID]-[description]`
2. Review acceptance criteria in task breakdown
3. Implement with mobile-first approach (375px viewport)
4. Write tests maintaining >90% coverage
5. **Validate UI/UX with Playwright testing (Step 5 below)**
6. Create PR with task validation

### Step 4: Integration Notes
- **Storage**: Use existing `FileSystemStorageService` via storage interface
- **Types**: All interfaces in `/src/types/index.ts`
- **Components**: Build on existing foundation in `/src/components/`
- **Testing**: Use established patterns in `/src/__tests__/`

### Step 5: UI/UX Validation with Playwright
**Critical validation step using Task agents for systematic testing before PR creation.**

#### 5.1 Setup and Environment
1. **Start Development Server**: `npm run dev` (localhost:5173)
2. **Verify Test Environment**: Ensure all implemented features are accessible

#### 5.2 Core User Experience Validation
Delegate comprehensive testing to Task agents for systematic coverage:

```bash
# Primary user flow testing
claude "Create a Task agent to comprehensively test Puka Reading Tracker at localhost:5173:

CORE WORKFLOWS TO TEST:
1. New user onboarding experience (empty state → first book)
2. Add book → set progress → update status workflow
3. Filter switching across all status types (Want to Read, Currently Reading, Finished)
4. Progress updates using inline sliders and quick action buttons
5. Search/filter combinations with live results

VALIDATION REQUIREMENTS:
- Take screenshots at each major step
- Test with realistic data (6+ books across different statuses)
- Verify all interactive elements respond within 100ms
- Document any broken workflows or UX friction points
- Report completion rates for each workflow"
```

#### 5.3 Mobile-First Testing (375px Viewport)
**Primary testing target - mobile experience is critical:**

```bash
# Mobile-first validation agent
claude "Create a Task agent for mobile UX testing on Puka Reading Tracker:

MOBILE TESTING PROTOCOL:
1. Set viewport to 375px width (iPhone SE standard)
2. Test one-handed operation patterns:
   - Thumb reach zones for all interactive elements
   - Filter tabs accessibility with single thumb
   - Progress sliders touch targets (minimum 44x44px)
   - Floating action button positioning and accessibility

MOBILE-SPECIFIC VALIDATIONS:
- Touch interactions feel responsive and natural
- No accidental taps due to element proximity
- Content remains readable without horizontal scrolling
- Filter tabs work effectively in mobile layout
- Progress indicators visible and functional
- All animations smooth at 60fps on mobile

DELIVERABLES:
- Mobile screenshot documentation
- Touch interaction performance report
- Recommendations for mobile UX improvements"
```

#### 5.4 Performance and Responsiveness Validation
**Validate against strict performance requirements:**

```bash
# Performance testing agent
claude "Create a Task agent for performance validation on Puka Reading Tracker:

PERFORMANCE TESTING SCOPE:
1. Interaction Response Times:
   - Button clicks, slider adjustments, filter switches
   - All interactions must complete within 100ms
   - Search/filter operations with immediate visual feedback

2. Load Testing Scenarios:
   - Test with 20+ books across all statuses
   - Rapid filter switching stress test
   - Multiple progress updates in sequence
   - Search with various query lengths

3. Performance Metrics to Measure:
   - Time to first meaningful paint
   - Interaction response times
   - Animation frame rates during transitions
   - Memory usage during extended use

REPORTING REQUIREMENTS:
- Performance metrics documentation
- Specific slow interactions identified
- Recommendations for optimization
- Validation against <100ms interaction requirement"
```

#### 5.5 Quality Gates and Acceptance Criteria
**All criteria must pass before PR creation:**

✅ **Mobile Validation Gates:**
- All workflows function correctly at 375px viewport
- Touch targets meet 44x44px minimum size requirement  
- One-handed operation confirmed for primary actions
- No horizontal scrolling or layout breaks

✅ **Performance Gates:**
- All UI interactions respond within 100ms
- Smooth animations at 60fps on standard devices
- No performance degradation with 20+ books
- Search/filter operations provide immediate feedback

✅ **User Experience Gates:**
- Core workflows complete without friction
- Visual feedback confirms all user actions
- Error states handled gracefully
- Loading states appropriate for user context

✅ **Cross-Browser Compatibility:**
- Chrome/Edge (File System Access API primary)
- Safari/Firefox (fallback functionality confirmed)
- Mobile browsers tested on actual devices

#### 5.6 Documentation and Next Steps
After Task agent validation:
1. **Review all agent reports** for critical issues
2. **Address blocking issues** before PR creation
3. **Document known limitations** in PR description
4. **Include mobile screenshots** in PR for reviewer context
5. **Confirm all quality gates passed** in PR checklist

## Project-Specific Context

### File Structure
```
puka/
├── src/
│   ├── components/     # React components
│   ├── types/         # TypeScript interfaces
│   ├── services/      # Storage and business logic
│   ├── hooks/         # Custom React hooks
│   └── __tests__/     # Test files
├── planning/          # PRD, UI prototypes, task breakdown
├── public/           # Static assets
└── [config files]    # Vite, TypeScript, testing configs
```

### Common Commands
```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run test         # Run tests with coverage
npm run test:watch   # Watch mode for TDD
npm run type-check   # TypeScript validation
npm run lint         # ESLint checks

# Git workflow
git checkout -b feature/task-[ID]-[description]
git add .
git commit -m "Task [ID]: [Clear description of changes]"
git push -u origin feature/task-[ID]-[description]
```

### Environment Setup
- Node.js 18+ required
- File System Access API support (Chrome/Edge required for full functionality)
- Mobile device/emulator for testing (375px primary viewport)

### Important Considerations
- **File System Access API**: Not supported in all browsers - implement fallbacks
- **Large Libraries**: Performance test with 500+ books
- **Mobile Performance**: Regular testing on actual devices
- **Touch Targets**: Minimum 44x44px for all interactive elements

## Quick Reference

### Current Sprint (Epic 2 - Weeks 3-5)
- **Goal**: Implement Option 2 (Contextual Dashboard) with enhanced BookCard, FilterTabs, and core interactions
- **Priority Tasks**: C001 (BookCard), C002 (BookGrid), C003 (FilterTabs)
- **Key Metrics**: 18-second task completion, <100ms interactions

### Design Specifications (Option 2)
- **BookCard**: Inline progress slider, quick action buttons (+10%, +25%, Mark Done)
- **BookGrid**: Responsive CSS Grid, virtual scrolling for 500+ books
- **FilterTabs**: Status filtering with live counts
- **FAB**: Floating action button for quick book addition
- **Mobile**: Touch-optimized, one-handed operation capable

### Performance Requirements
- Page load: <2 seconds
- UI interactions: <100ms response
- Bundle size: <500KB
- Test coverage: >90%
- Mobile Lighthouse: 90+ score

### Key Files/Directories
- `/src/types/index.ts` - All TypeScript interfaces
- `/src/services/storage/` - Storage implementation
- `/src/components/` - React components
- `/planning/ui-prototypes/option-2-dashboard.html` - Selected UI design
- `/planning/tasks.md` - Detailed task specifications

### Contact & Resources
- Repository: https://github.com/mushfoo/puka
- Current Branch: main
- Next Milestone: End Week 5 - Core Dashboard Complete

---

**Ready to continue development on Puka Reading Tracker!** Start with Task C001: Enhanced BookCard Component following the acceptance criteria in the task breakdown.