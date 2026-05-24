/**
 * Art Institute of Chicago API client.
 * Public, no key required. https://api.artic.edu/docs/
 */

const BASE = 'https://api.artic.edu/api/v1';
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

export interface Artwork {
  id: number;
  title: string;
  artist_display: string;
  artist_title: string | null;
  date_display: string;
  date_start: number | null;
  date_end: number | null;
  medium_display: string | null;
  place_of_origin: string | null;
  description: string | null;
  short_description: string | null;
  thumbnail: { alt_text?: string; lqip?: string } | null;
  image_id: string | null;
  classification_title: string | null;
  style_title: string | null;
  department_title: string | null;
  gallery_title: string | null;
  is_on_view: boolean;
}

export interface ArtworkListResponse {
  data: Artwork[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
  };
}

export function imageUrl(imageId: string | null, width: number = 843): string | null {
  if (!imageId) return null;
  return `${IIIF}/${imageId}/full/${width},/0/default.jpg`;
}

export function stripHtml(html: string | null | undefined): string {
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

/**
 * Fetch a paginated list of artworks (filtered to ones with images).
 */
export async function fetchArtworks(opts?: {
  page?: number;
  limit?: number;
  query?: string;
}): Promise<ArtworkListResponse> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;

  // Use search endpoint to filter for artworks with images
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    fields: FIELDS,
  });

  // Public-domain artworks with images that are highlights
  const url = opts?.query
    ? `${BASE}/artworks/search?q=${encodeURIComponent(opts.query)}&${params}`
    : `${BASE}/artworks?${params}&is_public_domain=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Art API ${res.status}`);
  const json = (await res.json()) as ArtworkListResponse;

  // Filter to ones that actually have an image_id
  json.data = json.data.filter((a) => a.image_id);
  return json;
}

export async function fetchArtwork(id: number | string): Promise<Artwork> {
  const url = `${BASE}/artworks/${id}?fields=${FIELDS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Art API ${res.status}`);
  const json = await res.json();
  return json.data as Artwork;
}

/**
 * Period filter buckets. Date is the *start* year.
 */
export const PERIODS = [
  { label: 'All', start: null, end: null },
  { label: '1600s', start: 1600, end: 1699 },
  { label: '1700s', start: 1700, end: 1799 },
  { label: '1800s', start: 1800, end: 1899 },
  { label: '1900s', start: 1900, end: 1999 },
] as const;

export function filterByPeriod(
  arts: Artwork[],
  period: { start: number | null; end: number | null }
): Artwork[] {
  if (period.start == null) return arts;
  return arts.filter(
    (a) => a.date_start != null && a.date_start >= period.start! && a.date_start <= period.end!
  );
}
