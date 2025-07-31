import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { getServerConfig, getLoggingConfig } from '../lib/config/environment.js'

/**
 * Create rate limiting middleware with environment-aware configuration
 */
export const createRateLimit = (
  windowMs: number,
  max: number,
  message: string
) => {
  const config = getServerConfig()

  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development for easier testing
    skip: () => config.isDevelopment,
    // Use a more sophisticated key generator for better accuracy
    keyGenerator: (req: Request) => {
      // Use forwarded IP if behind proxy (Railway), otherwise use socket IP
      return req.ip || req.socket.remoteAddress || 'unknown'
    },
  })
}

/**
 * Security headers middleware
 */
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 11)}`
  res.setHeader('X-Request-ID', requestId)

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Remove server signature
  res.removeHeader('X-Powered-By')

  next()
}

/**
 * Request validation middleware
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Validate host header
  const host = req.get('host')
  if (!host || !/^[a-zA-Z0-9\-.:]+$/.test(host)) {
    return res.status(400).json({
      error: 'Invalid host header',
      requestId: res.getHeader('X-Request-ID'),
    })
  }

  // Validate HTTP method
  const allowedMethods = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
  ]
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      error: 'Method not allowed',
      requestId: res.getHeader('X-Request-ID'),
    })
  }

  // Validate content-type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type')
    if (
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('application/x-www-form-urlencoded')
    ) {
      return res.status(415).json({
        error: 'Unsupported media type',
        requestId: res.getHeader('X-Request-ID'),
      })
    }
  }

  next()
}

/**
 * Development logging middleware with timing
 */
export const developmentLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const loggingConfig = getLoggingConfig()

  if (!loggingConfig.enableRequestLogging) {
    return next()
  }

  const start = Date.now()
  const requestId = res.getHeader('X-Request-ID')

  console.log(`[${requestId}] ${req.method} ${req.path}`)

  res.on('finish', () => {
    const duration = Date.now() - start
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m' // Red for errors, green for success
    const resetColor = '\x1b[0m'

    console.log(
      `[${requestId}] ${req.method} ${req.path} - ${statusColor}${res.statusCode}${resetColor} (${duration}ms)`
    )
  })

  next()
}

/**
 * JSON payload validation middleware
 */
export const validateJsonPayload = (
  _req: Request,
  _res: Response,
  buf: Buffer
) => {
  if (buf.length === 0) return

  try {
    JSON.parse(buf.toString())
  } catch (e) {
    const error = new Error('Invalid JSON payload')
    ;(error as any).status = 400
    throw error
  }
}

/**
 * CORS configuration factory
 */
export const createCorsOptions = () => {
  const config = getServerConfig()

  return {
    origin: function (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true)

      const allowedOrigins = config.betterAuthTrustedOrigins

      // Allow Railway domains
      if (
        origin.includes('.railway.app') ||
        origin.includes('.up.railway.app')
      ) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cookie',
      'Set-Cookie',
    ],
  }
}
