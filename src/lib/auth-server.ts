import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient } from '@prisma/client'
import { getServerConfig } from './config/environment.js'

const prisma = new PrismaClient()
const config = getServerConfig()

// Log auth configuration for debugging (without secrets)
console.log('🔐 Better Auth Configuration:')
console.log(`   Base URL: ${config.betterAuthUrl}`)
console.log(
  `   Trusted Origins: ${config.betterAuthTrustedOrigins.length} configured`
)
console.log(`   Use Secure Cookies: ${config.isProduction}`)
console.log(`   Environment: ${config.nodeEnv}`)

// Validate critical auth configuration
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required for Better Auth')
}

if (
  config.isProduction &&
  config.betterAuthSecret === 'fallback-secret-for-development-only'
) {
  throw new Error('BETTER_AUTH_SECRET must be set in production')
}

if (!config.betterAuthUrl) {
  throw new Error('Better Auth URL could not be determined')
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: config.betterAuthUrl,
  secret: config.betterAuthSecret,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: config.betterAuthTrustedOrigins,
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Keep simple for now
    },
    useSecureCookies: config.isProduction,
  },
})

export type Session = typeof auth.$Infer.Session
