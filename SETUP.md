# Coin Collector - Setup Guide

## Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS or Android)
- Or an iOS/Android simulator

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm start

# 3. Scan the QR code with Expo Go on your phone
#    or press 'i' for iOS simulator / 'a' for Android emulator
```

## Project Structure

```
src/
├── navigation/      # React Navigation setup (tabs + stacks)
├── screens/         # 6 screens: Home, Camera, Results, Collection, History, Settings
├── components/      # CoinCard, CoinDetailsModal, LoadingOverlay
├── store/           # Redux Toolkit slices (collection, history, settings)
├── services/        # Coin identification AI mock, storage (AsyncStorage)
├── data/            # Mock database of 15 sample coins (240K+ simulated)
└── theme/           # Colors, typography, spacing constants
```

## Key Features

| Feature | Status |
|---------|--------|
| Camera capture with viewfinder | ✅ |
| Gallery image upload | ✅ |
| AI coin identification (mock) | ✅ |
| Confidence score display | ✅ |
| Photo quality assessment | ✅ |
| Coin details (6 info tabs) | ✅ |
| Market value range display | ✅ |
| Collection management | ✅ |
| Wishlist | ✅ |
| Scan history (last 50) | ✅ |
| Sort & filter collection | ✅ |
| Dark theme throughout | ✅ |
| Redux state management | ✅ |
| AsyncStorage persistence | ✅ |
| Toast notifications | ✅ |
| Premium subscription modal | ✅ |
| Share coin details | ✅ |
| Alternative match suggestions | ✅ |

## Connecting a Real AI Vision API

To replace the mock AI with a real coin identification service, edit:
`src/services/coinIdentification.js`

### Option A: Google Cloud Vision API
```js
// Replace identifyCoin() with:
const response = await fetch(
  `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
  {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [{ type: 'WEB_DETECTION' }, { type: 'LABEL_DETECTION' }]
      }]
    })
  }
);
```

### Option B: Custom ML Model (Roboflow / Hugging Face)
Point to a hosted inference endpoint that accepts base64 image data.

### Option C: Numista API (Real coin database)
Replace `COIN_DATABASE` lookups with calls to:
`https://api.numista.com/api/v3/coins` (free tier available)

## Assets Needed
Place these in the `assets/` folder:
- `icon.png` (1024×1024)
- `splash.png` (1284×2778)  
- `adaptive-icon.png` (1024×1024)
- `favicon.png` (32×32)

Generate with: https://expo.dev/tools/icon-generator

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build --platform ios
eas build --platform android
```
