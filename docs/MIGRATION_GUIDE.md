# Puka Reading Tracker Migration Guide

## Overview

Puka now uses a cloud database for data storage with intelligent offline fallback. This migration guide helps you understand the changes and ensures your existing data is preserved.

## What Changed

### Storage Architecture
- **Before**: Data stored only in browser's localStorage
- **After**: Cloud database storage with automatic fallback to localStorage when offline
- **Benefits**: Cross-device sync, data persistence, better performance

### Key Improvements
- ✅ **Data Synchronization**: Your books sync across all devices
- ✅ **Enhanced Security**: Encrypted cloud storage with user authentication  
- ✅ **Offline Support**: Full functionality when database is unavailable
- ✅ **Performance**: Faster search, filtering, and large dataset handling
- ✅ **Reliability**: Automatic backup and data recovery

## Migration Process

### Automatic Migration
When you first sign in after the update, Puka will:

1. **Detect Local Data**: Check for existing books, streaks, and settings
2. **Show Migration Options**: Present migration choices clearly
3. **Transfer Data**: Move your data to the cloud database safely
4. **Verify Transfer**: Confirm all data migrated correctly
5. **Clean Up**: Remove local storage after successful migration

### Migration Options

#### Option 1: Migrate to Cloud (Recommended)
```
✅ All your books and reading history move to the cloud
✅ Data syncs across devices automatically  
✅ Enhanced performance and search capabilities
✅ Automatic backup and recovery
```

#### Option 2: Export Before Migration
```
📁 Download your data as CSV/JSON backup
📁 Keep local copy for your records
📁 Then proceed with cloud migration
```

#### Option 3: Continue with Local Storage
```
📱 Keep using browser storage only
📱 No cross-device sync
📱 Manual backup/export required
```

## Step-by-Step Migration

### 1. Backup Your Data (Recommended)
Before migrating, create a backup:

1. Open Puka in your browser
2. Click **Export** button
3. Choose **JSON** format for complete backup
4. Save the file to your computer

### 2. Sign In and Migrate
1. Refresh the Puka app
2. Click **Sign In** when prompted  
3. Create account or use existing credentials
4. If you have local data, you'll see migration options
5. Click **Migrate to Cloud** (recommended)
6. Wait for migration to complete
7. Verify all your books appear correctly

### 3. Verify Migration Success
After migration, check:
- [ ] All books appear with correct titles and authors
- [ ] Progress percentages are accurate
- [ ] Reading streaks are preserved
- [ ] Settings (theme, goals) are maintained
- [ ] Notes and custom data are intact

## Troubleshooting

### Migration Failed
**Problem**: Migration process showed errors
**Solution**: 
1. Try refreshing and migrating again
2. Check your internet connection
3. Contact support with error details

### Missing Books
**Problem**: Some books didn't migrate
**Solution**:
1. Check your export backup
2. Manually re-add missing books
3. Use import feature with your backup file

### Duplicate Books
**Problem**: Books appear twice after migration
**Solution**:
1. Use the search feature to find duplicates
2. Delete duplicate entries manually
3. Keep the version with more complete data

### Performance Issues
**Problem**: App feels slower after migration
**Solution**:
1. Clear browser cache and refresh
2. Check network connection
3. Large datasets may take time to sync initially

## Database Connection Issues

### Offline Mode
When database is unavailable:
- App automatically switches to localStorage mode
- All functionality remains available
- Data syncs when connection restored
- Yellow indicator shows offline status

### Network Problems
If you experience connection issues:
1. Check internet connectivity
2. Try refreshing the page
3. App will fallback to local storage automatically
4. Data syncs when connection restored

## Data Recovery

### Restore from Backup
If you need to restore from a backup:

1. **Export Format**: Use the JSON export from before migration
2. **Import Process**: 
   - Click **Import** button
   - Select your backup file
   - Choose import options:
     - ✅ **Merge with existing**: Keeps current data, adds from backup
     - ✅ **Replace all**: Replaces current data with backup
     - ✅ **Validate data**: Checks for errors before import

### Multiple Device Setup
To set up Puka on additional devices:

1. Install Puka on new device
2. Sign in with same account
3. Your data will sync automatically
4. No migration needed on additional devices

## Version Compatibility

### Supported Versions
- **v2.0+**: Full cloud database support
- **v1.x**: Local storage only (migration available)
- **Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)

### Breaking Changes
- Authentication now required for cloud sync
- Local-only mode available but limited
- Some advanced features require database connection

## Privacy and Security

### Data Encryption
- All data encrypted in transit and at rest
- User authentication required for access
- No data sharing with third parties

### Account Management
- Create account with email/password
- Reset password functionality available
- Account deletion removes all cloud data

## Getting Help

### Common Issues
- **Migration Questions**: Check this guide first
- **Technical Problems**: Clear browser cache, refresh page
- **Data Issues**: Use export/import for recovery

### Support Channels
- **Documentation**: Check `/docs` folder for detailed guides
- **GitHub Issues**: Report bugs and request features
- **Troubleshooting**: See `TROUBLESHOOTING.md` for detailed solutions

## Benefits After Migration

### Cross-Device Sync
- Start reading on phone, continue on desktop
- Real-time sync across all devices
- Consistent experience everywhere

### Enhanced Performance  
- Faster search across large book collections
- Improved filtering and sorting
- Better handling of reading streaks

### Data Security
- Automatic cloud backups
- Protection against device loss
- Secure user authentication

### Future-Proof
- Regular database backups
- Scalable for growing book collections
- Foundation for upcoming features

---

**Need more help?** Check the [Troubleshooting Guide](./TROUBLESHOOTING.md) or create an issue on GitHub.