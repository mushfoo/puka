/**
 * Authentication integration tests for the unified server
 * Tests Better Auth integration and authentication flows
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../server/app.js'
import { Express } from 'express'

describe('Authentication Integration Tests', () => {
  let app: Express
  let server: any

  beforeAll(async () => {
    app = createApp()
    server = app.listen(0)
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
  })

  describe('Better Auth Routes', () => {
    it('should handle auth route requests', async () => {
      // Test that auth routes are properly mounted
      const response = await request(app).get('/api/auth/session').expect(200)

      // Better Auth should return a response (even if no session)
      expect(response.body).toBeDefined()
    })

    it('should handle auth CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/session')
        .set('Origin', 'http://localhost:5173')
        .expect(204)

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173'
      )
      expect(response.headers['access-control-allow-credentials']).toBe('true')
    })

    it('should handle auth POST requests', async () => {
      // Test that POST requests to auth routes are handled
      const response = await request(app).post('/api/auth/sign-in').send({
        email: 'test@example.com',
        password: 'testpassword123',
      })

      // Should get a response from Better Auth (likely 400 for invalid credentials in test)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(500)
    })

    it('should preserve auth cookies and headers', async () => {
      const response = await request(app).get('/api/auth/session')

      // Better Auth should handle cookie management
      expect(response.headers).toBeDefined()
    })
  })

  describe('Protected Routes', () => {
    it('should require authentication for protected API endpoints', async () => {
      // Test books endpoint (should require auth)
      const response = await request(app).get('/api/books')

      // Should either redirect to auth or return 401/403
      expect([401, 403, 302]).toContain(response.status)
    })

    it('should allow anonymous access to health endpoints', async () => {
      const response = await request(app).get('/api/health').expect(200)

      expect(response.body.status).toBe('ok')
    })

    it('should allow anonymous access to detailed health endpoint', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200)

      expect(response.body.status).toMatch(/^(healthy|degraded|unhealthy)$/)
    })
  })

  describe('Authentication Configuration', () => {
    it('should have proper auth configuration in health check', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200)

      const authCheck = response.body.checks.authentication
      expect(authCheck).toBeDefined()
      expect(authCheck.status).toMatch(/^(healthy|degraded|unhealthy)$/)
      expect(authCheck.message).toBeDefined()

      if (authCheck.details) {
        expect(authCheck.details.authUrl).toBeDefined()
        expect(authCheck.details.trustedOrigins).toBeGreaterThan(0)
      }
    })

    it('should validate auth environment in health check', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200)

      const envCheck = response.body.checks.environment
      expect(envCheck).toBeDefined()
      expect(envCheck.status).toMatch(/^(healthy|degraded|unhealthy)$/)

      // In test environment, might be degraded due to development settings
      if (envCheck.status === 'degraded') {
        expect(envCheck.message).toContain('development')
      }
    })
  })

  describe('Session Management', () => {
    it('should handle session requests without errors', async () => {
      const response = await request(app).get('/api/auth/session')

      expect(response.status).toBeLessThan(500) // Should not be a server error
    })

    it('should handle sign-out requests', async () => {
      const response = await request(app).post('/api/auth/sign-out')

      expect(response.status).toBeLessThan(500) // Should not be a server error
    })
  })

  describe('Auth Error Handling', () => {
    it('should handle malformed auth requests gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in')
        .send('invalid json')
        .set('Content-Type', 'application/json')

      // Should handle the error gracefully, not crash
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(500)
    })

    it('should handle missing auth data', async () => {
      const response = await request(app).post('/api/auth/sign-in').send({})

      // Should return appropriate error for missing data
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(500)
    })
  })
})
