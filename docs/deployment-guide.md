# Deployment Guide - Puka Reading Tracker v2.0

## Overview

This guide covers deploying Puka Reading Tracker using the simplified unified server architecture. The application now uses a single Express.js server that handles both static files and API requests, deployed natively on Railway.

## Architecture Summary

- ✅ **Single Express.js Server** - Unified handling of static files and API requests
- ✅ **Native Node.js Runtime** - No Docker containers required
- ✅ **Better Auth Integration** - Centralized authentication handling
- ✅ **Comprehensive Health Checks** - Multi-component system monitoring
- ✅ **Environment Configuration** - Centralized configuration management

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.sample .env
# Edit .env with your local database URL and auth secret

# Set up database
npm run db:setup

# Start development (frontend only)
npm run dev

# Start development server (backend only)
npm run dev:server

# Start both (run in separate terminals)
npm run dev:full
```

### Production Build

```bash
# Full production build with checks
npm run build:production

# Start production server
npm run start:production
```

## Railway Deployment

### Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Repository** - Code must be in a GitHub repository
3. **PostgreSQL Database** - Add Railway PostgreSQL service

### Environment Variables

Set these variables in Railway dashboard for each environment:

#### Required Variables

```bash
NODE_ENV=production                    # or staging
VITE_APP_ENV=production               # or staging
DATABASE_URL=postgresql://...         # Auto-provided by Railway Postgres
BETTER_AUTH_SECRET=your-secret-key    # Generate with: openssl rand -base64 32
```

#### Optional Variables

```bash
VITE_APP_VERSION=2.0.0
VITE_AUTH_URL=https://your-domain.up.railway.app
BETTER_AUTH_URL=https://your-domain.up.railway.app
APP_URL=https://your-domain.up.railway.app
VITE_USE_DATABASE_STORAGE=true
```

> **Note**: Railway automatically provides `RAILWAY_PUBLIC_DOMAIN` which is used as fallback for URL configuration.

### Deployment Steps

1. **Create Railway Project**

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and create project
   railway login
   railway init
   ```

2. **Add PostgreSQL Service**

   - In Railway dashboard, click "Add Service"
   - Select "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

3. **Configure Environment Variables**

   - Go to your service settings
   - Add the required environment variables listed above
   - Generate a secure `BETTER_AUTH_SECRET`

4. **Deploy**

   ```bash
   # Deploy via CLI
   railway up

   # Or connect GitHub repository in Railway dashboard
   ```

### Railway Configuration

The `railway.json` file is configured for native Node.js deployment:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health.json",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "preDeployCommand": "npm run db:migrate"
  }
}
```

## Health Checks

The application provides multiple health check endpoints:

### Simple Health Check (Railway)

```
GET /health.json
```

Returns basic health status for Railway monitoring.

### Detailed Health Check

```
GET /api/health/detailed
```

Returns comprehensive system health including:

- Database connectivity
- Authentication service status
- Static file serving
- Environment configuration
- Railway integration status

### Health Summary

```
GET /api/health/summary
```

Returns condensed health information for monitoring dashboards.

## Development Workflow

### Local Development Setup

1. **Environment Configuration**

   ```bash
   cp .env.sample .env
   # Edit .env with local settings
   ```

2. **Database Setup**

   ```bash
   npm run db:setup
   npm run db:migrate:dev
   npm run db:seed
   ```

3. **Development Server**

   ```bash
   # Terminal 1: Backend server
   npm run dev:server

   # Terminal 2: Frontend dev server
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health.json

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# Type checking
npm run type-check

# Linting
npm run lint
```

### Build Process

```bash
# Development build
npm run build

# Production build with validation
npm run build:production

# Preview production build
npm run preview
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Check `DATABASE_URL` environment variable
   - Ensure PostgreSQL service is running
   - Verify network connectivity

2. **Authentication Not Working**

   - Verify `BETTER_AUTH_SECRET` is set
   - Check `BETTER_AUTH_URL` matches your domain
   - Ensure CORS origins are configured correctly

3. **Static Files Not Loading**

   - Run `npm run build` to generate static files
   - Check `/health.json` endpoint for static file status
   - Verify Express static file serving configuration

4. **Railway Deployment Issues**
   - Check Railway build logs
   - Verify environment variables are set
   - Ensure `railway.json` configuration is correct

### Health Check Debugging

Use the detailed health check endpoint to diagnose issues:

```bash
curl https://your-app.up.railway.app/api/health/detailed
```

This will show the status of all system components and help identify the root cause of problems.

### Environment Validation

The application validates environment configuration on startup and provides helpful error messages:

```bash
# Check environment configuration
npm run start
# Look for validation warnings and errors in the startup logs
```

## Performance Optimization

### Build Optimization

- Static assets are cached for 1 year
- Service worker provides offline support
- Bundle splitting reduces initial load time

### Server Optimization

- Request caching for API handlers
- Rate limiting in production
- Compression for static files
- Health check caching

### Database Optimization

- Connection pooling via Prisma
- Efficient queries with proper indexing
- Migration optimization for Railway

## Security

### Production Security Features

- Helmet.js security headers
- CORS configuration
- Rate limiting
- Input validation
- Secure cookie settings
- HTTPS enforcement

### Environment Security

- Secrets management via Railway environment variables
- No sensitive data in code repository
- Secure authentication with Better Auth
- Database connection encryption

## Monitoring

### Health Monitoring

- Railway health checks via `/health.json`
- Detailed component monitoring via `/api/health/detailed`
- Application metrics and uptime tracking

### Error Monitoring

- Structured error logging
- Request ID tracking
- Environment-specific error handling
- Graceful degradation for component failures

## Support

For deployment issues:

1. Check the health check endpoints
2. Review Railway deployment logs
3. Verify environment variable configuration
4. Test locally with production build

For development issues:

1. Check the development server logs
2. Verify database connectivity
3. Test API endpoints individually
4. Review browser console for frontend errors
