# Puka Reading Tracker 📚

A clean, minimal reading tracker that focuses on essential functionality without bloat. Designed for heavy readers who want simple progress tracking and motivation.

## Features

### 📖 Core Functionality
- **Book Management**: Add books with title, author, and notes
- **Progress Tracking**: Visual progress bars with percentage tracking (0-100%)
- **Reading Status**: Organize books as "Want to Read", "Currently Reading", or "Finished"
- **Reading Streaks**: Track daily reading habits with visual indicators
- **Data Portability**: Import/export via CSV for complete data ownership
- **Offline-First**: Full functionality without internet connection

### 🎯 Key Benefits
- **No Social Bloat**: Personal tracking only - no feeds, reviews, or social features
- **Fast & Responsive**: <100ms UI interactions, <2s page load
- **Mobile-First Design**: Optimized for 375px viewport with one-handed operation
- **Privacy-Focused**: Your data stays on your device using File System Access API

## Quick Start

### Prerequisites
- Node.js 18+ 
- Chrome/Edge browser (for File System Access API support)

### Installation

```bash
# Clone the repository
git clone https://github.com/mushfoo/puka.git
cd puka

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to start tracking your reading!

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (mobile-first responsive design)
- **Storage**: File System Access API with JSON files
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Vitest + React Testing Library (90%+ coverage)

## Project Structure

```
puka/
├── src/
│   ├── components/        # React components
│   │   ├── books/        # BookCard, BookGrid components
│   │   ├── forms/        # BookForm for adding/editing
│   │   └── modals/       # Modal components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Storage service implementation
│   ├── types/            # TypeScript type definitions
│   └── __tests__/        # Test files
├── planning/             # PRD, UI prototypes, task breakdown
├── public/              # Static assets
└── [config files]       # Vite, TypeScript, Tailwind configs
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests with coverage
npm run test:watch   # Run tests in watch mode
npm run type-check   # TypeScript type checking
npm run lint         # ESLint code quality checks
```

### Testing

The project maintains >90% test coverage across all features:

```bash
# Run all tests with coverage report
npm run test

# Run tests in watch mode for TDD
npm run test:watch
```

### Code Quality Standards

- **TypeScript**: Strict mode enabled with no type errors
- **Testing**: Minimum 90% coverage requirement
- **Performance**: <100ms UI interactions, <2s load time
- **Mobile-First**: All development starts at 375px viewport

## Browser Support

### Primary Support
- **Chrome/Edge**: Full functionality with File System Access API
- **Mobile Chrome**: Full responsive experience

### Fallback Support
- **Safari/Firefox**: Basic functionality with download/upload fallback
- **Mobile Safari**: Responsive UI with limited file access

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow the coding standards in `development-guidelines.md`
4. Ensure all tests pass and coverage remains >90%
5. Submit a pull request with clear description

### Development Workflow

1. Create feature branches from main: `feature/task-[ID]-[description]`
2. Write tests first (TDD approach encouraged)
3. Test on mobile viewport (375px) before desktop
4. Manual testing of complete user workflows required
5. All PRs require passing tests and code review

## Performance Requirements

- **Page Load**: <2 seconds
- **UI Interactions**: <100ms response time
- **Bundle Size**: <500KB
- **Mobile Lighthouse Score**: 90+

## Roadmap

### Current Status: Epic 2 - Core Dashboard Implementation
- ✅ Epic 1: Foundation (Storage, Types, Validation)
- 🚧 Epic 2: Core Dashboard (BookCard, FilterTabs, Progress UI)
- 📅 Epic 3: Data Management (CSV Import/Export)
- 📅 Epic 4: Polish (Animations, PWA, Offline)

### Future Enhancements
- Progressive Web App capabilities
- Advanced statistics and reading insights
- Book cover image support
- Reading goals and challenges

## Design Philosophy

Puka follows a **minimalist design philosophy**:
- Essential features only - no bloat
- Clean, distraction-free interface
- Mobile-first responsive design
- Fast, intuitive interactions
- Personal use focus (no social features)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with React, TypeScript, and Tailwind CSS
- Inspired by the need for simple, personal reading tracking
- Special thanks to all contributors and testers

---

**Ready to track your reading journey? [Get started now!](#quick-start)** 📚