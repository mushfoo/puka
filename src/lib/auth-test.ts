import { betterAuth } from "better-auth";

// Test configuration with in-memory database
export const authTest = betterAuth({
  database: {
    type: "sqlite",
    url: ":memory:",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
  ],
});

export type SessionTest = typeof authTest.$Infer.Session;