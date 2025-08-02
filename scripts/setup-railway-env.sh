#!/bin/bash

# Railway Environment Setup Script
# This script helps set up the required environment variables for Railway deployment

set -e

echo "🚂 Railway Environment Setup for Puka Reading Tracker"
echo "=================================================="
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI is available and you're logged in"
echo ""

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local description=$3

    echo "Setting $key..."
    if railway variables set "$key=$value"; then
        echo "✅ $key set successfully"
        echo "   Description: $description"
    else
        echo "❌ Failed to set $key"
        return 1
    fi
    echo ""
}

# Function to generate a secure secret
generate_secret() {
    openssl rand -base64 32
}

echo "🔐 Setting up authentication configuration..."
echo ""

# Generate and set Better Auth secret
echo "Generating Better Auth secret..."
BETTER_AUTH_SECRET=$(generate_secret)
set_env_var "BETTER_AUTH_SECRET" "$BETTER_AUTH_SECRET" "Secret key for Better Auth session encryption"

# Set Node environment
set_env_var "NODE_ENV" "production" "Node.js environment setting"

# Set logging flag for debugging
set_env_var "LOG_ENV_INFO" "true" "Enable detailed environment logging for debugging"

echo "🌐 Railway will automatically provide these variables:"
echo "   - RAILWAY_PUBLIC_DOMAIN (your app's public URL)"
echo "   - RAILWAY_STATIC_URL (static file URL)"
echo "   - RAILWAY_ENVIRONMENT (deployment environment)"
echo "   - DATABASE_URL (from your Postgres service)"
echo ""

echo "📋 Optional environment variables you can set:"
echo ""
echo "1. Custom App URL (if different from Railway domain):"
echo "   railway variables set APP_URL=https://your-custom-domain.com"
echo ""
echo "2. Custom Better Auth URL (if different from app URL):"
echo "   railway variables set BETTER_AUTH_URL=https://your-auth-domain.com"
echo ""
echo "3. Additional trusted origins (comma-separated):"
echo "   railway variables set BETTER_AUTH_TRUSTED_ORIGINS=https://admin.example.com,https://api.example.com"
echo ""

echo "🚀 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your application: railway up"
echo "2. Check deployment status: railway status"
echo "3. View logs: railway logs"
echo "4. Test your deployment: npm run deploy:validate:production"
echo ""
echo "🔍 To verify your environment variables:"
echo "   railway variables"
echo ""
echo "💡 If you encounter issues, check the logs and run:"
echo "   npm run test:auth-config"