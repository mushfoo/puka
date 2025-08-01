import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient } from '@prisma/client'
import { getServerConfig } from './config/environment.js'

const prisma = new PrismaClient()
const config = getServerConfig()

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
