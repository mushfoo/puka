# Railway Deployment Guide - Puka Reading Tracker v2.0

## Overview

This guide provides step-by-step instructions for deploying Puka Reading Tracker to Railway with Supabase integration, maintaining the offline-first architecture while enabling cloud synchronization.

---

## Pre-Deployment Setup

### 1. Railway Account Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to existing project or create new
railway link
# OR
railway login --api-key <your-api-key>
```

### 2. Supabase Project Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Start local development
supabase start

# Create cloud project (when ready)
supabase projects create puka-reading-tracker
```

---

## Project Configuration

### Railway Configuration Files

#### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run preview",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  },
  "environments": {
    "production": {
      "variables": {
        "NODE_ENV": "production"
      }
    },
    "staging": {
      "variables": {
        "NODE_ENV": "staging"
      }
    }
  }
}
```

#### Updated `package.json` Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0 --port $PORT",
    "railway:build": "npm run build",
    "railway:start": "npm run preview",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:generate-types": "supabase gen types typescript --local > src/types/supabase.ts"
  }
}
```

#### Vite Configuration for Railway
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173')
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4173')
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});
```

---

## Environment Variables Setup

### Railway Environment Variables
```bash
# Production environment variables for Railway
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_ENV=production
VITE_APP_VERSION=2.0.0

# Optional: Custom domain
RAILWAY_STATIC_URL=https://puka-reading-tracker.up.railway.app

# Build configuration
NODE_ENV=production
PORT=4173
```

### Local Development Environment
```bash
# .env.local (for local development)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
VITE_APP_ENV=development
```

### Supabase Environment Configuration
```typescript
// src/config/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export { supabaseUrl, supabaseAnonKey };
```

---

## Deployment Pipeline

### 3-Week Implementation with Railway

#### Week 1: Local Development Setup
```bash
# Day 1-2: Local Supabase Setup
supabase init
supabase start
supabase db reset

# Create database schema
supabase migration new create_books_table
supabase migration new create_reading_days_table
supabase migration new setup_rls_policies

# Day 3-5: Authentication Implementation
# Implement auth components with local Supabase
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-react

# Day 6-7: Hybrid Storage Development
# Build offline-first sync layer
```

#### Week 2: Cloud Integration
```bash
# Day 1-3: Cloud Supabase Setup
supabase projects create puka-reading-tracker
supabase link --project-ref your-project-ref
supabase db push

# Day 4-5: Sync Implementation
# Implement real-time sync with cloud Supabase
# Test offline/online transitions

# Day 6-7: Railway Preparation
railway login
railway init
railway add
```

#### Week 3: Production Deployment
```bash
# Day 1-3: Railway Deployment
railway up
railway domain add puka-reading-tracker.up.railway.app

# Day 4-5: Production Testing
# End-to-end testing with production environment
# Performance validation

# Day 6-7: Go Live
# DNS setup, monitoring, documentation
```

---

## Deployment Steps

### Step 1: Prepare Repository
```bash
# Ensure clean git state
git status
git add .
git commit -m "Prepare for Railway deployment"

# Create production branch (optional)
git checkout -b production
```

### Step 2: Configure Railway Project
```bash
# Create new Railway project
railway init

# Set up environment variables
railway variables set VITE_SUPABASE_URL=https://your-project.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=your-anon-key
railway variables set VITE_APP_ENV=production
railway variables set NODE_ENV=production
```

### Step 3: Deploy to Railway
```bash
# Deploy current branch
railway up

# Or deploy specific service
railway up --service frontend

# Monitor deployment
railway logs
```

### Step 4: Custom Domain Setup
```bash
# Add custom domain
railway domain add puka.yourdomain.com

# Generate SSL certificate (automatic)
# Update DNS records as instructed by Railway
```

---

## Production Configuration

### Supabase Production Setup

#### Database Schema Deployment
```sql
-- Create production tables
-- books table
CREATE TABLE public.books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  notes text,
  progress integer CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
  status text CHECK (status IN ('want_to_read', 'currently_reading', 'finished')) DEFAULT 'want_to_read',
  date_started date,
  date_finished date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- reading_days table
