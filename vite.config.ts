import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Create API plugin for development server
const createApiPlugin = () => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  return {
    name: "api-plugin",
    configureServer: async (server: any) => {
      try {
        const { Readable } = await import("node:stream");
        const { auth } = await import("./src/lib/auth-server");

        // API route handlers
        server.middlewares.use(async (req: any, res: any, next: any) => {
          try {
            if (req.url.startsWith("/api/auth")) {
              await handleAuthRequest(req, res);
            } else if (req.url.startsWith("/api/")) {
              await handleApiRequest(req, res);
            } else {
              next();
            }
          } catch (error) {
            console.error("API middleware error:", error);
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        });

        const handleAuthRequest = async (req: any, res: any) => {
          try {
            // Create a URL object from the request
            const url = new URL(req.url, `http://${req.headers.host}`);

            // Handle request body for POST/PUT requests
            let body: string | undefined;
            if (req.method !== "GET" && req.method !== "HEAD") {
              body = await new Promise<string>((resolve) => {
                let data = "";
                req.on("data", (chunk: any) => (data += chunk));
                req.on("end", () => resolve(data));
              });
            }

            // Create a Fetch-compatible Request object
            const request = new Request(url, {
              method: req.method,
              headers: req.headers,
              body: body,
              duplex: "half" as any, // Required for streams
            });

            // Call the Better Auth handler with the compatible request
            const response = await auth.handler(request);

            // Pipe the response back to the client
            res.writeHead(
              response.status,
              Object.fromEntries(response.headers.entries()),
            );
            if (response.body) {
              Readable.fromWeb(response.body as any).pipe(res);
            } else {
              res.end();
            }
          } catch (error) {
            console.error("Auth request error:", error);
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        };

        const handleApiRequest = async (req: any, res: any) => {
          try {
            // Log only essential info in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`API: ${req.method} ${req.url}`);
            }
            
            // Parse request body for non-GET requests
            let body: any;
            if (req.method !== "GET" && req.method !== "HEAD") {
              const rawBody = await new Promise<string>((resolve) => {
                let data = "";
                req.on("data", (chunk: any) => (data += chunk));
                req.on("end", () => resolve(data));
              });
              
              try {
                body = rawBody ? JSON.parse(rawBody) : {};
              } catch (e) {
                console.error('Invalid JSON in request body:', e);
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
                return;
              }
            }

            // Parse URL and query parameters
            const url = new URL(req.url, `http://${req.headers.host}`);
            const queryParams = Object.fromEntries(url.searchParams.entries());

            // Create Express-like req/res objects
            const expressReq = {
              ...req,
              body,
              query: queryParams,
              headers: req.headers || {}, // Ensure headers is always defined
            };

            const expressRes = {
              status: (code: number) => {
                res.statusCode = code;
                return expressRes;
              },
              json: (data: any) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
              send: (data?: any) => {
                if (data) {
                  res.end(data);
                } else {
                  res.end();
                }
              },
              setHeader: (name: string, value: string) => {
                res.setHeader(name, value);
              },
            };

            // Import API handlers dynamically
            const { allowAnonymous, requireAuth } = await import("./src/lib/api/auth");
            const { handleHealthRequest } = await import("./src/lib/api/health");
            const { handleBooksRequest, handleBookByIdRequest } = await import("./src/lib/api/books");
            const { handleStreakRequest } = await import("./src/lib/api/streak");
            const { handleSettingsRequest } = await import("./src/lib/api/settings");
            const { handleTransactionRequest } = await import("./src/lib/api/transaction");

            // Route to appropriate handler
            const pathSegments = url.pathname.split('/').filter(Boolean);

            if (pathSegments[1] === 'health') {
              await allowAnonymous(handleHealthRequest)(expressReq, expressRes); // Health check doesn't need auth
            } else if (pathSegments[1] === 'books') {
              if (pathSegments[2]) {
                // /api/books/[id]
                const bookId = pathSegments[2];
                await requireAuth(handleBookByIdRequest)(expressReq, expressRes, bookId);
              } else {
                // /api/books
                await requireAuth(handleBooksRequest)(expressReq, expressRes);
              }
            } else if (pathSegments[1] === 'streak') {
              await requireAuth(handleStreakRequest)(expressReq, expressRes);
            } else if (pathSegments[1] === 'settings') {
              await requireAuth(handleSettingsRequest)(expressReq, expressRes);
            } else if (pathSegments[1] === 'transaction') {
              // /api/transaction/[action]
              const action = pathSegments[2];
              await requireAuth(handleTransactionRequest)(expressReq, expressRes, action);
            } else {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "API endpoint not found" }));
            }
          } catch (error) {
            console.error("API request error:", error);
            console.error("Error stack:", error instanceof Error ? error.stack : String(error));
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }));
          }
        };
      } catch (error) {
        console.warn("API plugin disabled due to import error:", error);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), createApiPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5173"),
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      // Allow local network access (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      /^192\.168\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      // Allow .local domains for mDNS
      /\.local$/,
    ],
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "4173"),
    allowedHosts: [
      "healthcheck.railway.app",
      "puka-staging.up.railway.app",
      ".up.railway.app", // Allow all Railway subdomains
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["papaparse"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    minify: "terser",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/e2e/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
});
