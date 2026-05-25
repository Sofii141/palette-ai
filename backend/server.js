/**
 * Palette AI backend.
 * Proxies the Art Institute of Chicago public API, normalizes the payload,
 * and adds an in-memory cache so the same request doesn't hit AIC twice.
 *
 * Scope: only PAINTINGS (we filter out sculptures, prints, photographs, etc.)
 * with two filter axes: period (century) and style (movement).
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the static preview from /frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---------------------------------------------------------------------------
// Auth + Favorites (in-memory users, on-disk favorites)
// ---------------------------------------------------------------------------
const USERS = {
  sofi: {
    username: 'sofi',
    password: 'sofi', // plaintext on purpose — portfolio demo, not prod
    displayName: 'Sofi',
    memberSince: 'May 2026',
  },
};

const TOKENS = new Map(); // token -> username

const FAVES_FILE = path.join(__dirname, 'favorites.json');
let FAVORITES = {}; // username -> array of artwork ids
try {
  if (fs.existsSync(FAVES_FILE)) {
    FAVORITES = JSON.parse(fs.readFileSync(FAVES_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load favorites file:', e.message);
}
function saveFavorites() {
  try {
    fs.writeFileSync(FAVES_FILE, JSON.stringify(FAVORITES, null, 2));
  } catch (e) {
    console.warn('Could not save favorites:', e.message);
  }
}

// COMMENTS: { [artworkId]: [{ id, username, displayName, text, createdAt }] }
const COMMENTS_FILE = path.join(__dirname, 'comments.json');
let COMMENTS = {};
try {
  if (fs.existsSync(COMMENTS_FILE)) {
    COMMENTS = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load comments file:', e.message);
}
function saveComments() {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(COMMENTS, null, 2));
  } catch (e) {
    console.warn('Could not save comments:', e.message);
  }
}

// Seed a few fake visitor opinions so the community section never feels empty.
// Only seeds if the file is empty / fresh.
function seedCommentsIfEmpty() {
  if (Object.keys(COMMENTS).length > 0) return;
  const seed = (artworkId, items) => {
    COMMENTS[artworkId] = items.map((c, i) => ({
      id: `seed-${artworkId}-${i}`,
      username: c.u,
      displayName: c.n,
      text: c.t,
      createdAt: new Date(Date.now() - (i + 1) * 86400_000 * (1 + i)).toISOString(),
    }));
  };
  // Universal pool — used for any painting that has no real comments yet
  COMMENTS['__pool__'] = [
    { id: 'p1', username: 'amelia', displayName: 'Amelia',
      text: 'Stood in front of this for fifteen minutes. The light catches differently each time.',
      createdAt: new Date(Date.now() - 4 * 86400_000).toISOString() },
    { id: 'p2', username: 'mateo', displayName: 'Mateo',
      text: 'There is a quiet violence in the brushwork that the photographs never capture.',
      createdAt: new Date(Date.now() - 11 * 86400_000).toISOString() },
    { id: 'p3', username: 'noor', displayName: 'Noor',
      text: 'I think about this painting on rainy days. It feels like memory.',
      createdAt: new Date(Date.now() - 21 * 86400_000).toISOString() },
    { id: 'p4', username: 'kenji', displayName: 'Kenji',
      text: 'The composition leads your eye to the smallest detail, then refuses to let go.',
      createdAt: new Date(Date.now() - 30 * 86400_000).toISOString() },
    { id: 'p5', username: 'isabel', displayName: 'Isabel',
      text: 'Saw it in person years ago. Reproductions cannot do the scale justice.',
      createdAt: new Date(Date.now() - 47 * 86400_000).toISOString() },
  ];
  saveComments();
}
seedCommentsIfEmpty();

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const username = token && TOKENS.get(token);
  if (!username || !USERS[username]) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  req.user = USERS[username];
  next();
}

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
  'style_titles',
  'department_title',
  'gallery_title',
  'is_on_view',
];

/**
 * Curated list of art movements that consistently return rich
 * painting results from the AIC catalogue.
 */
