import { auth } from '../auth-server'
import { getAppBaseUrl } from './utils'

import type { ApiRequest, ApiResponse, AuthenticatedRequest } from './types'

export async function authenticateUser(
  req: ApiRequest
): Promise<string | null> {
  try {
    // Create a proper Request object that Better Auth expects
    const baseUrl = getAppBaseUrl()
    const url = new URL(`${baseUrl}/api/auth/get-session`)

    // Forward all relevant headers to Better Auth
    const headers: Record<string, string> = {}

    // Essential headers for Better Auth
    if (req.headers?.cookie) {
      headers.cookie = req.headers.cookie
    }
    if (req.headers?.authorization) {
      headers.authorization = req.headers.authorization
    }
    if (req.headers?.['user-agent']) {
      headers['user-agent'] = req.headers['user-agent']
    }
    if (req.headers?.['x-forwarded-for']) {
      headers['x-forwarded-for'] = req.headers['x-forwarded-for']
    }

    const authRequest = new Request(url, {
      method: 'GET',
      headers,
    })

    // Use Better Auth's built-in session verification
    const response = await auth.handler(authRequest)

    if (!response.ok) {
      return null
    }

    const sessionData = await response.json()

    // Better Auth returns session data in a specific format
    if (sessionData?.user?.id) {
      return sessionData.user.id
    }

    return null
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function requireAuth(
  handler: (
    req: AuthenticatedRequest,
    res: ApiResponse,
    userId: string,
    ...args: any[]
  ) => Promise<void>
) {
  return async (
    req: AuthenticatedRequest,
    res: ApiResponse,
    ...args: any[]
  ) => {
    try {
      const userId = await authenticateUser(req)

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Please sign in to access this resource',
        })
      }

      req.userId = userId
      await handler(req, res, userId, ...args)
    } catch (error) {
      console.error('Auth middleware error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// For testing without authentication (development only)
export function allowAnonymous(
  handler: (
    req: AuthenticatedRequest,
    res: ApiResponse,
    userId: string | null,
    ...args: any[]
  ) => Promise<void>
) {
  return async (
    req: AuthenticatedRequest,
    res: ApiResponse,
    ...args: any[]
  ) => {
    try {
      const userId = await authenticateUser(req)
      await handler(req, res, userId, ...args)
    } catch (error) {
      console.error('API handler error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export function handleAuthError(error: any, res: ApiResponse) {
  if (error.code === 'UNAUTHORIZED') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Your session has expired. Please sign in again.',
    })
  }

  if (error.code === 'FORBIDDEN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource.',
    })
  }

  console.error('Unhandled auth error:', error)
  return res.status(500).json({ error: 'Internal server error' })
}
