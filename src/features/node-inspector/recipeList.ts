import type { Recipe } from '@/shared/data/types';

export const COLLAPSED_COUNT = 4;

export function filterRecipes(recipes: Recipe[], query: string, text: (r: Recipe) => string): Recipe[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return recipes;
  return recipes.filter((r) => {
    const hay = `${text(r)} ${r.id}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Collapsed view keeps the top few plus the current choice, so the selected card never disappears. */
export function visibleRecipes(recipes: Recipe[], currentId: string, expanded: boolean): Recipe[] {
  if (expanded || recipes.length <= COLLAPSED_COUNT + 1) return recipes;
  const top = recipes.slice(0, COLLAPSED_COUNT);
  const current = recipes.find((r) => r.id === currentId);
  return current && !top.includes(current) ? [...top, current] : top;
}
