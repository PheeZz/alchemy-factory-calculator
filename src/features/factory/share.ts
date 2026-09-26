import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { isFactoryDraft, type FactoryDraft } from './schema';
import { useFactoryStore } from './store';

const PREFIX = '#s=';
const VERSION = 1;

interface SharePayload {
  v: typeof VERSION;
  build: string;
  factory: FactoryDraft;
}

export type ShareDecode = { ok: true; build: string; factory: FactoryDraft } | { ok: false; error: 'format' | 'version' };

export function encodeShare(build: string, factory: FactoryDraft): string {
  const payload: SharePayload = { v: VERSION, build, factory: { name: factory.name, plan: factory.plan } };
  return PREFIX + compressToEncodedURIComponent(JSON.stringify(payload));
}

export const hasShareHash = (hash: string) => hash.startsWith(PREFIX);

/** Never throws: truncated or tampered links come back as an error value. */
export function decodeShare(hash: string): ShareDecode {
  if (!hasShareHash(hash)) return { ok: false, error: 'format' };
  let payload: unknown;
  try {
    // lz-string returns null or garbage (never throws) on a cut-off string; JSON.parse catches the rest.
    payload = JSON.parse(decompressFromEncodedURIComponent(hash.slice(PREFIX.length)) ?? '');
  } catch {
    return { ok: false, error: 'format' };
  }
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'format' };
  const p = payload as Partial<SharePayload>;
  if (p.v !== VERSION) return { ok: false, error: 'version' };
  if (typeof p.build !== 'string' || !isFactoryDraft(p.factory)) return { ok: false, error: 'format' };
  return { ok: true, build: p.build, factory: p.factory };
}

/** Imports a shared factory as a new one; the store is touched only when the link decodes cleanly. */
export function importShareHash(hash: string): ShareDecode {
  const decoded = decodeShare(hash);
  if (decoded.ok) useFactoryStore.getState().importFactories([decoded.factory]);
  return decoded;
}

export const shareUrl = (build: string, factory: FactoryDraft) =>
  `${location.origin}${location.pathname}${location.search}${encodeShare(build, factory)}`;

/** Resolves false when the clipboard is unavailable (insecure origin, denied permission). */
export async function copyShareLink(build: string, factory: FactoryDraft): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareUrl(build, factory));
    return true;
  } catch {
    return false;
  }
}
