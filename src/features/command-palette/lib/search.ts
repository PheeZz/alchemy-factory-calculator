import type { GameData, ItemId } from '@/shared/data/types';
import { mainOutput } from '@/entities/game';

export interface PaletteEntry {
  kind: 'item' | 'recipe';
  id: string;
  /** Item the entry opens in the card (a recipe opens its main output). */
  item: ItemId;
  label: string;
  /** Recipe detail line: its inputs. */
  detail?: string;
  icon: string | null;
  search: string;
}

/** "IronIngot" → "iron ingot": the game id doubles as an English search alias. */
const idWords = (id: string) => id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();

export function buildIndex(data: GameData, name: (key: string) => string): PaletteEntry[] {
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  const items = Object.values(data.items).map(
    (i): PaletteEntry => ({
      kind: 'item',
      id: i.id,
      item: i.id,
      label: name(i.nameKey),
      icon: i.icon,
      search: `${name(i.nameKey)} ${idWords(i.id)}`.toLowerCase(),
    }),
  );
  const recipes = Object.values(data.recipes)
    .filter((r) => !r.hidden)
    .flatMap((r): PaletteEntry[] => {
      const out = mainOutput(r);
      if (!out) return [];
      const inputs = r.inputs.map((s) => itemName(s.item)).join(' + ');
      return [
        {
          kind: 'recipe',
          id: r.id,
          item: out.item,
          label: name(r.nameKey),
          detail: inputs,
          icon: data.items[out.item]?.icon ?? null,
          search: `${name(r.nameKey)} ${inputs} ${idWords(r.id)}`.toLowerCase(),
        },
      ];
    });
  return [...items, ...recipes];
}

/**
 * All words must match. Ranking: label starts with the query, then word-start match, then anywhere;
 * recipes rank below items (see rank) so the card of the item is the first answer.
 */
export function searchIndex(index: PaletteEntry[], query: string, limit = 40): PaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return index.filter((e) => e.kind === 'item').slice(0, limit);
  const words = q.split(/\s+/);
  const rank = (e: PaletteEntry) => {
    const label = e.label.toLowerCase();
    const base = label.startsWith(q) ? 0 : label.split(/\s+/).some((w) => w.startsWith(words[0]!)) ? 1 : 2;
    // Recipes sit two steps lower: "уголь" should answer with the item «Древесный уголь»
    // before the recipe «Уголь из брёвен», which merely starts with the word.
    return (e.kind === 'item' ? base : base + 2) * 2 + (e.kind === 'item' ? 0 : 1);
  };
  return index
    .filter((e) => words.every((w) => e.search.includes(w)))
    .map((e) => ({ e, r: rank(e) }))
    .sort((a, b) => a.r - b.r || a.e.label.localeCompare(b.e.label))
    .slice(0, limit)
    .map((x) => x.e);
}
