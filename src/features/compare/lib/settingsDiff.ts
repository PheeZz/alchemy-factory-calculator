import type { ItemId } from '@/shared/data/types';
import type { FactoryPlan, Rate } from '@/features/solver/types';

type Value = string | number | null;

export type SettingChange =
  | { kind: 'target' | 'supply'; item: ItemId; a: number | null; b: number | null }
  | { kind: 'mode' | 'optimize' | 'maximize' | 'fuel' | 'fertilizer' | 'heater'; a: string | null; b: string | null }
  | {
      kind: 'recipeFor' | 'buildingFor' | 'fuelFor' | 'fertilizerFor' | 'heaterFor' | 'catalystFor' | 'machineCaps';
      /** Item for recipeFor, recipe for the rest. */
      key: string;
      a: Value;
      b: Value;
    }
  | { kind: 'import'; item: ItemId; a: boolean; b: boolean }
  /** Learned tech count; null = everything open. */
  | { kind: 'unlocked'; a: number | null; b: number | null };

const MAPS = ['recipeFor', 'buildingFor', 'fuelFor', 'fertilizerFor', 'heaterFor', 'catalystFor', 'machineCaps'] as const;
const VALUES = ['mode', 'optimize', 'fuel', 'fertilizer', 'heater'] as const;

const keysOf = (a: object, b: object) => [...new Set([...Object.keys(a), ...Object.keys(b)])];

/** Per-item rate changes; an item listed twice counts once with the summed rate. */
function rateChanges(kind: 'target' | 'supply', a: Rate[], b: Rate[]): SettingChange[] {
  const sum = (list: Rate[]) => {
    const m: Record<string, number> = {};
    for (const r of list) m[r.item] = (m[r.item] ?? 0) + r.rate;
    return m;
  };
  const ra = sum(a);
  const rb = sum(b);
  return keysOf(ra, rb)
    .filter((item) => ra[item] !== rb[item])
    .map((item) => ({ kind, item, a: ra[item] ?? null, b: rb[item] ?? null }));
}

/** What differs between two plans' settings, in plan-field order (targets first). */
export function settingsDiff(a: FactoryPlan, b: FactoryPlan): SettingChange[] {
  const out: SettingChange[] = [];

  if (a.mode === 'targets' || b.mode === 'targets') out.push(...rateChanges('target', a.targets, b.targets));
  for (const kind of VALUES) {
    // Absent and null both mean "the default" (heater predates the field on older plans).
    const x = a[kind] ?? null;
    const y = b[kind] ?? null;
    if (x !== y) out.push({ kind, a: x, b: y });
  }
  // Supplies and the maximized item are dead weight in targets mode: only diff them where they count.
  if (a.mode === 'fromInput' || b.mode === 'fromInput') {
    out.push(...rateChanges('supply', a.supplies, b.supplies));
    if (a.maximize !== b.maximize) out.push({ kind: 'maximize', a: a.maximize, b: b.maximize });
  }
  for (const kind of MAPS) {
    const ma: Record<string, Value> = a[kind] ?? {};
    const mb: Record<string, Value> = b[kind] ?? {};
    for (const key of keysOf(ma, mb)) {
      const x = ma[key] ?? null;
      const y = mb[key] ?? null;
      if (x !== y) out.push({ kind, key, a: x, b: y });
    }
  }
  const ia = new Set(a.imports);
  const ib = new Set(b.imports);
  for (const item of new Set([...ia, ...ib])) {
    if (ia.has(item) !== ib.has(item)) out.push({ kind: 'import', item, a: ia.has(item), b: ib.has(item) });
  }
  const ua = a.unlocked?.length ?? null;
  const ub = b.unlocked?.length ?? null;
  if (ua !== ub) out.push({ kind: 'unlocked', a: ua, b: ub });
  return out;
}
