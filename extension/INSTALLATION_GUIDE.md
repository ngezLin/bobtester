# BobTester Recorder Extension - Installation Guide

## Problem
Chrome extensions cannot be loaded from compressed/zip folders. The error "Manifest file is missing or unreadable" occurs when trying to load from a compressed location.

## Solution: Load Extension in Developer Mode

### Step 1: Extract the Extension (if compressed)
If you downloaded the extension as a zip file:
1. Extract the entire `extension` folder to a permanent location
2. **Important**: Do NOT load from the Downloads folder or any temporary location
3. Recommended location: `C:\Users\YourUsername\Documents\bobtester-extension\`

### Step 2: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load Unpacked Extension**
   - Click the "Load unpacked" button
   - Navigate to the **extension** folder (the one containing manifest.json)
   - Select the folder and click "Select Folder"

### Step 3: Verify Installation

After loading, you should see:
- ✅ Extension name: "BobTester Recorder"
- ✅ Version: 1.0.0
- ✅ Extension icon in Chrome toolbar
- ✅ No errors displayed

### Current Extension Location
The extension files are located at:
```
c:\laragon\www\bobtester\extension\
```

**To load this extension:**
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Navigate to: `c:\laragon\www\bobtester\extension`
5. Click "Select Folder"

## Troubleshooting

### Error: "Manifest file is missing or unreadable"
**Cause**: Trying to load from a compressed folder or wrong directory

**Solution**: 
- Make sure you're selecting the `extension` folder (not a parent folder)
- The folder must contain `manifest.json` directly
- Do not load from zip/compressed folders

### Error: "Failed to load extension"
**Cause**: Missing files or incorrect folder structure

**Solution**:
- Verify all files exist:
  - manifest.json
  - background.js
  - content.js
  - popup.html
  - popup.js
  - icons/icon16.png
  - icons/icon48.png
  - icons/icon128.png

### Extension Icon Not Showing
**Cause**: Icon files missing or incorrect paths

**Solution**:
- Check that all icon files exist in the `icons` folder
- Verify icon paths in manifest.json match actual file locations

## Development Notes

- The extension runs in developer mode
- Changes to files require clicking the refresh icon on the extension card
- Check the extension's console for any runtime errors
- Use Chrome DevTools to debug popup.html and content scripts

## Next Steps

After successful installation:
1. Click the extension icon in Chrome toolbar
2. The popup should open showing recording controls
3. Navigate to a webpage to start recording interactions
4. Recorded actions will be sent to the BobTester API

## Support

If you continue to experience issues:
1. Check Chrome's extension error messages
2. Open DevTools console for the extension
3. Verify the API endpoint is accessible
4. Check network requests in DevTools