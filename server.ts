import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import { auth } from './src/lib/auth-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5173;
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();

  // Add JSON parsing middleware for all routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (isProduction) {
    // In production, serve built files
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // Handle auth routes in production
    app.all('/api/auth/*', async (req, res) => {
      try {
        // Get raw body for non-JSON requests
        let body: string | undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          if (req.is('application/json')) {
            body = JSON.stringify(req.body);
          } else if (req.is('application/x-www-form-urlencoded')) {
            body = new URLSearchParams(req.body).toString();
          }
        }

        const authRequest = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body,
        });
        
        const authResponse = await auth.handler(authRequest);
        
        // Set response headers
        authResponse.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        res.status(authResponse.status);
        
        if (authResponse.body) {
          const reader = authResponse.body.getReader();
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(Buffer.from(value));
            return pump();
          };
          await pump();
        } else {
          res.end();
        }
      } catch (error) {
        console.error('Auth route error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Serve SPA - all other routes return index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode - use Vite dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${isProduction ? 'production' : 'development'} mode`);
  });
}

createServer().catch(console.error);