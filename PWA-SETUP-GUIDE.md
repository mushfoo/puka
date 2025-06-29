# PWA Setup Guide - Puka Reading Tracker

## Overview

This document outlines the Progressive Web App (PWA) implementation for the Puka Reading Tracker, including setup, features, and deployment considerations.

## PWA Components

### 1. Web App Manifest (`public/manifest.json`)

The manifest defines how the app appears when installed:

```json
{
  "name": "Puka Reading Tracker",
  "short_name": "Puka",
  "description": "A mobile-first reading tracker with progress management and book organization",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary"
}
```

#### Key Features:
- **Standalone Display**: Runs without browser UI
- **Portrait Orientation**: Optimized for mobile reading experience
- **App Shortcuts**: Quick actions for adding books and viewing progress
- **Comprehensive Icons**: 8 different sizes (72px to 512px)
- **Categorization**: Listed under "books", "productivity", "lifestyle"

### 2. Service Worker (`public/sw.js`)

Provides offline functionality and caching:

#### Cache Strategy:
- **Static Cache**: Core app files (HTML, CSS, JS)
- **Dynamic Cache**: API responses and user data
- **Cache-First**: Serves from cache, falls back to network

#### Features:
- **Offline Support**: App works without internet connection
- **Background Sync**: Syncs data when connection is restored
- **Push Notifications**: Ready for reading reminders (future feature)
- **Update Management**: Prompts user for app updates

### 3. App Icons (`public/icons/`)

Icon set includes:
- 72x72, 96x96, 128x128, 144x144px (Android)
- 152x152, 192x192px (iOS, Android)
- 384x384, 512x512px (High-resolution displays)

**Note**: Current icons are SVG placeholders. For production, replace with proper PNG files.

## Installation Requirements

### Browser Support

- **Chrome/Edge**: Full PWA support
- **Firefox**: Manifest support, limited install prompt
- **Safari**: Basic PWA features, iOS 14.3+ for full support

### Installation Criteria

PWA becomes installable when:
1. ✅ Served over HTTPS (localhost exempt)
2. ✅ Has valid manifest with required fields
3. ✅ Has registered service worker
4. ✅ Service worker has fetch event handler
5. ✅ App icons provided in manifest

## Implementation Details

### HTML Integration (`index.html`)

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- PWA Meta Tags -->
<meta name="theme-color" content="#3b82f6" />
<meta name="description" content="..." />

<!-- Apple PWA Tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Puka" />
<link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
```

### Service Worker Registration (`src/main.tsx`)

```typescript
// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      // Handle updates
      registration.addEventListener('updatefound', () => {
        // Notify user of updates
      });
    });
}
```

## PWA Features

### Installability

Users can install the app:
- **Android**: "Add to Home Screen" prompt
- **iOS**: Share menu → "Add to Home Screen"
- **Desktop**: Install button in address bar (Chrome/Edge)

### Offline Functionality

- **Core App**: Works offline via service worker cache
- **Data Persistence**: Uses localStorage for book data
- **Graceful Degradation**: Shows cached content when offline

### Native-like Experience

- **Standalone Mode**: No browser UI when launched
- **Splash Screen**: Auto-generated from manifest
- **Status Bar Styling**: Matches app theme
- **Shortcuts**: Direct actions from home screen

## Deployment Considerations

### HTTPS Requirement

PWAs require HTTPS in production:
- Use SSL certificates
- Consider CDN with HTTPS
- Service workers won't register over HTTP

### Performance Optimization

1. **Critical Resource Caching**: Cache essential files
2. **Lazy Loading**: Load non-critical resources on demand
3. **Compression**: Enable gzip/brotli compression
4. **Image Optimization**: Optimize icon files

### Testing

Use Lighthouse to audit PWA compliance:
```bash
# Chrome DevTools → Lighthouse → PWA
# Check for:
# - Installable
# - PWA Optimized
# - Fast and reliable
```

## Browser-Specific Considerations

### iOS Safari

- Requires iOS 14.3+ for full PWA support
- Limited service worker functionality
- No install prompt (manual installation only)
- Standalone mode support

### Android Chrome

- Full PWA support
- Install prompt available
- Background sync supported
- Rich notification support

### Desktop Browsers

- Chrome/Edge: Full PWA support with install prompt
- Firefox: Limited PWA features
- Safari: Basic PWA support

## Performance Metrics

Target PWA metrics:
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1

## Security Considerations

### Service Worker Security

- Service workers run in separate thread
- Limited access to DOM and main thread
- Secure context required (HTTPS)

### Data Privacy

- All data stored locally (localStorage)
- No external data transmission
- User has full control over data

## Future Enhancements

### Planned PWA Features

1. **Push Notifications**: Reading reminders and goal alerts
2. **Background Sync**: Sync reading progress across devices
3. **Share Target**: Accept shared links to add books
4. **Shortcuts API**: Dynamic shortcuts based on reading habits
5. **Badging API**: Show unread book count on app icon

### Advanced PWA Features

- **Web Share API**: Share reading progress
- **File System Access**: Direct file import/export
- **Persistent Storage**: Prevent data eviction
- **Install Prompt**: Custom install experience

## Troubleshooting

### Common Issues

1. **Service Worker Not Registering**
   - Check HTTPS requirement
   - Verify file path (`/sw.js`)
   - Check browser console for errors

2. **App Not Installable**
   - Verify manifest validity
   - Check icon paths
   - Ensure service worker is active

3. **Offline Not Working**
   - Check cache strategy
   - Verify fetch event handler
   - Test cache population

### Debug Tools

- **Chrome DevTools**: Application tab → Service Workers
- **Firefox DevTools**: Application → Service Workers
- **Lighthouse**: PWA audit and recommendations

## Maintenance

### Regular Tasks

1. **Update Service Worker**: Version cache names
2. **Test Offline Functionality**: Verify cache strategy
3. **Monitor Performance**: Check Core Web Vitals
4. **Update Icons**: Replace placeholders with branded icons
5. **Audit PWA Compliance**: Regular Lighthouse checks