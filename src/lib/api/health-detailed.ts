/**
 * Detailed health check API endpoint
 * Provides comprehensive system health information
 */

import { Request, Response } from 'express'
import { HealthCheckService } from '../health/HealthCheckService.js'

let healthCheckService: HealthCheckService | null = null

function getHealthCheckService(): HealthCheckService {
  if (!healthCheckService) {
    healthCheckService = new HealthCheckService()
  }
  return healthCheckService
}

/**
 * Handle detailed health check requests
 * GET /api/health/detailed - Comprehensive health check
 */
export async function handleDetailedHealthRequest(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const service = getHealthCheckService()
    const healthResult = await service.performHealthCheck()

    // Set appropriate HTTP status based on health
    let httpStatus = 200
    if (healthResult.status === 'degraded') {
      httpStatus = 200 // Still OK, but with warnings
    } else if (healthResult.status === 'unhealthy') {
      httpStatus = 503 // Service Unavailable
    }

    // Add response headers for monitoring
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('X-Health-Status', healthResult.status)
    res.setHeader('X-Health-Timestamp', healthResult.timestamp)

    res.status(httpStatus).json(healthResult)
  } catch (error) {
    console.error('Detailed health check error:', error)

    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      error: 'Health check service failed',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Handle simple health check requests (for Railway)
 * GET /health.json - Simple health check for Railway deployment
 */
export async function handleSimpleHealthRequest(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const service = getHealthCheckService()
    const healthResult = await service.performHealthCheck()

    // Railway expects a simple 200 OK for healthy services
    if (healthResult.status === 'unhealthy') {
      res.status(503).json({
        status: 'error',
        timestamp: healthResult.timestamp,
        message: 'Service unhealthy',
      })
    } else {
      res.status(200).json({
        status: 'ok',
        timestamp: healthResult.timestamp,
        environment: healthResult.environment,
        version: healthResult.version,
        uptime: healthResult.uptime,
      })
    }
  } catch (error) {
    console.error('Simple health check error:', error)

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
    })
  }
}

/**
 * Handle health check summary requests
 * GET /api/health/summary - Quick health status
 */
export async function handleHealthSummaryRequest(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const service = getHealthCheckService()
    const healthResult = await service.performHealthCheck()

    const summary = {
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      uptime: healthResult.uptime,
      version: healthResult.version,
      environment: healthResult.environment,
      summary: healthResult.summary,
      components: Object.fromEntries(
        Object.entries(healthResult.checks).map(([key, check]) => [
          key,
          {
            status: check.status,
            message: check.message,
            responseTime: check.responseTime,
          },
        ])
      ),
    }

    let httpStatus = 200
    if (healthResult.status === 'unhealthy') {
      httpStatus = 503
    }

    res.status(httpStatus).json(summary)
  } catch (error) {
    console.error('Health summary error:', error)

    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health summary failed',
    })
  }
}

// Cleanup function for graceful shutdown
export async function cleanupHealthService(): Promise<void> {
  if (healthCheckService) {
    await healthCheckService.cleanup()
    healthCheckService = null
  }
}
