/**
 * Centralized environment configuration management
 * This module provides type-safe access to environment variables
 * and handles environment-specific logic in one place.
 */

export type Environment = 'development' | 'staging' | 'production' | 'test'

export interface ServerConfig {
  // Core application
  nodeEnv: Environment
  port: number
  appUrl: string

  // Database
  databaseUrl: string

  // Better Auth
  betterAuthSecret: string
  betterAuthUrl: string
  betterAuthTrustedOrigins: string[]

  // Railway specific
  railwayPublicDomain?: string
  railwayEnvironment?: string

  // Feature flags
  isDevelopment: boolean
  isProduction: boolean
  isStaging: boolean
  isTest: boolean
}

export interface ClientConfig {
  // Core application
  appEnv: Environment
  appVersion: string
  authUrl: string

  // Storage
  useDatabaseStorage: boolean

  // Feature flags
  isDevelopment: boolean
  isProduction: boolean
  isStaging: boolean
  isTest: boolean
}

/**
 * Server-side environment configuration
 * Only available in Node.js environment
 */
export function getServerConfig(): ServerConfig {
  if (typeof window !== 'undefined') {
    throw new Error('getServerConfig() can only be called on the server side')
  }

  const nodeEnv = (process.env.NODE_ENV || 'development') as Environment
  const port = parseInt(process.env.PORT || '3000', 10)

  // Determine app URL based on environment
  let appUrl: string
  if (process.env.APP_URL) {
    appUrl = process.env.APP_URL
  } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    appUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  } else {
    appUrl = `http://localhost:${port}`
  }

  // Parse trusted origins
  const trustedOrigins = [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Express server
    'http://localhost:4173', // Vite preview
    appUrl, // Current app URL
  ]

  // Add additional trusted origins from env
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    trustedOrigins.push(
      ...process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').filter(Boolean)
    )
  }

  // Add Railway domains
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    trustedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
  }

  return {
    nodeEnv,
    port,
    appUrl,
    databaseUrl: process.env.DATABASE_URL || '',
    betterAuthSecret:
      process.env.BETTER_AUTH_SECRET || 'fallback-secret-for-development-only',
    betterAuthUrl: process.env.BETTER_AUTH_URL || appUrl,
    betterAuthTrustedOrigins: [...new Set(trustedOrigins)], // Remove duplicates
    railwayPublicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isStaging: nodeEnv === 'staging',
    isTest: nodeEnv === 'test',
  }
}

/**
 * Client-side environment configuration
 * Available in both browser and Node.js environments
 */
export function getClientConfig(): ClientConfig {
  // Handle both browser and server environments
  const getEnvVar = (key: string, fallback: string = '') => {
    if (typeof window !== 'undefined') {
      // Browser environment - use import.meta.env
      return (import.meta.env as any)[key] || fallback
    } else {
      // Server environment - use process.env
      return process.env[key] || fallback
    }
  }

  const appEnv = getEnvVar('VITE_APP_ENV', 'development') as Environment

  return {
    appEnv,
    appVersion: getEnvVar('VITE_APP_VERSION', 'dev'),
    authUrl: getEnvVar('VITE_AUTH_URL', 'http://localhost:3000'),
    useDatabaseStorage:
      getEnvVar('VITE_USE_DATABASE_STORAGE', 'true') !== 'false',
    isDevelopment: appEnv === 'development',
    isProduction: appEnv === 'production',
    isStaging: appEnv === 'staging',
    isTest: appEnv === 'test',
  }
}

/**
 * Validate required environment variables
 * Throws an error if required variables are missing
 */
