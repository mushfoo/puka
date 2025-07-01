# Docker Setup for Puka Reading Tracker

## Overview

The Puka Reading Tracker can be run in Docker containers for beta testing, deployment, and development purposes.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose V2

## Quick Start

### Production Build & Run

```bash
# Build and start the production container
docker compose up -d puka-app

# Access the application
open http://localhost:3000
```

### Development Mode (Hot Reloading)

```bash
# Start development container with hot reloading
docker compose --profile dev up -d puka-dev

# Access the development server
open http://localhost:5173
```

## Available Services

### Production Service (`puka-app`)
- **Port**: 3000
- **Base Image**: nginx:alpine
- **Features**: 
  - Optimized production build
  - Gzip compression
  - Security headers
  - Static asset caching
  - SPA routing support

### Development Service (`puka-dev`)
- **Port**: 5173
- **Base Image**: node:18-alpine
- **Features**:
  - Hot module reloading
  - Development dependencies
  - Volume mounting for live code changes

## Docker Commands

```bash
# Build images
docker compose build

# Start production container
docker compose up -d puka-app

# Start development container
docker compose --profile dev up -d puka-dev

# View running containers
docker compose ps

# View logs
docker compose logs puka-app
docker compose logs puka-dev

# Stop containers
docker compose down

# Remove containers and images
docker compose down --rmi all
```

## Beta Testing Setup

For beta testing environments:

1. **Build the production image**:
   ```bash
   docker compose build puka-app
   ```

2. **Start the container**:
   ```bash
   docker compose up -d puka-app
   ```

3. **Verify the application**:
   - Access: http://localhost:3000
   - Test core functionality: book management, progress tracking, import/export
   - Verify mobile responsiveness on different screen sizes

4. **Monitor performance**:
   ```bash
   # Check container resources
   docker stats puka-reading-tracker
   
   # View application logs
   docker compose logs -f puka-app
   ```

## Configuration

### Environment Variables

The Docker setup uses production configuration by default:
- `NODE_ENV=production` for the production container
- `NODE_ENV=development` for the development container

### Port Mapping

- **Production**: Host port 3000 → Container port 80
- **Development**: Host port 5173 → Container port 5173

### Volumes

- **Production**: Optional nginx logs volume mounted to `./logs`
- **Development**: Source code volume mounted for hot reloading

## File Structure

```
├── Dockerfile              # Multi-stage production build
├── Dockerfile.dev          # Development container
├── docker-compose.yml      # Container orchestration
├── nginx.conf             # Nginx configuration
└── .dockerignore          # Build context optimization
```

## Security Features

The production container includes:
- Security headers (XSS, CSRF protection)
- Content Security Policy
- Frame options protection
- Server signature disabled
- Gzip compression enabled

## Troubleshooting

### Common Issues

**Container won't start**:
```bash
docker compose logs puka-app
```

**Port already in use**:
```bash
# Use different port
docker compose up -d -p 3001:80 puka-app
```

**Build failures**:
```bash
# Clean build
docker compose build --no-cache puka-app
```

### Health Checks

```bash
# Test application response
curl -I http://localhost:3000

# Verify container health
docker compose exec puka-app nginx -t
```

## Performance

The containerized application maintains production standards:
- **Bundle size**: ~264KB (gzipped: ~80KB)
- **Build time**: ~1.6s
- **Container size**: ~50MB (nginx:alpine base)
- **Startup time**: <5 seconds

## Development Workflow

For active development with Docker:

1. Start development container:
   ```bash
   docker compose --profile dev up -d puka-dev
   ```

2. Make code changes (automatically reloaded)

3. Run tests inside container:
   ```bash
   docker compose exec puka-dev npm test
   ```

4. Build production image for testing:
   ```bash
   docker compose build puka-app
   docker compose up -d puka-app
   ```

The Docker setup maintains all existing functionality while providing containerized deployment options for beta testing and production environments.