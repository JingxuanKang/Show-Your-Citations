/**
 * Shared config + data access for Show Your Citations.
 * Imported as an ES module by popup.js, background.js and options.js.
 */

// Default proxy endpoint. Leave empty to force the user to configure their own
// Worker in the options page. Set this to your deployed Worker URL to ship a
// working default (e.g. 'https://scholar.example.com').
export const DEFAULT_API_BASE = '';

export const SYNC_KEYS = [
  'scholarId',
  'scholarUrl',
  'apiBase',
  'enableNotifications',
  'autoUpdate',
];

/** Pull the Scholar id from a full profile URL, or return '' if none. */
export function extractScholarId(input) {
  if (!input) return '';
  const m = String(input).match(/[?&]user=([^&]+)/);
  if (m) return m[1];
  // Bare id pasted directly.
  if (/^[A-Za-z0-9_-]{5,30}$/.test(input.trim())) return input.trim();
  return '';
}

/** Read settings and derive the effective Scholar id + normalized API base. */
export async function getSettings() {
  const s = await chrome.storage.sync.get(SYNC_KEYS);
  const scholarId = s.scholarId || extractScholarId(s.scholarUrl) || '';
  const apiBase = (s.apiBase || DEFAULT_API_BASE || '').replace(/\/+$/, '');
  return {
    scholarId,
    apiBase,
    scholarUrl: s.scholarUrl || '',
    enableNotifications: s.enableNotifications !== false,
    autoUpdate: s.autoUpdate !== false,
  };
}

/** Typed error so callers can react to specific failure modes. */
export class ScholarError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

/**
 * Fetch normalized citation stats through the proxy Worker.
 * Returns { name, sinceYear, citations, citationsSince, hIndex, hIndexSince,
 *           i10Index, i10IndexSince, timestamp }.
 * Throws ScholarError on any failure.
 */
export async function fetchCitations({ scholarId, apiBase, timeoutMs = 12000 }) {
  const base = (apiBase || DEFAULT_API_BASE || '').replace(/\/+$/, '');
  if (!base) throw new ScholarError('NO_ENDPOINT', 'Proxy endpoint not set');
  if (!scholarId) throw new ScholarError('NO_ID', 'Scholar id not set');

  const url = `${base}/?user=${encodeURIComponent(scholarId)}&hl=en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ScholarError('TIMEOUT', 'Request timed out');
    }
    throw new ScholarError('NETWORK', 'Cannot reach proxy endpoint');
  } finally {
    clearTimeout(timer);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new ScholarError('BAD_RESPONSE', 'Proxy returned non-JSON');
  }

  if (!res.ok || body.error) {
    const code = body.error === 'scholar_blocked' ? 'BLOCKED' : 'UPSTREAM';
    throw new ScholarError(code, body.hint || body.error || `HTTP ${res.status}`);
  }

  return normalize(body);
}

/** Map the Worker's snake_case payload into a flat camelCase record. */
export function normalize(body) {
  const c = body.citations || {};
  const h = body.h_index || {};
  const i = body.i10_index || {};
  return {
    name: body.name || '',
    sinceYear: body.since_year || null,
    citations: num(c.all),
    citationsSince: num(c.since),
    hIndex: num(h.all),
    hIndexSince: num(h.since),
    i10Index: num(i.all),
    i10IndexSince: num(i.since),
    timestamp: body.updated_at || Date.now(),
  };
}

function num(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Compact badge text: 1234 -> "1234", 12345 -> "12k", 1234567 -> "1.2M". */
export function badgeText(citations) {
  const n = num(citations);
  if (n <= 0) return '';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return Math.round(n / 1000) + 'k';
  return String(n);
}