/**
 * Curated list of art movements.
 *
 * For each entry we can match by EITHER:
 *   - `term`: AIC's `style_title` value (e.g. "Impressionism")
 *   - `artists`: a list of artist names (used for movements AIC doesn't
 *     tag well — e.g. Romanticism, Rococo). We match on `artist_title`.
 *
 * Most entries use `term` when AIC tags work; we fall back to `artists`
 * when AIC's tagging is sparse for that movement. Both can be combined.
 */
const STYLES = [
  { key: 'all',                label: 'All' },

  { key: 'renaissance',        label: 'Renaissance',
    term: 'Renaissance' },

  { key: 'baroque',            label: 'Baroque',
    term: 'Baroque',
    artists: ['Caravaggio', 'Peter Paul Rubens', 'Diego Velázquez', 'Rembrandt van Rijn',
              'Anthony van Dyck', 'Nicolas Poussin', 'Claude Lorrain', 'Frans Hals',
              'Jan Vermeer', 'Bartolomé Esteban Murillo'] },

  { key: 'rococo',             label: 'Rococo',
    term: 'Rococo',
    artists: ['Jean-Honoré Fragonard', 'François Boucher', 'Jean-Antoine Watteau',
              'Giovanni Battista Tiepolo', 'Élisabeth Louise Vigée Le Brun',
              'Nicolas Lancret', 'Jean-Baptiste-Siméon Chardin',
              'Jean-Marc Nattier', 'Antoine Pesne', 'Pompeo Batoni',
              'Hubert Robert', 'Allan Ramsay', 'Pietro Longhi',
              'Canaletto', 'Francesco Guardi', 'Jean-Baptiste Greuze'] },

  { key: 'neoclassicism',      label: 'Neoclassicism',
    term: 'Neoclassicism',
    artists: ['Jacques-Louis David', 'Jean Auguste Dominique Ingres',
              'Anton Raphael Mengs', 'Angelica Kauffmann', 'Benjamin West',
              'Joseph-Marie Vien', 'Pierre-Paul Prud\'hon',
              'François Gérard', 'Antoine-Jean Gros', 'Anne-Louis Girodet',
              'Charles Le Brun', 'Robert Lefèvre'] },

  { key: 'romanticism',        label: 'Romanticism',
    artists: ['Eugène Delacroix', 'Joseph Mallord William Turner',
              'Théodore Géricault', 'John Constable',
              'Francisco José de Goya y Lucientes', 'Caspar David Friedrich',
              'William Blake', 'Henry Fuseli', 'Thomas Cole',
              'Frederic Edwin Church', 'Albert Bierstadt'] },

  { key: 'realism',            label: 'Realism',
    term: 'Realism',
    artists: ['Gustave Courbet', 'Jean-François Millet', 'Honoré Daumier',
              'Jean-Baptiste-Camille Corot', 'Édouard Manet', 'Thomas Eakins',
              'Winslow Homer'] },

  { key: 'impressionism',      label: 'Impressionism',
    term: 'Impressionism' },

  { key: 'post-impressionism', label: 'Post-Impressionism',
    term: 'Post-Impressionism' },

  { key: 'expressionism',      label: 'Expressionism',
    term: 'Expressionism',
    artists: ['Edvard Munch', 'Ernst Ludwig Kirchner', 'Wassily Kandinsky',
              'Franz Marc', 'Egon Schiele', 'Oskar Kokoschka',
              'Emil Nolde', 'Max Beckmann', 'Marc Chagall',
              'Erich Heckel', 'Karl Schmidt-Rottluff', 'Käthe Kollwitz',
              'August Macke', 'Paula Modersohn-Becker', 'Alexej von Jawlensky',
              'Lyonel Feininger', 'Otto Mueller', 'Ludwig Meidner'] },

  { key: 'cubism',             label: 'Cubism',
    term: 'Cubism',
    artists: ['Pablo Picasso', 'Georges Braque', 'Juan Gris', 'Fernand Léger'] },

  { key: 'surrealism',         label: 'Surrealism',
    term: 'Surrealism',
    artists: ['Salvador Dalí', 'René Magritte', 'Max Ernst', 'Joan Miró',
              'Yves Tanguy', 'Leonora Carrington', 'Giorgio de Chirico'] },

  { key: 'modernism',          label: 'Modernism',
    term: 'Modernism' },

  { key: 'abstract',           label: 'Abstract Expressionism',
    artists: ['Jackson Pollock', 'Mark Rothko', 'Willem de Kooning',
              'Franz Kline', 'Clyfford Still', 'Barnett Newman',
              'Helen Frankenthaler', 'Joan Mitchell'] },

  { key: 'pop',                label: 'Pop Art',
    term: 'Pop Art',
    artists: ['Andy Warhol', 'Roy Lichtenstein', 'Jasper Johns',
              'Robert Rauschenberg', 'James Rosenquist', 'Tom Wesselmann'] },
];

