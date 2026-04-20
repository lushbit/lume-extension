# Disclaimer

This extension is built for [Lume](https://github.com/lushbit/lume).  
You can use it with the public instance: [https://lume-reader.vercel.app](https://lume-reader.vercel.app) 

# Lume Browser Extension

Read supported articles in Lume directly from your browser.

This extension checks the current page with Lume's extraction API. If the page is a valid readable article, it shows a prompt to open it in Lume.

## Features

The extension detects supported article pages and gives you a quick way to open them in Lume.  
You can also configure it from the extension popup, including an optional custom domain override.

## Project Structure

- `src/` background + content scripts
- `popup/` extension popup UI
- `options/` full settings page
- `manifests/manifest.chrome.json`
- `manifests/manifest.firefox.json`
- `scripts/build.mjs` build browser outputs

## Install

### Firefox (normal users)

Install from the Mozilla Add-ons listing (AMO).

### Chrome (advanced only)

There's currently no Chrome extension available on the webstore. Please refer to the "Advanced Install" section below for installation on Chrome.

## Advanced Install (Unpacked)

### Firefox (temporary local install)

1. Run `npm run build`
2. Open `about:debugging#/runtime/this-firefox` in your browser
3. Click `Load Temporary Add-on`
4. Select `dist/firefox/manifest.json`

### Chrome-based browsers (advanced local install)

1. Run `npm run build`
2. Open `chrome://extensions` in your browser
3. Enable Developer mode
4. Click `Load unpacked`
5. Select `dist/chrome`

## Build

```bash
npm run build
```

Build output:

- `dist/chrome`
- `dist/firefox`
