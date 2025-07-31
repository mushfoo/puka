# Design Document

## Overview

The deployment simplification will transform the current complex multi-process architecture into a streamlined single-process Node.js application. The design eliminates Docker containers, removes Caddy as a separate web server, consolidates duplicated API logic, and leverages Railway's native Node.js runtime for simpler deployment and better debugging capabilities.

The core principle is to use Express.js as both the static file server and API handler, eliminating the need for multiple processes and complex inter-process communication that currently causes authentication and deployment issues.

## Architecture

### Current Architecture (Problems)

```
┌─────────────────────────────────────────┐
│ Docker Container                        │
│ ┌─────────────┐  ┌─────────────────────┐│
│ │   Caddy     │  │    Express.js       ││
│ │ (Port 80)   │  │   (Port 3001)       ││
│ │             │  │                     ││
│ │ Static Files│◄─┤ API Routes          ││
│ │ Proxy /api/*│  │ Auth Routes         ││
│ └─────────────┘  └─────────────────────┘│
└─────────────────────────────────────────┘
         ▲
         │ Complex startup script
         │ Two processes to manage
         │ CORS/header issues
```

### New Architecture (Solution)

```
┌─────────────────────────────────────────┐
│ Railway Native Node.js Runtime          │
│ ┌─────────────────────────────────────┐ │
│ │         Express.js                  │ │
│ │        (Single Process)             │ │
│ │                                     │ │
│ │ ├── Static Files (express.static)   │ │
│ │ ├── API Routes (/api/*)             │ │
│ │ ├── Auth Routes (/api/auth/*)       │ │
│ │ └── Health Check (/health.json)     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ▲
         │ Single process
         │ Consistent request handling
         │ Simplified debugging
```

## Components and Interfaces

### 1. Unified Server Architecture

**Express.js Application Structure:**

```typescript
interface ServerConfig {
  port: number
  staticPath: string
  apiPrefix: string
  authPrefix: string
  corsOrigins: string[]
  environment: 'development' | 'staging' | 'production'
}

interface RequestHandler {
  (req: Request, res: Response, next: NextFunction): Promise<void> | void
}
```

**Key Components:**

- **Static File Middleware**: Serves built React application from `/dist`
- **API Router**: Handles all `/api/*` routes with consistent logic
- **Auth Integration**: Better Auth routes at `/api/auth/*`
- **Health Check**: Simple endpoint for Railway health monitoring
- **Error Handling**: Centralized error handling with environment-aware responses

### 2. Environment Configuration

**Configuration Management:**

```typescript
interface EnvironmentConfig {
  // Database
  databaseUrl: string

  // Authentication
  betterAuthSecret: string
  betterAuthUrl: string
  trustedOrigins: string[]

  // Application
  nodeEnv: 'development' | 'staging' | 'production'
  port: number

  // Railway-specific
  railwayPublicDomain?: string
  railwayEnvironment?: string
}
```

**Environment-Specific Settings:**

- **Development**: Hot reloading, detailed error messages, CORS for localhost
- **Staging**: Production-like settings with debug logging enabled
- **Production**: Optimized settings, minimal logging, strict CORS

### 3. Request Flow Simplification

**Unified Request Handling:**

```typescript
interface RequestFlow {
  // 1. Security middleware (rate limiting, validation)
  security: RequestHandler

  // 2. CORS handling (environment-aware origins)
  cors: RequestHandler

  // 3. Body parsing and validation
  parsing: RequestHandler

  // 4. Route handling (auth, api, static)
  routing: RequestHandler

  // 5. Error handling
  errorHandling: RequestHandler
}
```

## Data Models

### 1. Server Configuration Model

```typescript
interface ServerInstance {
  app: Express
  server: Server
  config: ServerConfig

  // Lifecycle methods
  start(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
}
```

### 2. Route Configuration Model

```typescript
interface RouteConfig {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handler: RequestHandler
  middleware: RequestHandler[]
  auth: 'required' | 'optional' | 'none'
}
```

### 3. Environment Model

