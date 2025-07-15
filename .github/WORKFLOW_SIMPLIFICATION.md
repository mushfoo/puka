# Workflow Simplification

## Overview

The GitHub Actions workflows have been significantly simplified to reduce complexity and improve maintainability.

## Changes Made

### Before (Complex)
- **3 separate CI jobs** (validate, test, build) with redundant setup
- **4 deployment jobs** with complex Railway integration
- **Complex migration workflow** with multiple steps
- **Self-hosted runners** dependency
- **200+ lines** of workflow configuration

### After (Simplified)
- **Single CI job** combining all validation steps
- **Simple deployment** with basic Railway integration
- **Minimal migration workflow** (manual trigger only)
- **Standard GitHub runners** (ubuntu-latest)
- **~80 lines** of workflow configuration

## Workflows

### 1. CI Workflow (`ci.yml`)
**Triggers**: Pull requests and pushes to main
**Purpose**: Validate code quality and ensure builds work

**Steps**:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies
4. Lint code
5. Type check
6. Run tests
7. Build application

### 2. Deploy Workflow (`deploy.yml`)
**Triggers**: Pushes to main, manual dispatch
**Purpose**: Deploy to Railway hosting

**Steps**:
1. Checkout code
2. Setup Node.js and install dependencies
3. Build for production
4. Deploy to Railway using CLI

### 3. Supabase Migration (`supabase-migration.yml`)
**Triggers**: Manual dispatch only
**Purpose**: Legacy migration support (will be removed with Railway migration)

**Steps**:
1. Setup Supabase CLI
2. Run migrations (dry-run by default)

## Benefits

✅ **Faster builds** - Single job instead of sequential jobs  
✅ **Simpler maintenance** - Less configuration to manage  
✅ **Standard runners** - No self-hosted runner dependency  
✅ **Clearer flow** - Easy to understand and debug  
✅ **Cost effective** - Reduced GitHub Actions minutes usage  

## Migration Notes

- The simplified workflows are designed to work with the current Supabase setup
- When migrating to Railway + Prisma, the migration workflow can be removed entirely
- Railway deployment uses basic CLI deployment - can be enhanced as needed
- All essential checks (lint, test, type-check, build) are preserved

## Future Enhancements

When needed, these workflows can be enhanced with:
- E2E testing integration
- Performance testing
- Security scanning
- More sophisticated deployment strategies
- Environment-specific deployments

The simplified approach provides a solid foundation that can be built upon as requirements grow.