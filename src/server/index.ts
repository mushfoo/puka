import { createApp } from './app.js'
import {
  getServerConfig,
  logEnvironmentInfo,
} from '../lib/config/environment.js'

const app = createApp()
const config = getServerConfig()

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Server started successfully!`)
  console.log(`📍 Running on port ${config.port}`)
  console.log(`🌐 App URL: ${config.appUrl}`)
  console.log(`❤️  Health check: ${config.appUrl}/health.json`)
  console.log('')

  // Log detailed environment info in development or if explicitly requested
  if (config.isDevelopment || process.env.LOG_ENV_INFO === 'true') {
    logEnvironmentInfo()
  }

  // Always log Railway-specific info in production for debugging
  if (config.isProduction || config.isStaging) {
    const railwayConfig = {
      publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
      staticUrl: process.env.RAILWAY_STATIC_URL,
      environment: process.env.RAILWAY_ENVIRONMENT,
      projectId: process.env.RAILWAY_PROJECT_ID,
      serviceId: process.env.RAILWAY_SERVICE_ID,
    }

    console.log('🚂 Railway Configuration:')
    Object.entries(railwayConfig).forEach(([key, value]) => {
      console.log(`   ${key}: ${value || 'Not set'}`)
    })
    console.log('')
  }
})

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`)

  server.close(() => {
    console.log('Server closed successfully')
    process.exit(0)
  })

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

export { app }
