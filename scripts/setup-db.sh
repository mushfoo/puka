#!/bin/bash

# Development Database Setup Script for Puka Reading Tracker

echo "📚 Setting up Puka development database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing container if it exists
echo "🧹 Cleaning up existing containers..."
docker stop puka-postgres 2>/dev/null || true
docker rm puka-postgres 2>/dev/null || true

# Start PostgreSQL container
echo "🐘 Starting PostgreSQL container..."
docker run -d \
  --name puka-postgres \
  -e POSTGRES_PASSWORD=puka123 \
  -e POSTGRES_DB=puka \
  -p 5432:5432 \
  postgres:15

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is responding
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker exec puka-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ PostgreSQL failed to start after $max_attempts attempts"
        exit 1
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts - waiting for PostgreSQL..."
    sleep 2
    ((attempt++))
done

# Set environment variable for local development
export DATABASE_URL="postgresql://postgres:puka123@localhost:5432/puka?schema=public"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run Prisma migrations
echo "🔄 Running database migrations..."
npm run db:migrate:dev

echo "✅ Database setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Add DATABASE_URL to your .env file:"
echo "      DATABASE_URL=\"postgresql://postgres:puka123@localhost:5432/puka?schema=public\""
echo "   2. Start the development server: npm run dev"
echo "   3. Visit http://localhost:5173"
echo ""
echo "📝 Database connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: puka"
echo "   Username: postgres"
echo "   Password: puka123"
echo ""
echo "🛠️  Useful commands:"
echo "   - View database: npm run db:studio"
echo "   - Reset database: npm run db:reset"
echo "   - Generate client: npm run db:generate"