# Import & Export

Learn how to import books from other platforms and export your data for backup and portability.

## Overview

### Data Portability

**Why Import/Export:**
- Backup your reading data
- Transfer data between devices
- Import books from other platforms
- Maintain control over your data

**Supported Formats:**
- **CSV**: Compatible with spreadsheet applications
- **JSON**: Technical format with full data preservation
- **Goodreads**: Direct import from Goodreads exports

## Importing Data

### From Goodreads

**Step 1: Export from Goodreads**
1. Go to Goodreads.com
2. Navigate to "My Books"
3. Click "Import and Export"
4. Select "Export Library" 
5. Download your CSV file

**Step 2: Import to Puka**
1. Click **"Import"** button in Puka
2. Select **"Goodreads Format"**
3. Choose your downloaded CSV file
4. Review the import preview
5. Click **"Import Books"**

**What Gets Imported:**
- Book titles and authors
- Reading status (read, currently-reading, to-read)
- Ratings (1-5 stars)
- Date read (for finished books)
- Shelves (imported as genres)
- Personal notes/reviews

### From Other Platforms

**CSV Format Requirements:**
- Must include "Title" and "Author" columns
- Optional: "Status", "Rating", "Notes", "Genre"
- Status values: "want_to_read", "currently_reading", "finished"

**Supported Platforms:**
- **StoryGraph**: Export as CSV, import as generic CSV
- **LibraryThing**: Export data, format as CSV
- **Bookly**: Export reading data
- **Custom Lists**: Any spreadsheet with book data

### Custom CSV Import

**Creating Your Own CSV:**
1. Use spreadsheet application (Excel, Google Sheets)
2. Create columns for book data
3. Export as CSV file
4. Import using "Custom CSV" option

**Column Mapping:**
- Title → Book Title
- Author → Author Name
- Status → Reading Status
- Rating → Book Rating (1-5)
- Notes → Personal Notes
- Genre → Book Genre

## Exporting Data

### Export Options

**Puka Native (JSON):**
- Complete data preservation
- All book information included
- Reading streaks and history
- Best for backing up to re-import to Puka

**CSV Format:**
- Compatible with spreadsheet applications
- Easy to view and edit
- Works with other reading apps
- Good for data analysis

**Goodreads Compatible:**
- Formatted for Goodreads import
- Includes required Goodreads columns
- Easy migration to Goodreads

### Export Process

**Step 1: Access Export**
1. Click **"Export"** button in Puka
2. Choose your desired format
3. Select export options

**Step 2: Download Data**
1. Click **"Download"** button
2. File downloads to your device
3. Save in a secure location

**Step 3: Verify Export**
1. Open downloaded file
2. Verify all data is included
3. Test import if needed

## Data Backup Strategy

### Regular Backups

**Frequency Recommendations:**
- **Monthly**: Regular users
- **Weekly**: Heavy users with frequent updates
- **Before Major Changes**: When reorganizing library

**Storage Options:**
- **Local Storage**: Save to your device
- **Cloud Storage**: Google Drive, Dropbox, OneDrive
- **Multiple Locations**: Keep redundant backups

### Backup Workflow

**Simple Backup Routine:**
1. Export as JSON (full data)
2. Save with date in filename
3. Store in cloud storage
4. Keep last 3 months of backups

**Advanced Backup:**
1. Export in multiple formats
2. Include reading streak data
3. Document any custom workflows
4. Test restore process periodically

## Data Migration

### Moving to New Device

**Step 1: Export from Old Device**
1. Export all data as JSON
2. Include reading streaks
3. Save to accessible location

**Step 2: Import to New Device**
1. Set up Puka on new device
2. Import JSON file
3. Verify all data transferred
4. Test functionality

### Platform Migration

**Leaving Puka:**
1. Export as CSV for maximum compatibility
2. Include all book data
3. Check receiving platform's import requirements
4. Test import process

**Joining Puka:**
1. Export data from current platform
2. Format as CSV if needed
3. Use appropriate import option
4. Review imported data for accuracy

## Advanced Import Features

### Streak Data Import

**Reading History:**
- Imports reading periods from book data
- Calculates streaks based on reading dates
- Preserves reading day history

**Streak Calculation:**
- Automatically calculates current streak
- Determines longest streak from history
- Updates streak display

### Data Validation

**Import Checks:**
- Validates required fields
- Checks for duplicate books
- Verifies data formats
- Reports any issues

**Error Handling:**
- Skips invalid entries
- Reports problematic data
- Provides import summary
- Allows manual correction

## Troubleshooting Import/Export

### Common Import Issues

**File Format Problems:**
- Ensure CSV is properly formatted
- Check for special characters
- Verify column headers
- Use UTF-8 encoding

**Data Mapping Issues:**
- Review column mapping
- Check status values
- Verify date formats
- Confirm rating scales

### Export Issues

**Download Problems:**
- Check browser permissions
- Verify file size limits
- Try different browser
- Clear browser cache

**File Corruption:**
- Re-export if file seems corrupted
- Try different format
- Check file size
- Verify file opens correctly

## Best Practices

### Import Best Practices

**Before Importing:**
- Backup current data first
- Review source data quality
- Plan for duplicates
- Test with small sample

**During Import:**
- Review import preview
- Check mapping accuracy
- Monitor for errors
- Verify important books

**After Import:**
- Review imported data
- Check for duplicates
- Verify reading streaks
- Update any incorrect information

### Export Best Practices

**Regular Exports:**
- Set up routine backup schedule
- Use consistent naming conventions
- Store in multiple locations
- Test imports periodically

**Format Selection:**
- JSON for complete backups
- CSV for platform compatibility
- Goodreads format for migration
- Multiple formats for flexibility

## Data Privacy

### Local Storage

**Your Data Stays Local:**
- All data stored on your device
- No cloud storage required
- Full control over your information
- Privacy by design

**Data Sharing:**
- Export only when you choose
- No automatic data sharing
- Control over what gets exported
- Selective data sharing options

### Security Considerations

**Backup Security:**
- Store backups securely
- Use encrypted storage if sensitive
- Limit access to backup files
- Regular backup rotation

## Integration with Other Features

### Streak Preservation

**Maintaining Streaks:**
- Export includes streak data
- Reading history preserved
- Streak calculations maintained
- Continuity across devices

### Progress Tracking

**Reading Progress:**
- Current progress exported
- Reading history maintained
- Status transitions preserved
- Timeline integrity kept

### Book Management

**Complete Library:**
- All books included in export
- Notes and ratings preserved
- Status history maintained
- Organizational structure kept

## Next Steps

- **[PWA Installation](pwa-installation.md)** - Install Puka as a mobile app
- **[Browser Compatibility](browser-compatibility.md)** - Check device compatibility
- **[Troubleshooting](../troubleshooting.md)** - Solve common issues