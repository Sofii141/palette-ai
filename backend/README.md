# Palette AI — Backend

Node + Express API that proxies the Art Institute of Chicago public API and adds:
- Payload normalization (clean field names, stripped HTML)
- In-memory caching (5 min TTL)
- Filtering by century (`?period=1800`)
- CORS enabled for the mobile app

Also serves the static web preview at `/preview.html`.

## Setup

```bash
cd backend
npm install
npm start
```

Server runs at `http://localhost:3001`.

## Endpoints

| Method | Path                      | Description                                   |
|--------|---------------------------|-----------------------------------------------|
| GET    | `/api/health`             | Health check + cache stats                    |
| GET    | `/api/featured`           | One curated artwork for the home hero         |
| GET    | `/api/artworks`           | Paginated list. Query: `page`, `limit`, `period` |
| GET    | `/api/artworks/:id`       | Full artwork detail                           |

## Example

```bash
curl http://localhost:3001/api/artworks?period=1800&limit=10
curl http://localhost:3001/api/artworks/27992
```
