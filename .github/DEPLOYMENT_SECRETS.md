# GitHub Secrets Configuration for Puka Deployment

This document outlines all the GitHub Secrets required for the automated deployment pipeline.

## Required Secrets

### 1. Railway Deployment Secrets

#### `RAILWAY_TOKEN`

- **Description**: Railway API token for authentication
- **How to obtain**:
  1. Log in to [Railway Dashboard](https://railway.app)
  2. Go to Account Settings → Tokens
  3. Create a new token with deployment permissions
  4. Copy the token value
- **Required for**: Deployment workflow
- **Security level**: Critical

#### `RAILWAY_PROJECT_ID`

- **Description**: Unique identifier for your Railway project
- **How to obtain**:
  1. Open your project in Railway Dashboard
  2. Go to Settings → General
  3. Copy the Project ID
- **Required for**: Deployment workflow
- **Security level**: High

### 2. Supabase Secrets

#### `SUPABASE_DB_URL`

- **Description**: Direct database connection URL for migrations
- **How to obtain**:
  1. Log in to [Supabase Dashboard](https://app.supabase.com)
  2. Select your project
  3. Go to Settings → Database
  4. Copy the "Direct connection" URL
  5. Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- **Required for**: Migration workflows
- **Security level**: Critical
- **Note**: This should use the direct connection, not the pooled connection

#### `VITE_SUPABASE_URL`

- **Description**: Supabase project URL
- **How to obtain**:
  1. From Supabase Dashboard → Settings → API
  2. Copy the "Project URL"
  3. Format: `https://[PROJECT-REF].supabase.co`
- **Required for**: Application runtime
- **Security level**: Medium (public)

#### `VITE_SUPABASE_ANON_KEY`

- **Description**: Supabase anonymous/public key
- **How to obtain**:
  1. From Supabase Dashboard → Settings → API
  2. Copy the "anon public" key
- **Required for**: Application runtime
- **Security level**: Medium (public)

## Setting up Secrets

### Via GitHub UI

1. Navigate to your repository on GitHub
2. Go to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with its name and value
5. Click "Add secret"

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# brew install gh (macOS)
# or download from https://cli.github.com/

# Authenticate
gh auth login

# Add secrets
gh secret set RAILWAY_TOKEN
gh secret set RAILWAY_PROJECT_ID
gh secret set SUPABASE_DB_URL
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_ANON_KEY
```

## Security Best Practices

### 1. Secret Rotation

- **Railway Token**: Rotate every 90 days
- **Supabase DB URL**: Rotate password every 60 days
- **API Keys**: Review and rotate annually

### 2. Access Control

- Limit repository access to trusted team members
- Use branch protection rules
- Enable 2FA for all contributors
- Audit secret access logs regularly

### 3. Secret Management

```bash
# Never commit secrets to the repository
# Add to .gitignore:
.env
.env.*
!.env.example

# Use environment-specific secrets
# Production: PROD_SUPABASE_URL
# Staging: STAGING_SUPABASE_URL
```

### 4. Monitoring

- Enable GitHub secret scanning
- Set up alerts for failed deployments
- Monitor Railway and Supabase dashboards
- Review deployment logs regularly

## Environment Variables

The deployment workflow automatically sets these environment variables in Railway:

```bash
NODE_ENV=production
VITE_APP_ENV=production
VITE_APP_VERSION=[git-sha]
VITE_SUPABASE_URL=[from-secret]
VITE_SUPABASE_ANON_KEY=[from-secret]
DEPLOYMENT_ID=[workflow-run-id]
GIT_COMMIT_SHA=[commit-sha]
GIT_COMMIT_MESSAGE=[commit-message]
```

## Troubleshooting

### Common Issues

1. **Deployment fails with authentication error**

   - Verify Railway token is valid
   - Check token permissions
   - Ensure project ID is correct

2. **Migration fails**

   - Verify Supabase DB URL is correct
   - Check database is accessible
   - Ensure migrations are valid SQL

3. **Build fails**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Debug Commands

```bash
# Test Railway connection
railway whoami

# Test Supabase connection
supabase db remote status --db-url "$SUPABASE_DB_URL"

# Verify environment variables
railway variables

# Check deployment status
railway status
```

## Security Incident Response

If a secret is compromised:

1. **Immediately**:

   - Revoke the compromised token/key
   - Generate a new secret
   - Update GitHub Secrets
   - Trigger a new deployment

2. **Within 24 hours**:

   - Audit access logs
   - Check for unauthorized deployments
   - Review security practices
   - Document the incident

3. **Follow-up**:
   - Implement additional security measures
   - Update this documentation
   - Train team on security best practices

## Contact

For security concerns or questions:

- Create a private security advisory in the repository
- Contact the repository maintainers directly
- Use encrypted communication for sensitive information

