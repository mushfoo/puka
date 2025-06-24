# Puka Reading Tracker

A clean, minimal reading tracker designed for heavy readers who want simple progress tracking and motivation without social features.

## Features

- 📱 Mobile-first responsive design
- 🔥 Reading streak tracking
- 📊 Progress visualization
- 💾 File System Access API storage (user-controlled data)
- 📤 CSV import/export
- 🎯 Sub-30 second task completion
- 🌐 100% offline functionality

## Development

### Prerequisites

- Node.js 18+ 
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Project Structure

```
src/
├── components/
│   ├── ui/           # Base UI components
│   ├── books/        # Book-specific components
│   └── reading/      # Reading tracking components
├── hooks/            # Custom React hooks
├── services/         # Data persistence and business logic
├── types/            # TypeScript interfaces
└── utils/            # Helper functions
```

### Technology Stack

- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **Build**: Vite
- **Storage**: File System Access API + JSON
- **Testing**: Vitest + React Testing Library

### Development Workflow

- Feature branches only (never commit directly to main)
- Branch naming: `feature/task-[id]-[description]`
- Commit format: `Task [ID]: [Clear description]`
- Test-driven development with 90%+ coverage target

## License

MIT
