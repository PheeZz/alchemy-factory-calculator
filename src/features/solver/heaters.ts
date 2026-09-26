import type { Building, BuildingId, GameData, Item } from '@/shared/data/types';
import type { FactoryPlan } from './types';

const isHeater = (b: Building | undefined): b is Building => (b?.heatSlots ?? 0) > 0;

/** A heater takes liquid fuel (Steam) through pipe ports and solid fuel through belt ports. */
const feeds = (b: Building, liquid: boolean) => b.ports.some((p) => p.pipe === liquid && p.dir !== 'out');

/**
 * Cheapest heater by build value that can take the fuel (solid when none is given): for solid fuel
 * the one available from the start (Stone Stove; a furnace is a deliberate upgrade), for Steam the pad.
 */
export function defaultHeater(data: GameData, fuel: Item | null = null): BuildingId | null {
  const buildValue = (b: Building) => b.buildCost.reduce((sum, s) => sum + s.qty * (data.items[s.item]?.value ?? 0), 0) + b.buildCostMoney;
  return (
    Object.values(data.buildings)
      .filter((b) => isHeater(b) && feeds(b, fuel?.liquid ?? false))
      .sort((a, b) => buildValue(a) - buildValue(b) || (a.id < b.id ? -1 : 1))[0]?.id ?? null
  );
}

/**
 * Heater for one heated recipe: node override, else plan-wide, else the default. Each step is skipped
 * when it is not a heater or cannot take the node's fuel; a node without fuel accepts any heater.
 */
export function pickHeater(data: GameData, plan: FactoryPlan, recipeId: string, fuel: Item | null): Building | null {
  const fits = (b: Building | undefined): b is Building => isHeater(b) && (!fuel || feeds(b, fuel.liquid));
  const chain = [plan.heaterFor?.[recipeId], plan.heater, defaultHeater(data, fuel)];
  return chain.map((id) => (id ? data.buildings[id] : undefined)).find(fits) ?? null;
}
