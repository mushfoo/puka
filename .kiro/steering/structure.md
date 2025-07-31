# Project Structure

## Root Directory Organization

```
puka/
├── src/                    # Main application source code
├── e2e/                    # Playwright end-to-end tests
├── docs/                   # Documentation and user guides
├── planning/               # PRD, UI prototypes, task breakdown
├── screenshots/            # UI documentation screenshots
├── scripts/                # Development utilities and automation
├── public/                 # Static assets and PWA files
├── prisma/                 # Database schema and migrations
├── test-results/           # Playwright test artifacts
└── [config files]         # Vite, TypeScript, Tailwind, Playwright configs
```

## Source Code Structure (`src/`)

```
src/
├── components/             # React components organized by feature
│   ├── books/             # BookCard, BookGrid components
│   ├── forms/             # BookForm for adding/editing
│   ├── modals/            # Modal components (Add, Edit, Import, Export)
│   ├── auth/              # Authentication components
│   ├── calendar/          # Reading calendar components
│   ├── legal/             # Legal/privacy components
│   ├── migration/         # Data migration UI components
│   └── sync/              # Cloud sync status components
├── hooks/                 # Custom React hooks (useStorage, useToast)
├── services/              # Business logic and data services
│   ├── storage/           # Storage service implementations
│   ├── export/            # Data export functionality
│   └── migration/         # Data migration services
├── lib/                   # Library code and API clients
│   └── api/               # API endpoint handlers
├── contexts/              # React contexts (AuthContext)
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions (streak calculator)
└── __tests__/             # Comprehensive test suite (274 tests)
```

## Key Architectural Patterns

### Component Organization

- **Feature-based folders**: Components grouped by functionality, not type
- **Co-located tests**: Test files alongside components they test
- **Index files**: Clean exports from component directories

### Service Layer

- **Storage abstraction**: `StorageService` interface with multiple implementations
- **Database service**: `DatabaseStorageService` for cloud persistence
- **Mock service**: `MockStorageService` for testing and offline mode
- **Migration service**: Handles data format migrations and imports

### API Structure

- **Route-based handlers**: Each API endpoint has dedicated handler function
- **Authentication middleware**: `requireAuth` and `allowAnonymous` wrappers
- **Type-safe requests**: Shared types between frontend and backend

## Configuration Files

### Build & Development

- `vite.config.ts` - Vite configuration with API middleware
- `tsconfig.json` - TypeScript strict configuration
- `tailwind.config.js` - Custom design system colors and utilities
- `package.json` - Dependencies and npm scripts

### Database & Schema

- `prisma/schema.prisma` - Database schema with Better-auth integration
- `prisma/migrations/` - Database migration history
- `prisma/seed.ts` - Sample data for development

### Testing

- `playwright.config.ts` - E2E test configuration
- `src/test/setup.ts` - Vitest test setup and global configuration

## Naming Conventions

### Files

- **Components**: PascalCase (e.g., `BookCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useStorage.ts`)
- **Services**: PascalCase with `Service` suffix (e.g., `ReadingDataService.ts`)
- **Types**: PascalCase (e.g., `Book`, `ReadingDay`)
- **Utilities**: camelCase (e.g., `streakCalculator.ts`)

### Directories

- **kebab-case** for multi-word directories (e.g., `user-guide/`)
- **camelCase** for single concept directories (e.g., `components/`)

## Import Patterns

### Path Aliases

- `@/*` maps to `src/*` for clean imports
- Relative imports for closely related files
- Absolute imports for cross-feature dependencies

### Barrel Exports

- Index files in component directories for clean imports
- Avoid complex re-export chains
- Export only what's needed externally

## Testing Organization

### Unit Tests

- Co-located with source files (`Component.test.tsx`)
- Comprehensive service testing in `__tests__/` directories
- Mock implementations for external dependencies

### E2E Tests

- Feature-based test files in `e2e/` directory
- Real user workflow testing
- Mobile and desktop viewport testing

## Documentation Structure

### User Documentation (`docs/`)

- User guides for end-user features
- Migration guides for data imports
- FAQ and troubleshooting

### Development Documentation

- `development-guidelines.md` - Code standards and practices
- `README.md` - Setup and development instructions
- Inline code comments for complex logic
