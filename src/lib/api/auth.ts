import { auth } from '../auth-server';
import { getAppBaseUrl } from './utils';

import type { ApiRequest, ApiResponse, AuthenticatedRequest } from './types';

export async function authenticateUser(req: ApiRequest): Promise<string | null> {
  try {
    // Extract session token from cookies
    let sessionToken: string | undefined;

    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {} as Record<string, string>);
      
      // Better-auth uses 'better-auth.session_token' by default
      sessionToken = cookies['better-auth.session_token'];
    }

    // Also check for authorization header
    if (!sessionToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      return null;
    }

    // Create a Request object that better-auth expects
    const baseUrl = getAppBaseUrl();
    const url = new URL(`${baseUrl}/api/auth/get-session`);
    const authRequest = new Request(url, {
      method: 'GET',
      headers: {
        cookie: req.headers.cookie || '',
        'user-agent': req.headers['user-agent'] || '',
      },
    });

    // Use better-auth handler to verify session
    const response = await auth.handler(authRequest);
    
    if (!response.ok) {
      return null;
    }

    const sessionData = await response.json();
    
    if (!sessionData || !sessionData.user) {
      return null;
    }

    return sessionData.user.id;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function requireAuth(handler: (req: AuthenticatedRequest, res: ApiResponse, userId: string, ...args: any[]) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: ApiResponse, ...args: any[]) => {
    try {
      const userId = await authenticateUser(req);
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Please sign in to access this resource' 
        });
      }

      req.userId = userId;
      await handler(req, res, userId, ...args);
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// For testing without authentication (development only)
export function allowAnonymous(handler: (req: AuthenticatedRequest, res: ApiResponse, userId: string | null, ...args: any[]) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: ApiResponse, ...args: any[]) => {
    try {
      const userId = await authenticateUser(req);
      await handler(req, res, userId, ...args);
    } catch (error) {
      console.error('API handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function handleAuthError(error: any, res: Response) {
  if (error.code === 'UNAUTHORIZED') {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Your session has expired. Please sign in again.' 
    });
  }
  
  if (error.code === 'FORBIDDEN') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'You do not have permission to access this resource.' 
    });
  }

  console.error('Unhandled auth error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}