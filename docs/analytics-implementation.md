# Analytics Implementation Documentation

## Overview

This document describes the analytics functionality added to Puka Reading Tracker as part of the production environment configuration improvements.

## Purpose

The analytics implementation provides optional, privacy-focused usage tracking to help understand how users interact with Puka while maintaining the app's core privacy principles.

## Implementation Details

### Environment Variables

```bash
# Analytics Configuration (Optional)
VITE_ANALYTICS_ENABLED=true
VITE_PLAUSIBLE_DOMAIN=puka-reading-tracker.up.railway.app
VITE_ANALYTICS_OPT_OUT_AVAILABLE=true
```

### Key Features

1. **Optional Analytics**: Analytics are disabled by default and require explicit configuration
2. **Privacy-Focused**: Uses Plausible Analytics (privacy-first alternative to Google Analytics)
3. **User Control**: Users can opt-out via the analytics opt-out component
4. **Local Development**: Analytics are automatically disabled in local development

### Components Added

- `src/components/analytics/AnalyticsOptOut.tsx` - User opt-out interface
- `src/utils/analytics.ts` - Analytics utility functions
- Tests for analytics functionality

### Privacy Considerations

- **No Personal Data**: Only aggregated usage patterns are tracked
- **User Consent**: Clear opt-out mechanism available
- **GDPR Compliant**: Uses privacy-focused Plausible Analytics
- **Local Development**: No tracking in development environment

### Configuration

Analytics are only enabled when:
1. `VITE_ANALYTICS_ENABLED=true` is set
2. `VITE_PLAUSIBLE_DOMAIN` is configured
3. User has not opted out
4. Not running in local development mode

### User Experience

- Analytics run silently in the background when enabled
- Users can access opt-out controls via the analytics settings
- No impact on app performance or functionality
- Completely optional and can be disabled per environment

## Deployment Considerations

- Analytics should only be enabled in production environments
- Ensure Plausible Analytics domain is correctly configured
- Test opt-out functionality before production deployment
- Document analytics policy in user-facing documentation if enabled

## Compliance

This implementation maintains Puka's privacy-first approach:
- No tracking cookies
- No personal data collection
- Transparent opt-out process
- Minimal data collection scope