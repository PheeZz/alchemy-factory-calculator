import type { ProfitVariant } from '@/features/solver';
import { useFactoryStore } from '@/features/factory/store';
import { useViewStore } from '@/shared/lib/view';

const DEFAULT_RATE = 60;

/** "Использовать": the item becomes a target of the active factory, made along this recipe path. */
export function applyProfit(v: ProfitVariant) {
  const s = useFactoryStore.getState();
  s.mergeRecipes(v.recipeFor);
  s.addTarget({ item: v.item, rate: DEFAULT_RATE });
  useViewStore.getState().setView('calculator');
}
