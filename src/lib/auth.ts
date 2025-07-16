import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Start with false for simplicity
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      // Map to existing schema fields
      name: {
        type: "string",
        required: false,
      },
      image: {
        type: "string", 
        required: false,
      },
    },
  },
  trustedOrigins: [
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // Alternative port
  ],
});

export type Session = typeof auth.$Infer.Session;