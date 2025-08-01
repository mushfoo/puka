# Deployment Checklist - Puka Reading Tracker v2.0

## Pre-Deployment Checklist

### ✅ Code Quality

- [ ] All TypeScript compilation passes (`npm run type-check`)
- [ ] All linting passes (`npm run lint`)
- [ ] All unit tests pass (`npm run test -- --run`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Build process completes successfully (`npm run build`)

### ✅ Environment Configuration

- [ ] Environment variables documented in `.env.sample`
- [ ] Railway environment variables configured
- [ ] Database connection string set (`DATABASE_URL`)
- [ ] Authentication secret configured (`BETTER_AUTH_SECRET`)
- [ ] Application URLs configured correctly
- [ ] CORS origins configured for environment

### ✅ Database Setup

- [ ] PostgreSQL service added to Railway project
- [ ] Database migrations tested (`npm run db:migrate`)
- [ ] Database connection verified
- [ ] Prisma client generated (`npm run db:generate`)

### ✅ Security Configuration

- [ ] Production auth secret generated (not development fallback)
- [ ] HTTPS enforced for production/staging
- [ ] Security headers configured
- [ ] Rate limiting enabled for production
- [ ] CORS properly configured

## Deployment Process

### 1. Railway Configuration

```bash
# Ensure railway.json is configured for native Node.js
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health.json",
    "preDeployCommand": "npm run db:migrate"
  }
}
```

### 2. Environment Variables Setup

Set these in Railway dashboard for each environment:

**Required:**

- `NODE_ENV=production` (or staging)
- `VITE_APP_ENV=production` (or staging)
- `DATABASE_URL` (auto-provided by Railway Postgres)
- `BETTER_AUTH_SECRET` (generate with: `openssl rand -base64 32`)

**Optional but Recommended:**

- `VITE_APP_VERSION=2.0.0`
- `APP_URL=https://your-domain.up.railway.app`
- `BETTER_AUTH_URL=https://your-domain.up.railway.app`
- `VITE_AUTH_URL=https://your-domain.up.railway.app`

### 3. Deployment Commands

```bash
# Deploy via Railway CLI
railway up

# Or deploy via GitHub integration (recommended)
# Push to main branch with Railway GitHub integration enabled
```

## Post-Deployment Validation

### ✅ Basic Connectivity

- [ ] Application loads at deployment URL
- [ ] No 500 errors in Railway logs
- [ ] Health check endpoint responds (`/health.json`)

### ✅ Health Check Validation

Run the deployment validation script:

```bash
# For staging
./scripts/validate-deployment.sh https://puka-staging.up.railway.app

# For production
./scripts/validate-deployment.sh https://puka-production.up.railway.app
```

Expected results:

- [ ] Basic connectivity test passes
- [ ] Health endpoint returns `{"status": "ok"}`
- [ ] Detailed health check shows component status
- [ ] API endpoints respond correctly
- [ ] Static files serve properly
- [ ] Security headers present
- [ ] Authentication routes accessible
- [ ] Response times under 2 seconds

### ✅ Authentication Testing

- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Session management works
- [ ] Protected routes require authentication
- [ ] Sign out works correctly

### ✅ Application Functionality

- [ ] Main application UI loads
- [ ] API requests work through unified server
- [ ] Database operations function correctly
- [ ] Static assets load with proper caching
- [ ] PWA features work (if applicable)

### ✅ Performance Validation

- [ ] Page load times under 2 seconds
- [ ] API response times under 100ms
- [ ] Health checks respond within 5 seconds
- [ ] No memory leaks in Railway metrics
- [ ] CPU usage within normal ranges

### ✅ Error Handling

- [ ] 404 pages handled correctly
- [ ] API errors return proper status codes
- [ ] CORS errors handled appropriately
- [ ] Database connection failures handled gracefully
- [ ] Authentication errors provide clear feedback

## Monitoring Setup

### ✅ Health Monitoring

- [ ] Railway health checks configured (`/health.json`)
- [ ] Detailed health monitoring available (`/api/health/detailed`)
- [ ] Component-level health tracking working
- [ ] Error logging configured

### ✅ Performance Monitoring

- [ ] Railway metrics dashboard configured
- [ ] Response time monitoring active
- [ ] Error rate tracking enabled
- [ ] Resource usage monitoring setup

## Rollback Plan

### If Deployment Fails:

1. **Check Railway logs** for specific error messages
2. **Verify environment variables** are set correctly
3. **Test database connectivity** using health check endpoint
4. **Validate build process** locally with `npm run build:production`
5. **Rollback to previous deployment** if necessary

### Rollback Commands:

```bash
# Via Railway CLI
railway rollback

# Or redeploy previous working commit
git revert <commit-hash>
git push origin main
```

## Environment-Specific Notes

### Staging Environment

- Use for testing new features before production
- Can have relaxed security settings for testing
- Should mirror production configuration as closely as possible
- Use for integration testing and user acceptance testing

### Production Environment

- Must have all security measures enabled
- Requires HTTPS enforcement
- Should have monitoring and alerting configured
- Requires backup and disaster recovery plan

## Troubleshooting Common Issues

### Database Connection Issues

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test database connectivity
npm run health-check

# Check migration status
npm run db:migrate
```

### Authentication Issues

```bash
# Verify auth secret is set
echo $BETTER_AUTH_SECRET

# Check auth configuration in health check
curl https://your-app.com/api/health/detailed
```

### Static File Issues

```bash
# Verify build completed
ls -la dist/

# Check static file serving
curl -I https://your-app.com/
```

### Performance Issues

```bash
# Check response times
time curl https://your-app.com/health.json

# Monitor Railway metrics
railway logs --follow
```

## Success Criteria

Deployment is considered successful when:

- ✅ All health checks pass
- ✅ Authentication flows work correctly
- ✅ Application functionality is fully operational
- ✅ Performance meets requirements (< 2s page load, < 100ms API)
- ✅ Security headers and HTTPS are properly configured
- ✅ Monitoring and logging are functional
- ✅ Error handling works as expected

## Final Verification

After successful deployment, verify:

1. **User Experience**: Complete user journey from sign-up to core functionality
2. **Performance**: Load testing with expected user volume
3. **Security**: Security scan and penetration testing
4. **Monitoring**: Alerts and monitoring systems functional
5. **Documentation**: Deployment process documented and accessible

---

**Deployment completed successfully when all checklist items are verified! 🎉**
