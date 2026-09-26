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

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = (n: number) => ROMAN[n - 1] ?? String(n);

export interface Named {
  id: string;
  nameKey: string;
  /** Game ID: numbering follows the game's own order (Sand2 → I … Sand7 → VI). */
  order: number;
}

/**
 * Entities whose display text collides in any culture get a derived key `<nameKey>#<id>` whose
 * text is the game string + a roman numeral (Refined Sand I…VI). Adds those keys to `locales`
 * and returns id → derived key; the game's own key stays for everything else.
 */
export function disambiguate(entities: Named[], locales: Record<string, GameLocale>): Map<string, string> {
  const parent = new Map(entities.map((e) => [e.id, e.id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));
  for (const locale of Object.values(locales)) {
    const byText = new Map<string, string>();
    for (const e of entities) {
      const text = locale[e.nameKey] ?? e.nameKey;
      const first = byText.get(text);
      if (first) parent.set(find(e.id), find(first));
      else byText.set(text, e.id);
    }
  }
  const groups = new Map<string, Named[]>();
  for (const e of entities) groups.set(find(e.id), [...(groups.get(find(e.id)) ?? []), e]);
  const derived = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.order - b.order);
    group.forEach((e, i) => {
      const key = `${e.nameKey}#${e.id}`;
      for (const locale of Object.values(locales)) locale[key] = `${locale[e.nameKey] ?? e.nameKey} ${roman(i + 1)}`;
      derived.set(e.id, key);
    });
  }
  return derived;
}