const PERIODS = [
  { key: 'all',   label: 'All',   start: null, end: null },
  { key: '1500s', label: '1500s', start: 1500, end: 1599 },
  { key: '1600s', label: '1600s', start: 1600, end: 1699 },
  { key: '1700s', label: '1700s', start: 1700, end: 1799 },
  { key: '1800s', label: '1800s', start: 1800, end: 1899 },
  { key: '1900s', label: '1900s', start: 1900, end: 1999 },
];

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
    id: `aic:${a.id}`,
    source: 'aic',
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
    styles: a.style_titles || [],
    department: a.department_title || null,
    gallery: a.gallery_title || null,
    onView: !!a.is_on_view,
    aicUrl: `https://www.artic.edu/artworks/${a.id}`,
  };
}

// ---------------------------------------------------------------------------
// Met Museum API integration
// Public, no key. https://metmuseum.github.io/
// ---------------------------------------------------------------------------
const MET = 'https://collectionapi.metmuseum.org/public/collection/v1';

function normalizeMet(o) {
  if (!o || !o.objectID || !o.primaryImage) return null;
  return {
    id: `met:${o.objectID}`,
    source: 'met',
    title: o.title || 'Untitled',
    artist: o.artistDisplayName || 'Unknown',
    artistFull: [o.artistDisplayName, o.artistDisplayBio].filter(Boolean).join(' · '),
    date: o.objectDate || '',
    dateStart: Number.isFinite(o.objectBeginDate) ? o.objectBeginDate : null,
    dateEnd: Number.isFinite(o.objectEndDate) ? o.objectEndDate : null,
    medium: o.medium || null,
    place: o.culture || o.country || null,
    description: '', // Met API doesn't expose descriptions — show metadata only
    image: o.primaryImage,
    imageLarge: o.primaryImage,
    thumbnail: o.primaryImageSmall || o.primaryImage,
    lqip: null,
    classification: o.classification || null,
    style: o.period || null,
    styles: [o.period, o.dynasty].filter(Boolean),
    department: o.department || null,
    gallery: o.GalleryNumber || null,
    onView: !!o.isOnView,
    aicUrl: o.objectURL || `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
  };
}

async function metSearchByArtist(artistName) {
  const cacheKey = `met:byartist:${artistName}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  try {
    const url = `${MET}/search?artistOrCulture=true&hasImages=true&medium=Paintings&q=${encodeURIComponent(artistName)}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const ids = (j.objectIDs || []).slice(0, 8); // take top 8 per artist
    cacheSet(cacheKey, ids);
    return ids;
  } catch {
    return [];
  }
}

async function metFetchObject(id) {
  const cacheKey = `met:obj:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached; // can be a normalized obj OR null (cached "not paintable")
  try {
    const r = await fetch(`${MET}/objects/${id}`);
    if (!r.ok) {
      cacheSet(cacheKey, null);
      return null;
    }
    const obj = await r.json();
    const norm = normalizeMet(obj);
    // Only keep ones that are actually paintings with an image
    const isPainting = norm && /paint/i.test(norm.classification || '');
    const val = isPainting ? norm : null;
    cacheSet(cacheKey, val);
    return val;
  } catch {
    return null;
  }
}

/**
 * Fetch paintings from Met for the given style by querying each artist in
 * the curated list. Heavy first call; fast after cache warms.
 */
async function metFetchForStyle(style, period, max = 20) {
  if (!style || !style.artists || !style.artists.length) return [];
  const artists = style.artists.slice(0, 6); // cap to keep things fast
  // Search by each artist in parallel
  const idLists = await Promise.all(artists.map(metSearchByArtist));
  const flat = [...new Set(idLists.flat())].slice(0, max * 2);
  const items = await Promise.all(flat.map(metFetchObject));
  let valid = items.filter(Boolean);
  if (period && period.start != null) {
    valid = valid.filter(
      (i) => i.dateStart != null && i.dateStart >= period.start && i.dateStart <= period.end
    );
  }
  return valid.slice(0, max);
}

/**
 * Hit the AIC /artworks/search endpoint with an Elasticsearch bool query.
 * Always restricts to: paintings, public-domain, has-image.
 */
async function searchPaintings({ size = 40, from = 0, period, style }) {
  // `match` is more forgiving than `term` against AIC's elasticsearch
  // mappings, where text fields are analyzed.
  //
  // Note: we DO NOT filter by is_public_domain — that field cuts ~95% of the
  // catalogue and removes entire movements (Romanticism, Surrealism, Cubism,
  // etc.). The IIIF image URLs still work for non-public-domain pieces.
  const must = [
    { match: { classification_title: 'painting' } },
    { exists: { field: 'image_id' } },
  ];
  if (period && period.start != null) {
    must.push({ range: { date_start: { gte: period.start, lte: period.end } } });
  }
  if (style && (style.term || style.artists)) {
    // Movement filter is an OR across two strategies:
    //   - match_phrase on style_title / style_titles   (when AIC tags it)
    //   - match_phrase on artist_title for curated list (when AIC doesn't)
    const should = [];
    if (style.term) {
      should.push({ match_phrase: { style_title: style.term } });
      should.push({ match_phrase: { style_titles: style.term } });
    }
    if (style.artists) {
      for (const a of style.artists) {
        should.push({ match_phrase: { artist_title: a } });
      }
    }
    must.push({ bool: { should, minimum_should_match: 1 } });
  }

  const body = {
    query: { bool: { must } },
    fields: FIELDS,
    from,
    size,
  };

  const res = await fetch(`${AIC}/artworks/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AIC search ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, cacheSize: cache.size, at: new Date().toISOString() });
});

/**
 * GET /api/filters — discover available filter chips for the UI
 */
app.get('/api/filters', (req, res) => {
  res.json({
    periods: PERIODS.map(({ key, label }) => ({ key, label })),
    styles: STYLES.map(({ key, label }) => ({ key, label })),
  });
});

/**
 * GET /api/artworks?page=1&limit=20&period=1800s&style=impressionism
 *
 * Combines results from BOTH AIC and Met Museum APIs (in parallel),
 * dedupes by composite id, and returns a merged list.
 */
app.get('/api/artworks', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 60);
    const periodKey = req.query.period || 'all';
    const styleKey = req.query.style || 'all';
    const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[0];
    const style = STYLES.find((s) => s.key === styleKey) || STYLES[0];

    const cacheKey = `combined:${page}:${limit}:${period.key}:${style.key}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Fire AIC + Met in parallel
    const [aicResp, metItems] = await Promise.all([
      searchPaintings({
        size: limit * 2,
        from: (page - 1) * limit,
        period,
        style,
      }).catch(() => ({ data: [], pagination: {} })),
      metFetchForStyle(style, period, Math.ceil(limit / 2)).catch(() => []),
    ]);

    const aicItems = aicResp.data
      .filter((a) => a.image_id)
      .map(normalizeArtwork);

    // Interleave AIC and Met so the gallery feels mixed rather than blocky
    const merged = [];
    const max = Math.max(aicItems.length, metItems.length);
    for (let i = 0; i < max; i++) {
      if (aicItems[i]) merged.push(aicItems[i]);
      if (metItems[i]) merged.push(metItems[i]);
    }

    // Dedupe (shouldn't collide since sources differ, but just in case)
    const seen = new Set();
    const items = merged
      .filter((x) => {
        if (seen.has(x.id)) return false;
        seen.add(x.id);
        return true;
      })
      .slice(0, limit);

    const payload = {
      data: items,
      filters: { period: period.key, style: style.key },
      sources: { aic: aicItems.length, met: metItems.length, returned: items.length },
      pagination: aicResp.pagination,
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
 * Parse a composite id like "aic:14655" or "met:435868". Legacy plain
 * numbers are assumed to be AIC (so old URLs / favorites still work).
 */
function parseCompositeId(raw) {
  const s = String(raw);
  if (s.startsWith('met:')) return { source: 'met', id: s.slice(4) };
  if (s.startsWith('aic:')) return { source: 'aic', id: s.slice(4) };
  return { source: 'aic', id: s };
}

/**
 * GET /api/artworks/:id — full detail for one painting (any source)
 *   :id can be "aic:14655", "met:435868", or just "14655" (legacy AIC)
 */
app.get('/api/artworks/:id', async (req, res) => {
  try {
    const { source, id } = parseCompositeId(req.params.id);
    const cacheKey = `art:${source}:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    let payload = null;
    if (source === 'met') {
      payload = await metFetchObject(id);
      if (!payload) return res.status(404).json({ error: 'Met artwork not found' });
    } else {
      const url = `${AIC}/artworks/${id}?fields=${FIELDS.join(',')}`;
      const aicRes = await fetch(url);
      if (!aicRes.ok) {
        return res.status(aicRes.status).json({ error: `AIC ${aicRes.status}` });
      }
      const aic = await aicRes.json();
      payload = normalizeArtwork(aic.data);
    }
    cacheSet(cacheKey, payload);
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (e) {
    console.error('GET /api/artworks/:id failed', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/featured — one painting with a strong description for the home hero
 */
app.get('/api/featured', async (req, res) => {
  try {
    const cached = cacheGet('featured');
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    const aic = await searchPaintings({ size: 30 });
    const items = aic.data
      .filter((a) => a.image_id)
      .map(normalizeArtwork);
    const pick = items.find((i) => i.description && i.description.length > 80) || items[0];
    cacheSet('featured', pick);
    res.set('X-Cache', 'MISS');
    res.json(pick);
  } catch (e) {
    console.error('GET /api/featured failed', e);
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login  { username, password }
 *   → { token, user }
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  // Demo creds: be forgiving about case for both fields so mobile
  // auto-capitalize doesn't lock people out.
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '').trim().toLowerCase();
  const user = USERS[u];
  if (!user || user.password.toLowerCase() !== p) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  TOKENS.set(token, user.username);
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization.slice(7);
  TOKENS.delete(token);
  res.json({ ok: true });
});

/**
 * GET /api/me — current user (used by frontend to validate token on boot)
 */
app.get('/api/me', authMiddleware, (req, res) => {
  const { password, ...safeUser } = req.user;
  const ids = FAVORITES[req.user.username] || [];
  res.json({ ...safeUser, favoritesCount: ids.length });
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

/**
 * GET /api/favorites — all favorited artworks for the current user.
 * Returns full artwork objects (fetched in parallel from AIC/cache).
 */
// Migrate legacy numeric favorites to "aic:NNN" composite form
function normalizeFavId(raw) {
  const s = String(raw);
  if (s.startsWith('met:') || s.startsWith('aic:')) return s;
  return `aic:${s}`;
}

app.get('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const ids = (FAVORITES[req.user.username] || []).map(normalizeFavId);
    if (!ids.length) return res.json({ data: [] });

    const data = await Promise.all(
      ids.map(async (compositeId) => {
        const { source, id } = parseCompositeId(compositeId);
        const cacheKey = `art:${source}:${id}`;
        const cached = cacheGet(cacheKey);
        if (cached) return cached;
        try {
          if (source === 'met') {
            const norm = await metFetchObject(id);
            return norm; // already cached inside metFetchObject
          }
          const r = await fetch(`${AIC}/artworks/${id}?fields=${FIELDS.join(',')}`);
          if (!r.ok) return null;
          const j = await r.json();
          const norm = normalizeArtwork(j.data);
          cacheSet(cacheKey, norm);
          return norm;
        } catch {
          return null;
        }
      })
    );
    res.json({ data: data.filter(Boolean) });
  } catch (e) {
    console.error('GET /api/favorites failed', e);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/favorites/:id — add to favorites. :id is composite ("aic:14655")
 */
app.post('/api/favorites/:id', authMiddleware, (req, res) => {
  const id = normalizeFavId(req.params.id);
  const u = req.user.username;
  if (!FAVORITES[u]) FAVORITES[u] = [];
  // Normalize any legacy numeric entries to composite first
  FAVORITES[u] = FAVORITES[u].map(normalizeFavId);
  if (!FAVORITES[u].includes(id)) {
    FAVORITES[u].push(id);
    saveFavorites();
  }
  res.json({ ok: true, ids: FAVORITES[u] });
});

/**
 * DELETE /api/favorites/:id
 */
app.delete('/api/favorites/:id', authMiddleware, (req, res) => {
  const id = normalizeFavId(req.params.id);
  const u = req.user.username;
  if (!FAVORITES[u]) FAVORITES[u] = [];
  FAVORITES[u] = FAVORITES[u].map(normalizeFavId).filter((x) => x !== id);
  saveFavorites();
  res.json({ ok: true, ids: FAVORITES[u] });
});

/**
 * GET /api/favorites/ids — just the id list (lightweight, for hearts state)
 */
app.get('/api/favorites/ids', authMiddleware, (req, res) => {
  res.json({ ids: FAVORITES[req.user.username] || [] });
});

// ---------------------------------------------------------------------------
// Comments / Interpretations
// ---------------------------------------------------------------------------

/**
 * GET /api/artworks/:id/comments
 *   → { yours, others }
 * `yours` is the current user's most recent comment (if logged in & has one).
 * `others` is everyone else's comments, newest first. Falls back to a curated
 * "pool" of generic museum-visitor reflections when no real users have
 * commented yet, so the section never feels empty.
 */
app.get('/api/artworks/:id/comments', (req, res) => {
  const artworkId = String(req.params.id);
  const real = COMMENTS[artworkId] || [];

  // Identify viewer (auth is optional here)
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const username = token && TOKENS.get(token);

  const sorted = [...real].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const yours = username ? sorted.find((c) => c.username === username) || null : null;
  let others = sorted.filter((c) => !yours || c.id !== yours.id);

  // Pad with a couple of generic pool entries so the section feels alive.
  // We never override real comments, only supplement them.
  const pool = COMMENTS['__pool__'] || [];
  const padTarget = 3;
  if (others.length < padTarget) {
    others = others.concat(pool.slice(0, padTarget - others.length));
  }

  res.json({ yours, others });
});

/**
 * POST /api/artworks/:id/comments  { text }
 *   → the created comment. Auth required.
 *
 * If the user already has a comment for this artwork, it replaces it
 * (treat each user as having one "interpretation" per painting).
 */
app.post('/api/artworks/:id/comments', authMiddleware, (req, res) => {
  const artworkId = String(req.params.id);
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ error: 'text required' });
  if (text.length > 800) return res.status(400).json({ error: 'too long (max 800)' });

  if (!COMMENTS[artworkId]) COMMENTS[artworkId] = [];
  // Remove previous comment from same user (one interpretation per user)
  COMMENTS[artworkId] = COMMENTS[artworkId].filter((c) => c.username !== req.user.username);

  const c = {
    id: crypto.randomBytes(8).toString('hex'),
    username: req.user.username,
    displayName: req.user.displayName,
    text,
    createdAt: new Date().toISOString(),
  };
  COMMENTS[artworkId].push(c);
  saveComments();
  res.json(c);
});

/**
 * DELETE /api/artworks/:id/comments/mine — remove your own comment
 */
app.delete('/api/artworks/:id/comments/mine', authMiddleware, (req, res) => {
  const artworkId = String(req.params.id);
  if (!COMMENTS[artworkId]) return res.json({ ok: true });
  COMMENTS[artworkId] = COMMENTS[artworkId].filter((c) => c.username !== req.user.username);
  saveComments();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[palette-ai backend] http://localhost:${PORT}`);
  console.log(`[palette-ai backend] preview: http://localhost:${PORT}/preview.html`);
});
