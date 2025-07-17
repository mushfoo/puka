import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Conditionally import auth for development server only
const createAuthPlugin = () => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  return {
    name: "auth-plugin",
    configureServer: async (server: any) => {
      try {
        const { Readable } = await import("node:stream");
        const { auth } = await import("./src/lib/auth");

        // Handle all auth routes including nested paths
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url.startsWith("/api/auth")) {
            handleAuthRequest(req, res, next);
          } else {
            next();
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
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        };
      } catch (error) {
        console.warn("Auth plugin disabled due to import error:", error);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), createAuthPlugin()].filter(Boolean),
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
      "**/src/__tests__.old/**",
      "**/src/__tests__/**",
    ],
  },
});

