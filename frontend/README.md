# 🎨 Palette AI

A beautiful virtual art museum app — explore paintings from around the world and read the stories behind them.

Built with **React Native + Expo + TypeScript**, powered by the free **Art Institute of Chicago API**.

## ✨ Features (v1)

- **Home** — featured artwork with elegant museum-stamp branding
- **Gallery** — browse a curated grid filtered by historical period (1600s–1900s)
- **Detail** — large arch-framed painting with full metadata and historical description
- **Light / Dark mode** — toggle in the top bar (sun / moon icon)
- **Real artwork data** — no mocks; everything loads from the live AIC collection

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm start
```

Then:

- **Phone (easiest):** download **Expo Go** from the App Store / Play Store and scan the QR code shown in your terminal
- **Web:** press `w` in the terminal
- **iOS simulator:** press `i` (requires Xcode on Mac)
- **Android emulator:** press `a` (requires Android Studio)

## 🗂 Project structure

```
palette-ai/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout, fonts, theme
│   ├── index.tsx           # Home screen
│   ├── gallery.tsx         # Gallery grid
│   └── artwork/[id].tsx    # Artwork detail
├── components/
│   ├── ArchFrame.tsx       # Signature arched image frame
│   ├── Logo.tsx            # Museum-stamp logo
│   ├── TopBar.tsx          # Navigation header
│   ├── Chip.tsx            # Period filter chip
│   ├── PillButton.tsx      # CTA button
│   └── WatermarkText.tsx   # Decorative faded text
├── services/
│   └── artApi.ts           # Art Institute of Chicago API client
├── theme/
│   ├── colors.ts           # Light & dark palettes
│   ├── tokens.ts           # Spacing, radius, fonts, sizes
│   └── ThemeContext.tsx    # Theme provider + hook
└── package.json
```

## 🎨 Design language

- **Palette** (light): warm cream `#EFEAE0`, deep olive `#3D4A2C`, gold `#A88A4E`
- **Typography:**
  - Playfair Display — display brand text
  - Cormorant Garamond — body / artwork titles
  - Inter — UI labels
- **Shape language:** arched frames, oval cards, hairline dividers — inspired by classical museum exhibits

## 🛣 Roadmap

- [ ] Search (artist / keyword)
- [ ] Favorites (with local backend — Node + Express + Postgres)
- [ ] User accounts (JWT auth)
- [ ] Audio guide for each painting
- [ ] AR / VR view of selected works
- [ ] Curated collections / personalized recommendations

## 📚 API

[Art Institute of Chicago Public API](https://api.artic.edu/docs/) — free, no API key, includes high-resolution IIIF images and rich metadata for ~120,000 artworks.

---

Made with care for the **Ana Sofia** portfolio ✨