```typescript
interface DeploymentEnvironment {
  name: string
  config: EnvironmentConfig
  healthCheck: {
    endpoint: string
    timeout: number
    retries: number
  }
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    format: 'json' | 'text'
  }
}
```

## Error Handling

### 1. Centralized Error Management

**Error Categories:**

- **Authentication Errors**: 401 Unauthorized, 403 Forbidden
- **Validation Errors**: 400 Bad Request with detailed field errors
- **Not Found Errors**: 404 for missing resources
- **Server Errors**: 500 Internal Server Error with sanitized messages

**Error Response Format:**

```typescript
interface ErrorResponse {
  error: string
  message: string
  code?: string
  details?: any // Only in development
  timestamp: string
  requestId?: string
}
```

### 2. Environment-Aware Error Handling

**Development:**

- Full error stack traces
- Detailed error messages
- Request/response logging

**Production:**

- Sanitized error messages
- Error logging to console (Railway captures)
- No sensitive information exposure

### 3. Health Check Error Handling

**Health Check Response:**

```typescript
interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: 'ok' | 'error'
    auth: 'ok' | 'error'
    static: 'ok' | 'error'
  }
  uptime: number
}
```

## Testing Strategy

### 1. Development Testing

**Local Development:**

- Hot reloading for both frontend and backend changes
- Consistent API behavior between dev and production
- Database migrations work identically
- Authentication flows work without CORS issues

### 2. Integration Testing

**API Testing:**

- All routes accessible through single server
- Authentication works across all endpoints
- Static files served correctly
- Health checks return proper status

### 3. Deployment Testing

**Railway Deployment:**

- Native Node.js runtime deployment
- Environment variables properly configured
- Database migrations run successfully
- Health checks pass within timeout limits

### 4. Authentication Testing

**Auth Flow Testing:**

- Sign up works in all environments
- Sign in works in all environments
- Session persistence across requests
- CORS headers properly configured
- Better Auth routes accessible

## Implementation Phases

### Phase 1: Server Consolidation

- Create unified Express.js server
- Integrate static file serving
- Consolidate API route handling
- Remove Caddy dependency

### Phase 2: Environment Configuration

- Centralize environment variable handling
- Create environment-specific configurations
- Update Railway deployment configuration
- Remove Docker-related files

### Phase 3: Authentication Fix

- Ensure Better Auth routes work correctly
- Fix CORS and header handling
- Test authentication in all environments
- Verify session management

### Phase 4: Deployment Simplification

- Update Railway configuration for native Node.js
- Simplify build and deployment scripts
- Update health check endpoints
- Test deployment pipeline

### Phase 5: Testing and Validation

- Comprehensive testing across environments
- Performance validation
- Security verification
- Documentation updates

## Security Considerations

### 1. Request Validation

- Input sanitization for all API endpoints
- Request size limits
- Rate limiting for authentication endpoints
- CORS configuration for trusted origins only

### 2. Authentication Security

- Secure session token handling
- Proper cookie configuration
- HTTPS enforcement in production
- Session timeout management

### 3. Static File Security

- Proper cache headers
- No directory traversal vulnerabilities
- Security headers (CSP, HSTS, etc.)
- Asset integrity verification

## Performance Considerations

### 1. Static File Serving

- Efficient Express.js static middleware
- Proper cache headers for assets
- Gzip compression for text files
- CDN-ready asset URLs

### 2. API Performance

- Connection pooling for database
- Efficient session validation
- Minimal middleware overhead
- Request/response compression

### 3. Memory Management

- Proper cleanup of resources
- Efficient session storage
- Database connection management
- Memory leak prevention

## Monitoring and Observability

### 1. Health Monitoring

- Comprehensive health check endpoint
- Database connectivity verification
- Authentication service status
- Static file serving verification

### 2. Logging Strategy

- Structured logging in production
- Request/response logging in development
- Error tracking and alerting
- Performance metrics collection

### 3. Railway Integration

- Native health check support
- Environment variable management
- Automatic restart on failure
- Build and deployment logging
