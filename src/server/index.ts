import { createApp } from './app.js'

const app = createApp()
const port = process.env.PORT || 3000

// Start server
const server = app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Health check: http://localhost:${port}/health.json`)
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
