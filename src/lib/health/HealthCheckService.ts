/**
 * Comprehensive health check service for monitoring application components
 */

import { PrismaClient } from '@prisma/client'
import { getServerConfig, getRailwayConfig } from '../config/environment.js'
import { auth } from '../auth-server.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: {
    database: ComponentHealth
    authentication: ComponentHealth
    staticFiles: ComponentHealth
    environment: ComponentHealth
    railway: ComponentHealth
  }
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  responseTime?: number
  details?: Record<string, any>
  error?: string
}

export class HealthCheckService {
  private prisma: PrismaClient | null = null

  constructor() {
    // Initialize Prisma client lazily to avoid connection issues during startup
  }

  private getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient()
    }
    return this.prisma
  }

  /**
   * Perform comprehensive health check of all application components
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const config = getServerConfig()

    // Run all health checks in parallel for better performance
    const [
      databaseHealth,
      authHealth,
      staticFilesHealth,
      environmentHealth,
      railwayHealth,
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuthentication(),
      this.checkStaticFiles(),
      this.checkEnvironment(),
      this.checkRailwayIntegration(),
    ])

    const checks = {
      database: this.getResultValue(databaseHealth),
      authentication: this.getResultValue(authHealth),
      staticFiles: this.getResultValue(staticFilesHealth),
      environment: this.getResultValue(environmentHealth),
      railway: this.getResultValue(railwayHealth),
    }

    // Calculate summary
    const checkValues = Object.values(checks)
    const summary = {
      total: checkValues.length,
      healthy: checkValues.filter((c) => c.status === 'healthy').length,
      degraded: checkValues.filter((c) => c.status === 'degraded').length,
      unhealthy: checkValues.filter((c) => c.status === 'unhealthy').length,
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy'
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
      environment: config.nodeEnv,
      checks,
      summary,
    }
  }

  /**
   * Check database connectivity and basic operations
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const prisma = this.getPrismaClient()

      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`

      // Test table access (users table should exist from Better Auth)
      const userCount = await prisma.user.count()

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime,
        details: {
          userCount,
          connectionPool: 'active',
        },
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check authentication service status
   */
  private async checkAuthentication(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const config = getServerConfig()

      // Verify Better Auth configuration
      if (
        !config.betterAuthSecret ||
        config.betterAuthSecret === 'fallback-secret-for-development-only'
      ) {
        return {
          status: config.isDevelopment ? 'degraded' : 'unhealthy',
          message: config.isDevelopment
            ? 'Using development auth secret'
            : 'Production auth secret not configured',
          responseTime: Date.now() - startTime,
        }
      }

      // Test auth service availability (basic check)
      if (!auth) {
        return {
          status: 'unhealthy',
          message: 'Authentication service not initialized',
          responseTime: Date.now() - startTime,
        }
      }

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Authentication service operational',
        responseTime,
        details: {
          authUrl: config.betterAuthUrl,
          trustedOrigins: config.betterAuthTrustedOrigins.length,
        },
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        status: 'unhealthy',
        message: 'Authentication service check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check static file serving capability
   */
  private async checkStaticFiles(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      // Check if dist directory exists
      const distPath = path.join(__dirname, '../../../dist')

      try {
        await fs.access(distPath)
      } catch {
        return {
          status: 'degraded',
          message: 'Static files not built - run npm run build',
          responseTime: Date.now() - startTime,
        }
      }

      // Check for key static files
      const keyFiles = ['index.html', 'assets']
      const fileChecks = await Promise.allSettled(
        keyFiles.map(async (file) => {
          const filePath = path.join(distPath, file)
          await fs.access(filePath)
          return file
        })
      )

      const availableFiles = fileChecks
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<string>).value)

      const responseTime = Date.now() - startTime

      if (availableFiles.length === keyFiles.length) {
        return {
          status: 'healthy',
          message: 'Static files available',
          responseTime,
          details: {
            distPath,
            availableFiles,
          },
        }
      } else {
        return {
          status: 'degraded',
          message: 'Some static files missing',
          responseTime,
          details: {
            distPath,
            availableFiles,
            missingFiles: keyFiles.filter((f) => !availableFiles.includes(f)),
          },
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        status: 'unhealthy',
        message: 'Static file check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironment(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const config = getServerConfig()
      const issues: string[] = []

      // Check required environment variables
      if (!config.databaseUrl) {
        issues.push('DATABASE_URL not configured')
      }

      if (
        config.isProduction &&
        config.betterAuthSecret === 'fallback-secret-for-development-only'
      ) {
        issues.push('Production auth secret not set')
      }

      if (
        (config.isProduction || config.isStaging) &&
        !config.appUrl.startsWith('https://')
      ) {
        issues.push('HTTPS not configured for production/staging')
      }

      const responseTime = Date.now() - startTime

      if (issues.length === 0) {
        return {
          status: 'healthy',
          message: 'Environment configuration valid',
          responseTime,
          details: {
            environment: config.nodeEnv,
            appUrl: config.appUrl,
            authUrl: config.betterAuthUrl,
          },
        }
      } else {
        return {
          status: config.isDevelopment ? 'degraded' : 'unhealthy',
          message: `Environment issues: ${issues.join(', ')}`,
          responseTime,
          details: { issues },
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        status: 'unhealthy',
        message: 'Environment check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check Railway-specific integration
   */
  private async checkRailwayIntegration(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const railwayConfig = getRailwayConfig()
      const responseTime = Date.now() - startTime

      if (!railwayConfig.isRailwayDeployment) {
        return {
          status: 'healthy',
          message: 'Not running on Railway (local development)',
          responseTime,
          details: { deployment: 'local' },
        }
      }

      // Check Railway-specific configuration
      const issues: string[] = []

      if (!railwayConfig.publicDomain) {
        issues.push('RAILWAY_PUBLIC_DOMAIN not available')
      }

      if (!railwayConfig.environment) {
        issues.push('RAILWAY_ENVIRONMENT not set')
      }

      if (issues.length === 0) {
        return {
          status: 'healthy',
          message: 'Railway integration operational',
          responseTime,
          details: {
            publicDomain: railwayConfig.publicDomain,
            environment: railwayConfig.environment,
            projectId: railwayConfig.projectId,
            serviceId: railwayConfig.serviceId,
          },
        }
      } else {
        return {
          status: 'degraded',
          message: `Railway issues: ${issues.join(', ')}`,
          responseTime,
          details: { issues, ...railwayConfig },
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        status: 'unhealthy',
        message: 'Railway integration check failed',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Extract result value from Promise.allSettled result
   */
  private getResultValue(
    result: PromiseSettledResult<ComponentHealth>
  ): ComponentHealth {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        status: 'unhealthy',
        message: 'Health check failed to execute',
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.prisma = null
    }
  }
}
