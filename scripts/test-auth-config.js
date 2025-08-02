#!/usr/bin/env node

/**
 * Test script to validate Better Auth configuration
 * Run this before deployment to catch configuration issues early
 */

import { getServerConfig } from '../src/lib/config/environment.ts'

console.log('🔍 Testing Better Auth Configuration...\n')

try {
  const config = getServerConfig()

  console.log('📋 Configuration Summary:')
  console.log(`   Environment: ${config.nodeEnv}`)
  console.log(`   App URL: ${config.appUrl}`)
  console.log(`   Auth URL: ${config.betterAuthUrl}`)
  console.log(`   Database URL: ${config.databaseUrl ? 'Set' : 'NOT SET'}`)
  console.log(
    `   Auth Secret: ${
      config.betterAuthSecret === 'fallback-secret-for-development-only'
        ? 'FALLBACK (dev only)'
        : 'Custom'
    }`
  )
  console.log(`   Trusted Origins: ${config.betterAuthTrustedOrigins.length}`)

  if (config.isDevelopment) {
    console.log('\n🔗 Trusted Origins:')
    config.betterAuthTrustedOrigins.forEach((origin, index) => {
      console.log(`   ${index + 1}. ${origin}`)
    })
  }

  console.log('\n✅ Validation Results:')

  // Check critical configuration
  const issues = []
  const warnings = []

  if (!config.databaseUrl) {
    issues.push('DATABASE_URL is not set')
  }

  if (
    config.isProduction &&
    config.betterAuthSecret === 'fallback-secret-for-development-only'
  ) {
    issues.push('BETTER_AUTH_SECRET must be set in production')
  }

  if (!config.betterAuthUrl) {
    issues.push('Better Auth URL could not be determined')
  }

  if (config.betterAuthUrl !== config.appUrl) {
    warnings.push(
      `Auth URL (${config.betterAuthUrl}) differs from App URL (${config.appUrl})`
    )
  }

  if (config.betterAuthTrustedOrigins.length === 0) {
    warnings.push('No trusted origins configured')
  }

  if (
    (config.isProduction || config.isStaging) &&
    !config.appUrl.startsWith('https://')
  ) {
    issues.push('Production/staging must use HTTPS')
  }

  // Railway-specific checks
  if (config.isProduction && !process.env.RAILWAY_PUBLIC_DOMAIN) {
    warnings.push('RAILWAY_PUBLIC_DOMAIN not set - are you running on Railway?')
  }

  // Display results
  if (issues.length === 0 && warnings.length === 0) {
    console.log('   ✅ All checks passed!')
  } else {
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      warnings.forEach((warning) => console.log(`   - ${warning}`))
    }

    if (issues.length > 0) {
      console.log('\n❌ Issues:')
      issues.forEach((issue) => console.log(`   - ${issue}`))
      console.log('\n💡 Fix these issues before deploying to production.')
      process.exit(1)
    }
  }

  console.log('\n🎉 Configuration test completed successfully!')
} catch (error) {
  console.error('❌ Configuration test failed:')
  console.error(`   ${error.message}`)

  if (error.stack) {
    console.error('\n📋 Stack trace:')
    console.error(error.stack)
  }

  process.exit(1)
}
