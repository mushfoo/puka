# Troubleshooting Guide

Solutions to common issues with Puka Reading Tracker.

## Quick Fixes

### App Won't Load

**Symptoms:**
- Blank screen or loading forever
- Error messages on startup
- App crashes immediately

**Solutions:**
1. **Clear Browser Cache**
   - Chrome: Settings → Privacy → Clear browsing data
   - Safari: Safari → Clear History and Website Data
   - Firefox: Options → Privacy → Clear Data
   
2. **Try Different Browser**
   - Test in Chrome, Safari, or Firefox
   - Try incognito/private browsing mode
   - Check if issue persists across browsers

3. **Check Internet Connection**
   - Ensure you have internet for initial load
   - Try refreshing the page
   - Check if other websites work

4. **Update Browser**
   - Update to latest browser version
   - Restart browser after update
   - Clear cache after update

### Slow Performance

**Symptoms:**
- App takes long time to load
- Sluggish interactions
- Delayed response to clicks

**Solutions:**
1. **Browser Optimization**
   - Close unnecessary tabs
   - Disable browser extensions temporarily
   - Clear browser cache and cookies
   - Restart browser

2. **Device Performance**
   - Close other applications
   - Check available memory
   - Restart device if needed
   - Check if device is overheating

3. **Network Issues**
   - Check internet speed
   - Try different network
   - Clear DNS cache
   - Restart router if needed

## Data Issues

### Lost Data

**Symptoms:**
- Books disappeared
- Progress reset to zero
- Reading streaks lost

**Possible Causes:**
- Browser data cleared
- Different browser/device
- Browser update
- Storage corruption

**Solutions:**
1. **Check Browser Data**
   - Verify you're using same browser
   - Check if browser data was cleared
   - Look for browser backup/sync

2. **Import Backup**
   - Find your last export file
   - Use Import → Puka Native (JSON)
   - Restore from backup if available

3. **Prevention**
   - Export data regularly (monthly)
   - Store backups in cloud storage
   - Use PWA installation for better persistence

### Cannot Import Data

**Symptoms:**
- Import button doesn't work
- Error messages during import
- File not recognized

**Solutions:**
1. **File Format Check**
   - Ensure file is CSV or JSON
   - Check file extension (.csv, .json)
   - Verify file isn't corrupted
   - Try opening file in text editor

2. **File Size**
   - Check if file is too large (>10MB)
   - Split large files into smaller parts
   - Remove unnecessary data

3. **Browser Permissions**
   - Check if file access is blocked
   - Try different browser
   - Clear browser cache
   - Disable ad blockers temporarily

### Export Not Working

**Symptoms:**
- Export button doesn't respond
- Download fails
- Empty or corrupted files

**Solutions:**
1. **Browser Settings**
   - Check download permissions
   - Clear browser cache
   - Try different browser
   - Allow file downloads

2. **Storage Space**
   - Check available disk space
   - Clear downloads folder
   - Try smaller export

3. **File Handling**
   - Try different export format
   - Check if antivirus blocking
   - Try different location

## Feature-Specific Issues

### Progress Tracking Problems

**Symptoms:**
- Progress slider not working
- Progress doesn't save
- Books don't change status

**Solutions:**
1. **Basic Fixes**
   - Refresh the page
   - Clear browser cache
   - Try different browser
   - Check JavaScript is enabled

2. **Data Validation**
   - Check if progress is within 0-100%
   - Verify book exists in library
   - Try editing book directly

3. **Browser Compatibility**
   - Update to supported browser
   - Check compatibility guide
   - Try desktop version

### Reading Streak Issues

**Symptoms:**
- Streak not updating
- "Read Today" button not working
- Streak count incorrect

**Solutions:**
1. **Time Zone Issues**
   - Check device time zone
   - Verify current date
   - Try marking again after midnight

2. **Data Synchronization**
   - Refresh page
   - Clear browser cache
   - Check if in offline mode

3. **Streak Logic**
   - Verify you haven't missed a day
   - Check if already marked today
   - Review streak calculation

### Search Not Working

**Symptoms:**
- Search returns no results
- Search is very slow
- Search doesn't update

**Solutions:**
1. **Search Query**
   - Check spelling
   - Try shorter terms
   - Search by author or title separately

2. **Data Issues**
   - Verify books exist
   - Check if search index corrupted
   - Try refreshing page

3. **Performance**
   - Clear browser cache
   - Try with fewer books
   - Check device performance

## Browser-Specific Issues

### Chrome Problems

**Common Issues:**
- Install button not appearing
- Extensions interfering
- Cache corruption

**Solutions:**
1. **Chrome Settings**
   - Check site permissions
   - Clear Chrome data
   - Reset Chrome settings
   - Try Chrome Canary

2. **Extensions**
   - Disable all extensions
   - Test in incognito mode
   - Re-enable extensions one by one

### Safari Issues

**Common Issues:**
- PWA installation problems
- File operations not working
- Performance issues

**Solutions:**
1. **Safari Settings**
   - Enable JavaScript
   - Allow pop-ups for site
   - Check privacy settings
   - Clear Safari data

2. **iOS/macOS Updates**
   - Update to latest iOS/macOS
   - Restart device
   - Check storage space

### Firefox Issues

**Common Issues:**
- Limited PWA support
- File handling differences
- Performance variations

**Solutions:**
1. **Firefox Settings**
   - Check privacy settings
   - Enable JavaScript
   - Clear Firefox data
   - Try Firefox Beta

