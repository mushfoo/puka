import type { ApiRequest, ApiResponse } from './types';

export async function handleHealthRequest(req: ApiRequest, res: ApiResponse, userId: string | null) {
  try {
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      method: req.method,
      hasAuth: !!userId,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
}