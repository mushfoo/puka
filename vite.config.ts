import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { Readable } from 'node:stream'
import { auth } from './src/lib/auth'

const authPlugin = () => ({
  name: 'auth-plugin',
  configureServer: (server: any) => {
    server.middlewares.use('/api/auth', async (req: any, res: any) => {
      try {
        // Create a URL object from the request
        const url = new URL(req.url, `http://${req.headers.host}`);

        // Create a Fetch-compatible Request object
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
        });

        // Call the Better Auth handler with the compatible request
        const response = await auth.handler(request);

        // Pipe the response back to the client
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        if (response.body) {
          Readable.fromWeb(response.body as any).pipe(res);
        } else {
          res.end();
        }

      } catch (error) {
        console.error('Auth middleware error:', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), authPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
})