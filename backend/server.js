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
    styles: a.style_titles || [],
    department: a.department_title || null,
    gallery: a.gallery_title || null,
    onView: !!a.is_on_view,
    aicUrl: `https://www.artic.edu/artworks/${a.id}`,
  };
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
 */
app.get('/api/artworks', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 60);
    const periodKey = req.query.period || 'all';
    const styleKey = req.query.style || 'all';
    const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[0];
    const style = STYLES.find((s) => s.key === styleKey) || STYLES[0];

    const cacheKey = `paintings:${page}:${limit}:${period.key}:${style.key}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const aic = await searchPaintings({
      size: limit * 2, // overfetch — items without image_id will be filtered
      from: (page - 1) * limit,
      period,
      style,
    });

    const items = aic.data
      .filter((a) => a.image_id)
      .map(normalizeArtwork)
      .slice(0, limit);

    const payload = {
      data: items,
      filters: { period: period.key, style: style.key },
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
 * GET /api/artworks/:id — full detail for one painting
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
    const url = `${AIC}/artworks/${id}?fields=${FIELDS.join(',')}`;
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
app.listen(PORT, () => {
  console.log(`[palette-ai backend] http://localhost:${PORT}`);
  console.log(`[palette-ai backend] preview: http://localhost:${PORT}/preview.html`);
});
