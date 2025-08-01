#!/bin/bash

# Simplified Railway migration script
# Optimized for Railway's native Node.js deployment

set -e

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