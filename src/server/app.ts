import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { toNodeHandler } from 'better-auth/node'
import { auth } from '../lib/auth-server.js'
import {
  createRateLimit,
  securityHeaders,
  validateRequest,
  developmentLogger,
  validateJsonPayload,
  createCorsOptions,
} from './middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createApp() {
  const app = express()

  // Trust proxy for Railway deployment
  app.set('trust proxy', 1)

  // Security middleware - applied first
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests:
            process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for compatibility
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: process.env.NODE_ENV === 'production',
      },
    })
  )

  // Rate limiting middleware
  app.use(
    createRateLimit(
      15 * 60 * 1000, // 15 minutes
      100, // limit each IP to 100 requests per windowMs
      'Too many requests from this IP, please try again later'
    )
  )

  // Stricter rate limiting for auth endpoints
  app.use(
    '/api/auth',
    createRateLimit(
      15 * 60 * 1000, // 15 minutes
      20, // limit each IP to 20 auth requests per windowMs
      'Too many authentication attempts, please try again later'
    )
  )

  // CORS configuration
  app.use(cors(createCorsOptions()))

  // Request parsing middleware with enhanced security
  app.use(
    express.json({
      limit: '1mb',
      verify: validateJsonPayload,
    })
  )

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
      parameterLimit: 100, // Limit number of parameters
    })
  )

  // Security headers and request validation
  app.use(securityHeaders)
  app.use(developmentLogger)

  app.use(validateRequest)

  // Better Auth routes - MUST be before express.json() to avoid client API issues
  app.all('/api/auth/*', toNodeHandler(auth))

  // API routes
  app.use('/api', createApiRouter())

  // Railway health check endpoint
  app.get('/health.json', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '2.0.0',
    })
  })

  // Static file serving (replaces Caddy)
  const distPath = path.join(__dirname, '../../dist')

  // Serve static assets with cache headers
  app.use(
    '/assets',
    express.static(path.join(distPath, 'assets'), {
      maxAge: '1y', // 1 year cache for assets (they have hashes)
      immutable: true,
    })
  )

  // Service worker - no cache
  app.get(
    '/sw.js',
    express.static(path.join(distPath, 'sw.js'), {
      maxAge: 0,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache')
      },
    })
  )

  // Manifest with short cache
  app.get(
    '/manifest.json',
    express.static(path.join(distPath, 'manifest.json'), {
      maxAge: '1d', // 1 day cache
    })
  )

  // Serve other static files
  app.use(
    express.static(distPath, {
      maxAge: '1h', // 1 hour cache for other files
    })
  )

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })

  // Global error handler with enhanced error categorization
  app.use(
    (
      error: Error & { status?: number; code?: string },
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      // Skip if response already sent
      if (res.headersSent) {
        return next(error)
      }

      // Determine error status and type
      let status = error.status || 500
      let message = 'Internal server error'
      let errorType = 'INTERNAL_ERROR'

      // Handle specific error types
      if (error.message === 'Invalid JSON payload') {
        status = 400
        message = 'Invalid JSON in request body'
        errorType = 'VALIDATION_ERROR'
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        status = 413
        message = 'Request payload too large'
        errorType = 'PAYLOAD_TOO_LARGE'
      } else if (error.message.includes('CORS')) {
        status = 403
        message = 'CORS policy violation'
        errorType = 'CORS_ERROR'
      } else if (status === 400) {
        message = 'Bad request'
        errorType = 'VALIDATION_ERROR'
      } else if (status === 401) {
        message = 'Unauthorized'
        errorType = 'AUTH_ERROR'
      } else if (status === 403) {
        message = 'Forbidden'
        errorType = 'AUTH_ERROR'
      } else if (status === 404) {
        message = 'Not found'
        errorType = 'NOT_FOUND'
      }

      // Log error with context
      const requestId = res.getHeader('X-Request-ID')
      console.error(`[${requestId}] ${errorType}:`, {
        message: error.message,
        status,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      })

      // Send error response
      const isDevelopment = process.env.NODE_ENV === 'development'
      res.status(status).json({
        error: message,
        type: errorType,
        requestId,
        ...(isDevelopment && {
          details: error.message,
          ...(status >= 500 && { stack: error.stack }),
        }),
      })
    }
  )

  return app
}

function createApiRouter() {
  const router = express.Router()

  // API route handlers
  router.use(async (req, res, _next) => {
    try {
      // Import handlers dynamically to avoid circular dependencies
      const { allowAnonymous, requireAuth } = await import('../lib/api/auth.js')
      const { handleHealthRequest } = await import('../lib/api/health.js')
      const { handleBooksRequest, handleBookByIdRequest } = await import(
        '../lib/api/books.js'
      )
      const { handleStreakRequest } = await import('../lib/api/streak.js')
      const { handleSettingsRequest } = await import('../lib/api/settings.js')
      const { handleTransactionRequest } = await import(
        '../lib/api/transaction.js'
      )

      // Convert Express request to API request format
      const apiReq = {
        ...req,
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value[0] : value || '',
          ])
        ) as Record<string, string>,
        query: req.query as Record<string, string>,
      }

      // Parse path segments
      const pathSegments = req.path.split('/').filter(Boolean)

      // Route to appropriate handler
      if (pathSegments[0] === 'health') {
        await allowAnonymous(handleHealthRequest)(apiReq, res)
      } else if (pathSegments[0] === 'books') {
        if (pathSegments[1]) {
          await requireAuth(handleBookByIdRequest)(apiReq, res, pathSegments[1])
        } else {
          await requireAuth(handleBooksRequest)(apiReq, res)
        }
      } else if (pathSegments[0] === 'streak') {
        await requireAuth(handleStreakRequest)(apiReq, res)
      } else if (pathSegments[0] === 'settings') {
        await requireAuth(handleSettingsRequest)(apiReq, res)
      } else if (pathSegments[0] === 'transaction') {
        await requireAuth(handleTransactionRequest)(
          apiReq,
          res,
          pathSegments[1]
        )
      } else {
        res.status(404).json({ error: 'API endpoint not found' })
      }
    } catch (error) {
      console.error('API error:', error)
      res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      })
    }
  })

  return router
}
