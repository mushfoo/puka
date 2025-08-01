#!/bin/bash

# Simplified Railway migration script
# Optimized for Railway's native Node.js deployment

set -e

# Check if script has executable permissions
if [ ! -x "$0" ]; then
    echo "⚠️  Warning: Script may not have executable permissions"
    echo "💡 Run: chmod +x $0"
fi

echo "🚀 Starting Railway database migration..."

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ DATABASE_URL is configured"
echo "📍 Environment: ${NODE_ENV:-development}"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Deploy migrations
echo "📦 Deploying database migrations..."
npx prisma migrate deploy

echo "✅ Railway migration completed successfully!"