import express from 'express';
import { auth } from './src/lib/auth-server.ts';

const app = express();
const port = process.env.API_PORT || 3001;

// Security middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Input validation middleware
const validateRequest = (req, res, next) => {
  // Validate host header
  const host = req.get('host');
  if (!host || !/^[a-zA-Z0-9\-.:]+$/.test(host)) {
    return res.status(400).json({ error: 'Invalid host header' });
  }

  // Validate HTTP method
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  next();
};

app.use(validateRequest);

// Auth routes
app.use('/api/auth*', async (req, res) => {
  try {
    // Sanitize headers
    const sanitizedHeaders = {};
    const allowedHeaders = [
      'content-type', 'authorization', 'accept', 'user-agent',
      'origin', 'referer', 'x-requested-with', 'cookie'
    ];
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (allowedHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
        sanitizedHeaders[key] = value;
      }
    }

    // Create fetch request
    const url = new URL(req.originalUrl, `http://${req.get('host')}`);
    const request = new Request(url, {
      method: req.method,
      headers: sanitizedHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Call Better Auth
    const response = await auth.handler(request);
    
    // Forward response
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.set(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
    
  } catch (error) {
    console.error('Auth route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Other API routes
app.use('/api', async (req, res) => {
  try {
    // Create Express-like objects for existing handlers
    const expressReq = {
      ...req,
      query: req.query || {},
      headers: req.headers || {},
    };

    const expressRes = {
      status: (code) => {
        res.status(code);
        return expressRes;
      },
      json: (data) => res.json(data),
      send: (data) => res.send(data),
      setHeader: (name, value) => res.set(name, value),
    };

    // Import handlers dynamically
    const { allowAnonymous, requireAuth } = await import('./src/lib/api/auth.ts');
    const { handleHealthRequest } = await import('./src/lib/api/health.ts');
    const { handleBooksRequest, handleBookByIdRequest } = await import('./src/lib/api/books.ts');
    const { handleStreakRequest } = await import('./src/lib/api/streak.ts');
    const { handleSettingsRequest } = await import('./src/lib/api/settings.ts');
    const { handleTransactionRequest } = await import('./src/lib/api/transaction.ts');

    // Route handlers
    const pathSegments = req.path.split('/').filter(Boolean);
    
    // API health endpoint with detailed diagnostics (accessed via /api/health)
    // Provides comprehensive health info including auth status, environment, etc.
    if (pathSegments[1] === 'health') {
      await allowAnonymous(handleHealthRequest)(expressReq, expressRes);
    } else if (pathSegments[1] === 'books') {
      if (pathSegments[2]) {
        await requireAuth(handleBookByIdRequest)(expressReq, expressRes, pathSegments[2]);
      } else {
        await requireAuth(handleBooksRequest)(expressReq, expressRes);
      }
    } else if (pathSegments[1] === 'streak') {
      await requireAuth(handleStreakRequest)(expressReq, expressRes);
    } else if (pathSegments[1] === 'settings') {
      await requireAuth(handleSettingsRequest)(expressReq, expressRes);
    } else if (pathSegments[1] === 'transaction') {
      await requireAuth(handleTransactionRequest)(expressReq, expressRes, pathSegments[2]);
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// Railway-specific health check endpoint (matches railway.json healthcheckPath)
// This endpoint is required by Railway for deployment health checks and must return 200 OK
// Different from /api/health which provides detailed diagnostics for monitoring/debugging
app.get('/health.json', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on port ${port}`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});