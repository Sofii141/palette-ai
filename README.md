# Palette AI

A virtual art museum mobile app — explore paintings from around the world and read the stories behind them.

Full-stack project:
- **frontend/** — React Native + Expo (mobile app) and a live HTML preview
- **backend/** — Node + Express API that proxies the Art Institute of Chicago public API

## Quick start

In two terminals:

```bash
# Terminal 1 — backend
cd backend
npm install
npm start
# → http://localhost:3001

# Terminal 2 — mobile app (optional, for the real RN build)
cd frontend
npm install
npm start
```

To see the **web preview** with real data from the API:
open `http://localhost:3001/preview.html` once the backend is running.

## Project structure

```
palette-ai/
├── backend/                 Node + Express + AIC proxy
│   ├── server.js
│   ├── package.json
│   └── README.md
├── frontend/                React Native + Expo
│   ├── app/                 Expo Router screens
│   ├── components/
│   ├── services/artApi.ts   Calls the backend
│   ├── theme/
│   ├── preview.html         Web preview (works without RN setup)
│   └── package.json
└── README.md
```

## Roadmap

- [x] Frontend v1 (Home, Gallery, Detail)
- [x] Backend with AIC API proxy + caching
- [ ] Favorites (requires persistent storage — Postgres)
- [ ] User accounts (JWT)
- [ ] Search by artist / keyword
- [ ] Audio guide
- [ ] AR / VR view
