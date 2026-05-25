/**
 * Client for the Palette AI backend (`../../backend`).
 *
 * In dev on a real device you must use your machine's LAN IP instead of
 * localhost, because the phone cannot reach the laptop's `localhost`.
 * Set EXPO_PUBLIC_API_HOST in `.env.local` or just edit `HOST` below.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getToken } from './auth';

// Try to pick the LAN host from the Expo dev URL automatically.
// e.g. exp://192.168.1.42:8083 → 192.168.1.42
function detectLanHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    '';
  const match = String(hostUri).match(/^([\d.]+):/);
  return match ? match[1] : null;
}

function pickHost(): string {
  // Manual override wins
  const env = process.env.EXPO_PUBLIC_API_HOST;
  if (env) return env;
  if (Platform.OS === 'web') return 'localhost';
  if (Platform.OS === 'android') {
    // Android emulator can't reach localhost — use special alias.
    // For a real device on LAN, detectLanHost will return the laptop IP.
    return detectLanHost() || '10.0.2.2';
  }
  // iOS simulator can use localhost; iOS device needs LAN IP.
  return detectLanHost() || 'localhost';
}

export const API_BASE = `http://${pickHost()}:3001/api`;

// ------- Types -------

export interface Artwork {
  /** Composite id like "aic:14655" or "met:436105". */
  id: string;
  /** "aic" | "met" — which museum the painting came from. */
  source: 'aic' | 'met';
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
  filters?: { period: string; style: string };
  pagination: { total: number; limit: number; offset: number; total_pages: number; current_page: number };
}

export interface FilterOption {
  key: string;
  label: string;
}

export interface Comment {
  id: string;
  username: string;
  displayName: string;
  text: string;
  createdAt: string;
}

// ------- HTTP helper -------

async function authedFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  if (res.status === 204) return null;
  return res.json();
}

// ------- Endpoints -------

export function fetchArtworks(opts?: {
  page?: number;
  limit?: number;
  period?: string;
  style?: string;
}): Promise<ArtworkListResponse> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.period && opts.period !== 'all') params.set('period', opts.period);
  if (opts?.style && opts.style !== 'all') params.set('style', opts.style);
  const qs = params.toString();
  return authedFetch('/artworks' + (qs ? `?${qs}` : ''));
}

export function fetchArtwork(id: string): Promise<Artwork> {
  return authedFetch(`/artworks/${encodeURIComponent(id)}`);
}

export function fetchFeatured(): Promise<Artwork> {
  return authedFetch('/featured');
}

export function fetchFilters(): Promise<{ periods: FilterOption[]; styles: FilterOption[] }> {
  return authedFetch('/filters');
}

export function fetchFavorites(): Promise<{ data: Artwork[] }> {
  return authedFetch('/favorites');
}

export function fetchFavoriteIds(): Promise<{ ids: string[] }> {
  return authedFetch('/favorites/ids');
}

export function addFavorite(id: string) {
  return authedFetch(`/favorites/${encodeURIComponent(id)}`, { method: 'POST' });
}

export function removeFavorite(id: string) {
  return authedFetch(`/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchComments(artworkId: string): Promise<{
  yours: Comment | null;
  others: Comment[];
}> {
  return authedFetch(`/artworks/${encodeURIComponent(artworkId)}/comments`);
}

export function postComment(artworkId: string, text: string): Promise<Comment> {
  return authedFetch(`/artworks/${encodeURIComponent(artworkId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ------- Fallback filter lists (until backend responds) -------

export const PERIODS: ReadonlyArray<FilterOption> = [
  { key: 'all',   label: 'All' },
  { key: '1500s', label: '1500s' },
  { key: '1600s', label: '1600s' },
  { key: '1700s', label: '1700s' },
  { key: '1800s', label: '1800s' },
  { key: '1900s', label: '1900s' },
];

export const STYLES: ReadonlyArray<FilterOption> = [
  { key: 'all',                label: 'All' },
  { key: 'renaissance',        label: 'Renaissance' },
  { key: 'baroque',            label: 'Baroque' },
  { key: 'rococo',             label: 'Rococo' },
  { key: 'neoclassicism',      label: 'Neoclassicism' },
  { key: 'romanticism',        label: 'Romanticism' },
  { key: 'realism',            label: 'Realism' },
  { key: 'impressionism',      label: 'Impressionism' },
  { key: 'post-impressionism', label: 'Post-Impressionism' },
  { key: 'expressionism',      label: 'Expressionism' },
  { key: 'cubism',             label: 'Cubism' },
  { key: 'surrealism',         label: 'Surrealism' },
  { key: 'modernism',          label: 'Modernism' },
  { key: 'abstract',           label: 'Abstract Expressionism' },
  { key: 'pop',                label: 'Pop Art' },
];
