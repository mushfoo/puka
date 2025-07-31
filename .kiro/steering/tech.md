# Technology Stack

## Frontend

- **React 18+** with TypeScript and strict type checking
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for mobile-first responsive design
- **Service Worker** with intelligent caching and offline support

## Backend & Database

- **PostgreSQL** with Prisma ORM for data persistence
- **Better-auth** for secure user management
- **Express.js** middleware for API handling

## Testing & Quality

- **Vitest + React Testing Library** for unit tests (274 tests, >90% coverage)
- **Playwright** for end-to-end testing and user workflow validation
- **ESLint** with TypeScript rules for code quality
- **Strict TypeScript** configuration with no type errors allowed

## Build & Development

- **Node.js 18+** required
- **npm** for package management
- **Prisma** for database schema and migrations

## Common Commands

### Development

```bash
npm run dev          # Start development server (localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database

```bash
npm run db:setup     # Setup database and run migrations
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio for database management
npm run db:seed      # Seed database with sample data
```

### Testing

```bash
npm run test         # Run unit tests with coverage (274 tests)
npm run test:watch   # Run tests in watch mode for TDD
npm run test:e2e     # Run Playwright end-to-end tests
npm run test:e2e:ui  # Run E2E tests with Playwright UI
```

### Quality Checks

```bash
npm run type-check   # TypeScript type checking
npm run lint         # ESLint code quality checks
```

## Performance Requirements

- **Page Load**: <2 seconds
- **UI Interactions**: <100ms response time (target: <50ms)
- **Bundle Size**: <500KB
- **Mobile Lighthouse Score**: 90+
- **Test Coverage**: Minimum 90%

## Browser Support

- Chrome/Edge, Firefox, Safari (including mobile Safari)
- All modern browsers with PWA capabilities
- Mobile-first design optimized for 375px viewport
