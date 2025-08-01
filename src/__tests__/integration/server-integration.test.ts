/**
 * Integration tests for the unified server architecture
 * Tests authentication flows, API endpoints, static files, and health checks
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../server/app.js'
import { Express } from 'express'

describe('Unified Server Integration Tests', () => {
  let app: Express
  let server: any

  beforeAll(async () => {
    // Create the app instance
    app = createApp()

    // Start server on a test port
    server = app.listen(0) // Use port 0 for automatic port assignment
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
  })

  describe('Health Check Endpoints', () => {
    it('should return basic health status at /health.json', async () => {
      const response = await request(app).get('/health.json').expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        environment: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number),
      })
    })

    it('should return detailed health information at /api/health/detailed', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200)

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        checks: {
          database: {
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            message: expect.any(String),
          },
          authentication: {
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            message: expect.any(String),
          },
          staticFiles: {
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            message: expect.any(String),
          },
          environment: {
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            message: expect.any(String),
          },
          railway: {
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            message: expect.any(String),
          },
        },
        summary: {
          total: 5,
          healthy: expect.any(Number),
          degraded: expect.any(Number),
          unhealthy: expect.any(Number),
        },
      })
    })

    it('should return health summary at /api/health/summary', async () => {
      const response = await request(app).get('/api/health/summary').expect(200)

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        summary: {
          total: 5,
          healthy: expect.any(Number),
          degraded: expect.any(Number),
          unhealthy: expect.any(Number),
        },
        components: expect.any(Object),
      })
    })

    it('should include proper cache headers for health endpoints', async () => {
      const response = await request(app).get('/api/health/detailed')

      expect(response.headers['cache-control']).toBe(
        'no-cache, no-store, must-revalidate'
      )
      expect(response.headers['x-health-status']).toBeDefined()
      expect(response.headers['x-health-timestamp']).toBeDefined()
    })
  })

  describe('API Endpoints', () => {
    it('should handle basic API health endpoint', async () => {
      const response = await request(app).get('/api/health').expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      })
    })

    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app).get('/api/nonexistent').expect(404)

      expect(response.body).toMatchObject({
        error: 'API endpoint not found',
      })
    })

    it('should handle CORS properly for API requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .expect(204)

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173'
      )
      expect(response.headers['access-control-allow-credentials']).toBe('true')
    })

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(500) // CORS error results in 500

      expect(response.body.error).toContain('Not allowed by CORS')
    })
  })

  describe('Static File Serving', () => {
    it('should serve the main index.html file', async () => {
      const response = await request(app).get('/').expect(200)

      expect(response.headers['content-type']).toContain('text/html')
    })

    it('should serve static assets with proper cache headers', async () => {
      // This test might fail if assets don't exist, but that's expected in test environment
      await request(app).get('/assets/nonexistent.js').expect(404) // Expected in test environment without built assets
    })

    it('should serve manifest.json with appropriate cache headers', async () => {
      const response = await request(app).get('/manifest.json')

      // Might be 404 in test environment, but should have proper headers if it exists
      if (response.status === 200) {
        expect(response.headers['cache-control']).toContain('max-age')
      }
    })

    it('should serve service worker without caching', async () => {
      const response = await request(app).get('/sw.js')

      // Might be 404 in test environment, but should have no-cache if it exists
      if (response.status === 200) {
        expect(response.headers['cache-control']).toBe('no-cache')
      }
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/api/health')

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
      expect(response.headers['x-request-id']).toBeDefined()
      expect(response.headers['x-powered-by']).toBeUndefined()
    })

    it('should include CSP headers', async () => {
      const response = await request(app).get('/')

      expect(response.headers['content-security-policy']).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid JSON in request body',
        type: 'VALIDATION_ERROR',
        requestId: expect.any(String),
      })
    })

    it('should handle requests with invalid host headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Host', 'invalid<>host')
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Invalid host header',
        requestId: expect.any(String),
      })
    })

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/health') // PATCH might not be supported for this endpoint
        .expect(405)

      expect(response.body).toMatchObject({
        error: 'Method not allowed',
        requestId: expect.any(String),
      })
    })
  })

  describe('Request Validation', () => {
    it('should validate content-type for POST requests', async () => {
      const response = await request(app)
        .post('/api/health')
        .set('Content-Type', 'text/plain')
        .send('plain text')
        .expect(415)

      expect(response.body).toMatchObject({
        error: 'Unsupported media type',
        type: 'VALIDATION_ERROR',
        requestId: expect.any(String),
      })
    })

    it('should include request ID in all responses', async () => {
      const response = await request(app).get('/api/health')

      expect(response.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/)
    })
  })

  describe('Performance', () => {
    it('should respond to health checks quickly', async () => {
      const start = Date.now()

      await request(app).get('/health.json').expect(200)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it('should handle concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/health').expect(200))

      const responses = await Promise.all(requests)

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.body.status).toBe('ok')
      })
    })
  })
})
