// Express-like interfaces for our API
interface Request {
  method: string;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string>;
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
  send(data?: any): void;
  setHeader(name: string, value: string): void;
}

export async function handleHealthRequest(req: Request, res: Response, userId: string | null) {
  try {
    console.log('Health check called');
    
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