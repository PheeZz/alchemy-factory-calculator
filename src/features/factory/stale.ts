import type { GameData } from '@/shared/data/types';
import type { FactoryPlan, UpgradeLevels } from '@/features/solver/types';

const pickKeys = <V>(rec: Record<string, V>, keep: (k: string, v: V) => boolean) =>
  Object.fromEntries(Object.entries(rec).filter(([k, v]) => keep(k, v)));

/**
 * Drops ids the loaded game data does not know (preset from an older build, hand-edited file)
 * so the solver never sees them. The stored plan is left untouched: ids come back if data does.
 */
export function sanitizePlan(data: GameData, plan: FactoryPlan): { plan: FactoryPlan; unknown: string[] } {
  const unknown = new Set<string>();
  const item = (id: string) => (id in data.items ? true : (unknown.add(id), false));
  const recipe = (id: string) => (id in data.recipes ? true : (unknown.add(id), false));
  const building = (id: string) => (id in data.buildings ? true : (unknown.add(id), false));
  const optItem = (id: string | null) => (id === null || item(id) ? id : null);

  const clean: FactoryPlan = {
    ...plan,
    targets: plan.targets.filter((t) => item(t.item)),
    supplies: plan.supplies.filter((s) => item(s.item)),
    maximize: optItem(plan.maximize),
    recipeFor: pickKeys(plan.recipeFor, (i, r) => item(i) && recipe(r)),
    buildingFor: pickKeys(plan.buildingFor, (r, b) => recipe(r) && building(b)),
    imports: plan.imports.filter(item),
    fuel: optItem(plan.fuel),
    fuelFor: pickKeys(plan.fuelFor, (r, i) => recipe(r) && item(i)),
    fertilizer: optItem(plan.fertilizer),
    fertilizerFor: pickKeys(plan.fertilizerFor, (r, i) => recipe(r) && item(i)),
  };
  return { plan: clean, unknown: [...unknown].sort() };
}

/** Levels saved against a build with longer tracks are capped to what this build offers. */
export function clampLevels(data: GameData, levels: UpgradeLevels): UpgradeLevels {
  const out = { ...levels };
  for (const t of data.upgrades) out[t.id] = Math.max(0, Math.min(t.maxLevel, Math.round(levels[t.id] ?? 0)));
  return out;
}
