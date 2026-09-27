const CACHE_KEY = 'afc:visits';
const TIMEOUT_MS = 5000;

/** GoatCounter returns the total as a display string ("1 234", "1,234"); keep the digits only. */
export function parseCount(body: unknown): number | null {
  const raw = (body as { count?: unknown } | null)?.count;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/**
 * Site-wide visitor total, fetched once per session. Any failure — the owner's public-counter setting
 * off (403), an ad blocker, offline — resolves to null so the badge simply isn't shown.
 */
export async function fetchVisits(site: string, fetchImpl: typeof fetch = fetch): Promise<number | null> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return Number(cached);
  } catch {
    // Storage blocked: fetch every time, the counter is cached server-side anyway.
  }
  try {
    const res = await fetchImpl(`${site}/counter/TOTAL.json`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const count = parseCount(await res.json());
    if (count === null) return null;
    try {
      sessionStorage.setItem(CACHE_KEY, String(count));
    } catch {
      /* see above */
    }
    return count;
  } catch (e) {
    console.debug('visit counter unavailable', e);
    return null;
  }
}
