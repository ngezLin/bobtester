# BobTester Recording Setup Guide

This guide explains how to record Playwright tests using BobTester with automated browser extension support.

## 🎯 Overview

BobTester now supports **two recording methods**:

1. **🔌 Browser Extension (Recommended)** - Automated, one-click recording
2. **💻 Manual Mode** - Traditional Playwright Codegen approach

## 🚀 Quick Start

### Option 1: Browser Extension (Automated)

#### Installation

1. **Download the Extension**
   ```bash
   # The extension is located in the /extension folder
   cd extension
   ```

2. **Install in Chrome/Edge**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the `extension` folder
   - Pin the extension to your toolbar

3. **Install in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `extension/manifest.json`

#### Usage

1. Go to BobTester's Record page
2. Select "Extension" mode (should auto-detect if installed)
3. Enter your target URL
4. Click "Start Extension Recorder"
5. Perform your actions in the opened tab
6. Click "Get Code" to import the recorded actions
7. Save your test case

### Option 2: Manual Mode (Playwright Codegen)

#### Prerequisites

```bash
# Install Playwright (if not already installed)
npm install -D @playwright/test

# Install browsers
npx playwright install
```

#### Usage

1. Go to BobTester's Record page
2. Select "Manual" mode
3. Enter your target URL
4. Click "Show Manual Instructions"
5. Copy the command: `npx playwright codegen https://your-url.com`
6. Run it in your terminal
7. Perform your actions
8. Copy the generated code from Playwright Inspector
9. Paste into BobTester and save

## 📁 Project Structure

```
bobtester/
├── extension/                 # Browser extension
│   ├── manifest.json         # Extension configuration
│   ├── background.js         # Service worker (recording logic)
│   ├── content.js           # Content script (captures actions)
│   ├── popup.html           # Extension popup UI
│   ├── popup.js             # Popup logic
│   ├── icons/               # Extension icons
│   └── README.md            # Extension documentation
├── web/
│   └── src/
│       ├── app/
│       │   └── record/
│       │       └── page.tsx  # Recording page with extension integration
│       └── types/
│           └── chrome.d.ts   # Chrome API type definitions
└── api/
    └── src/
        ├── controllers/
        │   └── caseController.ts  # Simplified recording endpoint
        └── services/
            └── playwrightService.ts  # Test execution (still uses Browserless for cloud)
```

## 🔧 Technical Details

### Extension Architecture

- **Manifest V3** - Modern Chrome extension format
- **Service Worker** - Background script for recording logic
- **Content Script** - Injected into pages to capture user actions
- **Smart Selectors** - Automatically generates optimal CSS selectors

### Captured Actions

The extension records:
- ✅ Page navigation (`goto`)
- ✅ Button clicks (`click`)
- ✅ Text input (`fill`)
- ✅ Dropdown selections (`select`)
- ✅ Checkbox/Radio interactions (`check`/`uncheck`)
- ✅ Keyboard events (`press`)
- ✅ URL changes in SPAs

### Selector Priority

1. `id` attribute
2. `name` attribute
3. `class` names
4. `data-testid` attribute
5. `aria-label` attribute
6. `placeholder` attribute
7. Text content (for buttons/links)
8. Generated CSS path (fallback)

## 🌐 Deployment Considerations

### Cloud Deployments (Vercel, Netlify, etc.)

- **Recording**: Always uses local device (extension or manual)
- **Test Execution**: Can use Browserless.io or local Playwright
- **No Browserless API key needed** for recording anymore!

### Local Development

- **Recording**: Extension or Playwright Codegen on your machine
- **Test Execution**: Local Playwright installation

## 🔐 Security & Privacy

The browser extension:
- ✅ Only records when explicitly started
- ✅ Does NOT send data to external servers
- ✅ Does NOT track browsing activity
- ✅ Only communicates with BobTester web app when integrated
- ✅ All data stays local until you save the test case

## 🐛 Troubleshooting

### Extension Not Detected

1. Make sure the extension is installed and enabled
2. Refresh the BobTester page
3. Check browser console for errors
4. Try reloading the extension in `chrome://extensions/`

### Recording Not Working

1. Check if the red "Recording..." indicator appears on the page
2. Open DevTools Console and look for `[BobTester Recorder]` logs
3. Make sure you clicked "Start Recording" in the extension popup
4. Try switching to Manual mode as a fallback

### Selectors Not Working

1. Some dynamic sites use complex selectors
2. Add `data-testid` attributes to your app for better reliability
3. Manually edit the generated code if needed
4. Use Playwright's built-in selector tools for debugging

### TypeScript Errors

If you see Chrome API type errors:
1. Make sure `web/src/types/chrome.d.ts` exists
2. Restart your TypeScript server
3. Check that the file is included in `tsconfig.json`

## 📝 Configuration

### Extension ID

After publishing the extension to Chrome Web Store, update the extension ID in:

```typescript
// web/src/app/record/page.tsx
const EXTENSION_ID = "YOUR_EXTENSION_ID_HERE";
```

For development, you can find the extension ID in `chrome://extensions/` after loading it unpacked.

### Manifest Configuration

The extension manifest (`extension/manifest.json`) includes:
- Required permissions for recording
- Content script injection rules
- Background service worker configuration
- Web accessible resources

## 🚢 Publishing the Extension

### Chrome Web Store

1. Create icons (16x16, 48x48, 128x128) in `extension/icons/`
2. Update version in `manifest.json`
3. Zip the `extension` folder
4. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
5. Fill in store listing details
6. Submit for review

### Firefox Add-ons

1. Same icon requirements
2. Zip the `extension` folder
3. Upload to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
4. Fill in listing details
5. Submit for review

## 🎓 Best Practices

1. **Use Extension for Speed** - Faster than manual Playwright Codegen
2. **Add data-testid Attributes** - Makes selectors more reliable
3. **Review Generated Code** - Always check before saving
4. **Test Your Tests** - Run them to ensure they work
5. **Keep Extension Updated** - Check for updates regularly

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Development](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [BobTester Documentation](https://github.com/yourusername/bobtester)

## 🤝 Contributing

To contribute to the extension:

1. Fork the repository
2. Make your changes in the `extension/` folder
3. Test thoroughly in both Chrome and Firefox
4. Submit a pull request with a clear description

## 📄 License

MIT License - See LICENSE file for details

## 💬 Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/bobtester/issues
- Documentation: https://bobtester.com/docs
- Community: https://discord.gg/bobtester