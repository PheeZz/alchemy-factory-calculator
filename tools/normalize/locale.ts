import type { GameLocale } from '../../src/shared/data/types';
import type { Raw, RawText } from './load';

export interface LocaleResult {
  locales: Record<string, GameLocale>;
  /** culture → keys that fell back (ru → en → key). */
  missing: Record<string, string[]>;
}

/**
 * DisplayName points at a StringTable (TableId) whose TableNamespace is the locres namespace;
 * the exported LocalizedString is the zh source, so text is resolved from Game.locres.
 */
export function buildLocales(texts: RawText[], raw: Pick<Raw, 'locres' | 'stringTableNamespaces'>, cultures: string[]): LocaleResult {
  const locales: Record<string, GameLocale> = {};
  const missing: Record<string, string[]> = {};
  const lookup = (culture: string, t: RawText) => {
    const ns = t.TableId ? raw.stringTableNamespaces[t.TableId] : undefined;
    return ns && t.Key ? raw.locres[culture]?.[ns]?.[t.Key] : undefined;
  };
  for (const culture of cultures) {
    const out: GameLocale = {};
    const miss: string[] = [];
    for (const t of texts) {
      if (!t.Key || t.Key in out) continue;
      const text = lookup(culture, t) ?? lookup('en', t);
      if (text === undefined || lookup(culture, t) === undefined) miss.push(t.Key);
      out[t.Key] = text ?? t.Key;
    }
    locales[culture] = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
    missing[culture] = miss.sort();
  }
  return { locales, missing };
}
