/**
 * Client for the Palette AI backend (`../backend`).
 *
 * The backend normalizes the Art Institute of Chicago payload, so the
 * fields here are the cleaned shape — not the raw AIC shape.
 *
 * In dev on a real device you must use your machine's LAN IP instead of
 * localhost, because the phone can't reach the laptop's `localhost`.
 * Update `API_BASE` accordingly.
 */

import { Platform } from 'react-native';

// Edit this if you run the backend somewhere else.
//   - localhost:3001  → web / iOS simulator on same machine
//   - 10.0.2.2:3001   → Android emulator
//   - 192.168.x.x:3001 → phone on the same WiFi (use your machine's LAN IP)
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_BASE = `http://${HOST}:3001/api`;

export interface Artwork {
  id: number;
  title: string;
  artist: string;
  artistFull: string;
  date: string;
  dateStart: number | null;
  dateEnd: number | null;
  medium: string | null;
  place: string | null;
  description: string;
  image: string | null;
  imageLarge: string | null;
  thumbnail: string | null;
  lqip: string | null;
  classification: string | null;
  style: string | null;
  department: string | null;
  gallery: string | null;
  onView: boolean;
  aicUrl: string;
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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json();
}

export function fetchArtworks(opts?: {
  page?: number;
  limit?: number;
  period?: number | null;
}): Promise<ArtworkListResponse> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.period != null) params.set('period', String(opts.period));
  const qs = params.toString();
  return getJson<ArtworkListResponse>('/artworks' + (qs ? `?${qs}` : ''));
}

export function fetchArtwork(id: number | string): Promise<Artwork> {
  return getJson<Artwork>(`/artworks/${id}`);
}

export function fetchFeatured(): Promise<Artwork> {
  return getJson<Artwork>('/featured');
}

/**
 * Period filter buckets, matching the backend's `period=` query param.
 */
export const PERIODS = [
  { label: 'All', value: null },
  { label: '1600s', value: 1600 },
  { label: '1700s', value: 1700 },
  { label: '1800s', value: 1800 },
  { label: '1900s', value: 1900 },
] as const;
