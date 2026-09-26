import type { ItemId } from '@/shared/data/types';
import { useFactoryStore } from '@/features/factory/store';
import { useTierControls } from '@/features/fuel-tiers/model/useTierControls';
import { useViewStore } from '@/shared/lib/view';

const DEFAULT_RATE = 60;

/** Adds the item as a target of the active factory and shows the calculator. */
export function addItemAsTarget(item: ItemId) {
  useFactoryStore.getState().addTarget({ item, rate: DEFAULT_RATE });
  useViewStore.getState().setView('calculator');
}

/** Opens the fuel tier list scrolled to this fuel. */
export function showInFuelTiers(item: ItemId) {
  useTierControls.getState().setHighlight(item);
  useViewStore.getState().setView('fuel');
}
