import type { GameData, GameLocale } from './types';

export type DataLoadErrorKind = 'network' | 'http' | 'parse';

export class DataLoadError extends Error {
  constructor(
    readonly kind: DataLoadErrorKind,
    readonly url: string,
    readonly status?: number,
  ) {
    super(`${kind} error loading ${url}${status ? ` (HTTP ${status})` : ''}`);
    this.name = 'DataLoadError';
  }
}

const url = (path: string) => `${import.meta.env.BASE_URL}${path}`;

async function fetchJson<T>(path: string): Promise<T> {
  const href = url(path);
  let res: Response;
  try {
    res = await fetch(href);
  } catch {
    throw new DataLoadError('network', href);
  }
  if (!res.ok) throw new DataLoadError('http', href, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new DataLoadError('parse', href);
  }
}

const cache = new Map<string, Promise<unknown>>();

/** Promise cache per path; failures are evicted so a retry actually refetches. */
function cached<T>(path: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(path, p);
    p.catch(() => cache.delete(path));
  }
  return p;
}

/** `public/data/index.json` names the current build so a data refresh needs no code change. */
export const loadManifest = () =>
  cached('data/index.json', () => fetchJson<{ current: string }>('data/index.json'));

export const loadGameData = (build: string) =>
  cached(`data/${build}/gamedata.json`, () => fetchJson<GameData>(`data/${build}/gamedata.json`));

export const loadLocale = (build: string, lang: string) =>
  cached(`data/${build}/locale.${lang}.json`, () => fetchJson<GameLocale>(`data/${build}/locale.${lang}.json`));
