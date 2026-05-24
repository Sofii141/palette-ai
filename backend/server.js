/**
 * Palette AI backend.
 * Proxies the Art Institute of Chicago public API, normalizes the payload,
 * and adds an in-memory cache so the same request doesn't hit AIC twice.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the static preview from /frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---------------------------------------------------------------------------
// In-memory cache (TTL in ms)
// ---------------------------------------------------------------------------
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 min

function cacheGet(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.at > TTL) {
    cache.delete(key);
    return null;
  }
  return v.data;
}
function cacheSet(key, data) {
  cache.set(key, { at: Date.now(), data });
}

// ---------------------------------------------------------------------------
// AIC client
// ---------------------------------------------------------------------------
const AIC = 'https://api.artic.edu/api/v1';
const IIIF = 'https://www.artic.edu/iiif/2';

const FIELDS = [
  'id',
  'title',
  'artist_display',
  'artist_title',
  'date_display',
  'date_start',
  'date_end',
  'medium_display',
  'place_of_origin',
  'description',
  'short_description',
  'thumbnail',
  'image_id',
  'classification_title',
  'style_title',
  'department_title',
  'gallery_title',
  'is_on_view',
].join(',');

function imageUrl(imageId, width = 843) {
  return imageId ? `${IIIF}/${imageId}/full/${width},/0/default.jpg` : null;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<\/?(p|br|div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeArtwork(a) {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist_title || a.artist_display || 'Unknown',
    artistFull: a.artist_display,
    date: a.date_display || '',
    dateStart: a.date_start ?? null,
    dateEnd: a.date_end ?? null,
    medium: a.medium_display || null,
    place: a.place_of_origin || null,
    description: stripHtml(a.description || a.short_description || ''),
    image: imageUrl(a.image_id, 843),
    imageLarge: imageUrl(a.image_id, 1686),
    thumbnail: imageUrl(a.image_id, 400),
    lqip: a.thumbnail && a.thumbnail.lqip ? a.thumbnail.lqip : null,
    classification: a.classification_title || null,
    style: a.style_title || null,
    department: a.department_title || null,
    gallery: a.gallery_title || null,
    onView: !!a.is_on_view,
    aicUrl: `https://www.artic.edu/artworks/${a.id}`,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, cacheSize: cache.size, at: new Date().toISOString() });
});

/**
 * GET /api/artworks?page=1&limit=20&period=1800
 *   period filters by date_start century (1600, 1700, 1800, 1900)
 */
app.get('/api/artworks', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const period = req.query.period ? Number(req.query.period) : null;
    const cacheKey = `list:${page}:${limit}:${period ?? 'all'}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // AIC search endpoint: filter for public-domain pieces that have images
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit * 2), // overfetch — we filter out items without images
      fields: FIELDS,
    });
    const url = `${AIC}/artworks?${params}&is_public_domain=true`;

    const aicRes = await fetch(url);
    if (!aicRes.ok) {
      return res.status(502).json({ error: `AIC upstream ${aicRes.status}` });
    }
    const aic = await aicRes.json();

    let items = aic.data
      .filter((a) => a.image_id)
      .map(normalizeArtwork);

    if (period != null) {
      const end = period + 99;
      items = items.filter(
        (i) => i.dateStart != null && i.dateStart >= period && i.dateStart <= end
      );
    }

    items = items.slice(0, limit);

    const payload = {
      data: items,
      pagination: aic.pagination,
    };
    cacheSet(cacheKey, payload);
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (e) {
    console.error('GET /api/artworks failed', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/artworks/:id
 */
app.get('/api/artworks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `art:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    const url = `${AIC}/artworks/${id}?fields=${FIELDS}`;
    const aicRes = await fetch(url);
    if (!aicRes.ok) {
      return res.status(aicRes.status).json({ error: `AIC ${aicRes.status}` });
    }
    const aic = await aicRes.json();
    const payload = normalizeArtwork(aic.data);
    cacheSet(cacheKey, payload);
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (e) {
    console.error('GET /api/artworks/:id failed', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/featured — pick one good featured artwork
 */
app.get('/api/featured', async (req, res) => {
  try {
    const cached = cacheGet('featured');
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    const url = `${AIC}/artworks?limit=20&is_public_domain=true&fields=${FIELDS}`;
    const aicRes = await fetch(url);
    const aic = await aicRes.json();
    const items = aic.data.filter((a) => a.image_id).map(normalizeArtwork);
    // Pick one with a real description so the hero looks good
    const pick = items.find((i) => i.description && i.description.length > 60) || items[0];
    cacheSet('featured', pick);
    res.set('X-Cache', 'MISS');
    res.json(pick);
  } catch (e) {
    console.error('GET /api/featured failed', e);
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[palette-ai backend] http://localhost:${PORT}`);
  console.log(`[palette-ai backend] preview: http://localhost:${PORT}/preview.html`);
});