2. **Add-ons**
   - Disable all add-ons
   - Test in safe mode
   - Check for conflicts

### Edge Issues

**Common Issues:**
- Legacy Edge problems
- File system access
- Performance concerns

**Solutions:**
1. **Edge Updates**
   - Update to Chromium Edge
   - Clear Edge data
   - Reset Edge settings

2. **Windows Updates**
   - Update Windows
   - Check Windows permissions
   - Restart Windows

## Mobile Issues

### iOS Problems

**Common Issues:**
- Add to Home Screen not working
- App not opening
- Performance issues

**Solutions:**
1. **iOS Settings**
   - Update iOS
   - Clear Safari cache
   - Check storage space
   - Restart device

2. **Safari Settings**
   - Enable JavaScript
   - Allow website data
   - Check privacy settings

### Android Issues

**Common Issues:**
- PWA installation failing
- Performance problems
- File access issues

**Solutions:**
1. **Android Settings**
   - Update Android
   - Clear Chrome data
   - Check storage space
   - Restart device

2. **Chrome Settings**
   - Update Chrome
   - Check permissions
   - Clear Chrome cache

## Advanced Troubleshooting

### JavaScript Console

**Accessing Console:**
- **Chrome**: F12 → Console tab
- **Safari**: Safari → Develop → Show Console
- **Firefox**: F12 → Console tab

**What to Look For:**
- Red error messages
- Network failures
- JavaScript errors
- Storage issues

**Common Errors:**
- "Cannot read property" - Data corruption
- "Network error" - Connection issues
- "Storage quota exceeded" - Storage full

### Network Issues

**Testing Network:**
1. Check if other websites work
2. Try different network
3. Clear DNS cache
4. Restart router

**Checking Connectivity:**
- Use browser developer tools
- Check Network tab
- Look for failed requests
- Verify file downloads

### Storage Problems

**Checking Storage:**
- Browser settings → Storage
- Check available space
- Clear unnecessary data
- Check quotas

**Storage Solutions:**
- Clear browser cache
- Delete unnecessary files
- Use external storage
- Try different browser

## Error Messages

### Common Error Messages

**"Failed to load data"**
- Clear browser cache
- Check internet connection
- Try different browser
- Verify file permissions

**"Import failed"**
- Check file format
- Verify file size
- Try different browser
- Check file encoding

**"Export failed"**
- Check disk space
- Verify download permissions
- Try different location
- Clear browser cache

**"Cannot save progress"**
- Check storage space
- Clear browser cache
- Try different browser
- Verify JavaScript enabled

### Error Resolution Steps

1. **Note Error Details**
   - Screenshot error message
   - Note when it occurred
   - Check browser console
   - Document steps to reproduce

2. **Try Basic Fixes**
   - Clear browser cache
   - Try different browser
   - Restart browser
   - Check internet connection

3. **Advanced Solutions**
   - Check browser console
   - Verify file permissions
   - Test in incognito mode
   - Reset browser settings

## Prevention Tips

### Regular Maintenance

**Monthly Tasks:**
- Export data backup
- Clear browser cache
- Update browser
- Check for new features

**Weekly Tasks:**
- Review reading progress
- Check for issues
- Update book information
- Verify streak accuracy

### Data Protection

**Backup Strategy:**
- Export data monthly
- Store in cloud storage
- Keep multiple backups
- Test import process

**Best Practices:**
- Use supported browsers
- Keep browsers updated
- Avoid clearing browser data
- Use PWA installation

### Performance Optimization

**Browser Optimization:**
- Close unnecessary tabs
- Disable unused extensions
- Clear cache regularly
- Update regularly

**Device Optimization:**
- Keep device updated
- Monitor storage space
- Close unused apps
- Restart periodically

## When to Seek Help

### Before Contacting Support

**Try These First:**
1. Check this troubleshooting guide
2. Review FAQ section
3. Try different browser
4. Clear browser cache

**Information to Gather:**
- Browser name and version
- Operating system
- Device type
- Specific error messages
- Steps to reproduce issue

### Contacting Support

**How to Report Issues:**
1. Visit [Support Page](support.md)
2. Include detailed description
3. Attach screenshots if helpful
4. Provide browser/device info

**What to Include:**
- Clear description of problem
- Steps to reproduce
- Browser and device details
- Error messages
- Screenshots if relevant

### Community Resources

**Additional Help:**
- User forums
- Community discussions
- Tips and tricks
- Feature requests

## Recovery Procedures

### Complete Data Recovery

**If All Data is Lost:**
1. Check for backup files
2. Look for browser sync data
3. Try different browsers
4. Check cloud storage
5. Import from other platforms

**Fresh Start:**
1. Export any remaining data
2. Clear all browser data
3. Restart browser
4. Re-import data
5. Verify functionality

### Partial Data Recovery

**If Some Data Remains:**
1. Export current data
2. Try to import missing data
3. Manually re-enter if needed
4. Verify all functions work
5. Create fresh backup

## Prevention Strategies

### Regular Backups

**Backup Schedule:**
- Weekly for active users
- Monthly for casual users
- Before major changes
- After significant updates

**Backup Locations:**
- Local device storage
- Cloud storage services
- External drives
- Multiple locations

### Browser Maintenance

**Regular Tasks:**
- Update browser monthly
- Clear cache weekly
- Check permissions
- Monitor performance

**Settings Management:**
- Document important settings
- Screenshot configurations
- Note customizations
- Track changes

---

**Still having issues?** Visit our [Support Page](support.md) for additional help options.