CREATE TABLE public.reading_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  book_ids uuid[] DEFAULT '{}',
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own books" 
ON public.books FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own reading days" 
ON public.reading_days FOR ALL 
USING (auth.uid() = user_id);
```

#### Authentication Configuration
```javascript
// Supabase Dashboard -> Authentication -> Settings
{
  "site_url": "https://puka-reading-tracker.up.railway.app",
  "additional_redirect_urls": [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://puka-reading-tracker.up.railway.app/auth/callback"
  ],
  "jwt_expiry": 3600,
  "refresh_token_rotation_enabled": true,
  "security_captcha_enabled": false
}
```

### Railway Production Settings

#### Service Configuration
```yaml
# Railway service settings
Name: puka-reading-tracker
Environment: production
Region: us-west1  # Choose closest to your users

# Build settings
Build Command: npm run build
Start Command: npm run preview
Healthcheck Path: /
Port: 4173

# Auto-deployment
Branch: main
Auto-deploy: enabled
```

#### Performance Optimization
```javascript
// Add to vite.config.ts for production
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['tailwindcss']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  }
});
```

---

## Monitoring & Maintenance

### Railway Monitoring
```bash
# Monitor deployment logs
railway logs --tail

# Check service status
railway status

# View metrics
railway metrics

# Connect to project
railway shell
```

### Supabase Monitoring
```javascript
// Add error tracking to app
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    headers: {
      'x-application-name': 'puka-reading-tracker'
    }
  }
});

// Monitor auth events
supabase.auth.onAuthStateChange((event, session) => {
  if (process.env.NODE_ENV === 'production') {
    // Log auth events for monitoring
    console.log('Auth event:', event, session?.user?.id);
  }
});
```

### Health Checks
```typescript
// src/utils/healthCheck.ts
export const performHealthCheck = async (): Promise<boolean> => {
  try {
    // Check Supabase connection
    const { data, error } = await supabase.from('books').select('count(*)').limit(1);
    if (error) throw error;
    
    // Check local storage
    const localHealth = await checkLocalStorageHealth();
    
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Add health check endpoint
// public/health.json
{
  "status": "healthy",
  "timestamp": "2025-07-04T12:00:00Z",
  "version": "2.0.0"
}
```

---

## Backup & Recovery

### Automated Backups
```bash
# Set up automated Supabase backups
# In Supabase Dashboard -> Settings -> Database -> Backups
# Enable daily backups with 30-day retention
```

### Data Export Strategy
```typescript
// Implement user data export
export const exportUserData = async (userId: string): Promise<ExportData> => {
  const [books, readingDays] = await Promise.all([
    supabase.from('books').select('*').eq('user_id', userId),
    supabase.from('reading_days').select('*').eq('user_id', userId)
  ]);
  
  return {
    exportDate: new Date().toISOString(),
    userId,
    books: books.data || [],
    readingDays: readingDays.data || [],
    version: '2.0.0'
  };
};
```

---

## Cost Optimization

### Railway Cost Management
- **Free Tier**: $0/month for hobby projects
- **Pro Plan**: $5/month when you need more resources
- **Resource Limits**: Monitor usage in Railway dashboard
- **Scaling**: Auto-scales based on traffic

### Supabase Cost Management
- **Free Tier**: 500MB database, 50k monthly active users
- **Pro Plan**: $25/month when you exceed free limits
- **Optimization**: Use RLS policies to minimize data transfer

### Combined Cost Estimate
```
Development: $0/month (free tiers)
Production (low usage): $0-10/month
Production (moderate usage): $10-30/month
```

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Check build logs
railway logs --deployment <deployment-id>

# Common fixes
npm install  # Update dependencies
npm run build  # Test build locally
```

#### Environment Variable Issues
```bash
# List current variables
railway variables

# Update variables
railway variables set VITE_SUPABASE_URL=new-value
```

#### Supabase Connection Issues
```typescript
// Add connection debugging
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    debug: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

### Recovery Procedures
1. **Deployment Rollback**: Use Railway dashboard to rollback to previous deployment
2. **Database Recovery**: Use Supabase backup restoration
3. **Data Migration**: Export user data and re-import if needed

This comprehensive deployment guide ensures a smooth transition from local development to production deployment on Railway with Supabase integration.