export function validateServerEnvironment(): void {
  const config = getServerConfig()
  const errors: string[] = []
  const warnings: string[] = []

  // Required variables
  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required')
    errors.push(
      '  💡 For Railway: This should be automatically provided by the Postgres service'
    )
    errors.push('  💡 For local development: Check your .env file')
  }

  // Production-specific validation
  if (config.isProduction || config.isStaging) {
    if (config.betterAuthSecret === 'fallback-secret-for-development-only') {
      errors.push('BETTER_AUTH_SECRET must be set in production/staging')
      errors.push('  💡 Generate with: openssl rand -base64 32')
    }

    if (!config.appUrl.startsWith('https://')) {
      errors.push('APP_URL must use HTTPS in production/staging')
      errors.push(
        '  💡 Railway should automatically provide RAILWAY_PUBLIC_DOMAIN'
      )
    }

    // Check for Railway-specific issues
    if (!config.railwayPublicDomain && config.isProduction) {
      warnings.push(
        'RAILWAY_PUBLIC_DOMAIN not found - are you running on Railway?'
      )
    }
  }

  // Development-specific warnings
  if (config.isDevelopment) {
    if (
      !config.databaseUrl.includes('localhost') &&
      !config.databaseUrl.includes('railway')
    ) {
      warnings.push(
        "DATABASE_URL doesn't appear to be localhost or Railway - is this correct?"
      )
    }
  }

  // Auth configuration validation
  if (config.betterAuthUrl !== config.appUrl) {
    warnings.push(
      `BETTER_AUTH_URL (${config.betterAuthUrl}) differs from APP_URL (${config.appUrl})`
    )
    warnings.push(
      '  💡 For unified server architecture, these should typically match'
    )
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:')
    warnings.forEach((warning) => console.warn(`   ${warning}`))
    console.warn('')
  }

  // Throw errors if any
  if (errors.length > 0) {
    throw new Error(
      `❌ Environment validation failed:\n${errors
        .map((e) => `   ${e}`)
        .join(
          '\n'
        )}\n\n💡 Check your environment variables and Railway service configuration.`
    )
  }
}

/**
 * Get environment-specific configuration for logging
 */
export function getLoggingConfig() {
  const config = getServerConfig()

  return {
    level: config.isDevelopment ? 'debug' : 'info',
    enableConsole: true,
    enableRequestLogging: config.isDevelopment,
    enableErrorDetails: config.isDevelopment,
  }
}

/**
 * Get environment-specific security configuration
 */
export function getSecurityConfig() {
  const config = getServerConfig()

  return {
    useSecureCookies: config.isProduction,
    enableHSTS: config.isProduction,
    enableCSP: true,
    rateLimitEnabled: !config.isDevelopment,
    corsOrigins: config.betterAuthTrustedOrigins,
  }
}

/**
 * Utility function to check if we're in a specific environment
 */
export const env = {
  isDevelopment: () => getServerConfig().isDevelopment,
  isProduction: () => getServerConfig().isProduction,
  isStaging: () => getServerConfig().isStaging,
  isTest: () => getServerConfig().isTest,
}

/**
 * Log current environment configuration (without secrets)
 * Useful for debugging deployment issues
 */
export function logEnvironmentInfo(): void {
  const config = getServerConfig()

  console.log('🚀 Environment Configuration:')
  console.log(`   Environment: ${config.nodeEnv}`)
  console.log(`   Port: ${config.port}`)
  console.log(`   App URL: ${config.appUrl}`)
  console.log(
    `   Database: ${config.databaseUrl ? 'Connected' : 'Not configured'}`
  )
  console.log(`   Auth URL: ${config.betterAuthUrl}`)
  console.log(
    `   Trusted Origins: ${config.betterAuthTrustedOrigins.length} configured`
  )

  if (config.railwayPublicDomain) {
    console.log(`   Railway Domain: ${config.railwayPublicDomain}`)
    console.log(
      `   Railway Environment: ${config.railwayEnvironment || 'Unknown'}`
    )
  }

  // Feature flags
  console.log('🎛️  Feature Flags:')
  console.log(`   Development Mode: ${config.isDevelopment}`)
  console.log(`   Production Mode: ${config.isProduction}`)
  console.log(`   Staging Mode: ${config.isStaging}`)

  // Security config
  const securityConfig = getSecurityConfig()
  console.log('🔒 Security Configuration:')
  console.log(`   Secure Cookies: ${securityConfig.useSecureCookies}`)
  console.log(`   HSTS Enabled: ${securityConfig.enableHSTS}`)
  console.log(`   CSP Enabled: ${securityConfig.enableCSP}`)
  console.log(`   Rate Limiting: ${securityConfig.rateLimitEnabled}`)
}

/**
 * Get Railway-specific configuration
 * Useful for Railway deployment debugging
 */
export function getRailwayConfig() {
  return {
    publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
    privateDomain: process.env.RAILWAY_PRIVATE_DOMAIN,
    environment: process.env.RAILWAY_ENVIRONMENT,
    projectId: process.env.RAILWAY_PROJECT_ID,
    serviceId: process.env.RAILWAY_SERVICE_ID,
    staticUrl: process.env.RAILWAY_STATIC_URL,
    isRailwayDeployment: !!process.env.RAILWAY_PUBLIC_DOMAIN,
  }
}
