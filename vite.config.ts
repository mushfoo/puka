import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Auth API middleware plugin
const authApiPlugin = () => {
  return {
    name: 'auth-api',
    configureServer(server: any) {
      server.middlewares.use('/api/auth', async (req: any, res: any, next: any) => {
        try {
          const { auth } = await import('./src/lib/auth')
          const request = new Request(`${req.protocol}://${req.get('host')}${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
          })
          
          const response = await auth.handler(request)
          
          res.status(response.status)
          response.headers.forEach((value, key) => {
            res.setHeader(key, value)
          })
          
          const body = await response.text()
          res.end(body)
        } catch (error) {
          next(error)
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), authApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173')
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4173'),
    allowedHosts: [
      'healthcheck.railway.app',
      'puka-staging.up.railway.app',
      '.up.railway.app' // Allow all Railway subdomains
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['papaparse']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**',
      '**/playwright-report/**',
      '**/test-results/**'
    ],
  },
})