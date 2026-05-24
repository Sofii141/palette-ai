# Palette AI — Frontend

React Native + Expo + TypeScript mobile app.

Also contains `preview.html` — a self-contained web preview that talks to the same backend, useful for showing the design without running the mobile build.

## Setup

```bash
npm install
npm start
```

Then:
- **Phone:** install Expo Go, scan the QR code shown in the terminal
- **iOS simulator:** press `i` (requires Xcode)
- **Android emulator:** press `a` (requires Android Studio)

## Backend dependency

The app reads from the backend at `http://localhost:3001/api`. Start it from `../backend` first:

```bash
cd ../backend && npm install && npm start
```

## Project structure

```
frontend/
├── app/                    Expo Router screens
│   ├── _layout.tsx         Root layout, fonts, theme provider
│   ├── index.tsx           Home
│   ├── gallery.tsx         Gallery grid
│   └── artwork/[id].tsx    Artwork detail
├── components/
│   ├── ArchFrame.tsx       Signature arched image frame
│   ├── Logo.tsx            Museum-stamp logo
│   ├── TopBar.tsx          Header
│   ├── Chip.tsx            Period filter chip
│   ├── PillButton.tsx      CTA button
│   └── WatermarkText.tsx   Decorative faded text
├── services/
│   └── artApi.ts           Calls the backend
├── theme/
│   ├── colors.ts           Light + dark palettes
│   ├── tokens.ts           Spacing, radius, fonts
│   └── ThemeContext.tsx    Theme provider + hook
├── preview.html            Web preview
└── package.json
```

## Design language

- **Palette (light):** warm cream `#EFEAE0`, deep olive `#3D4A2C`, gold `#A88A4E`
- **Typography:**
  - Playfair Display — display brand text
  - Cormorant Garamond — body, artwork titles
  - Inter — UI labels
- **Shapes:** arched frames, hairline dividers — classical museum exhibit aesthetic
