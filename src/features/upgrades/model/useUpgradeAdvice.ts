import type { GameData } from '@/shared/data/types';
import { clampLevels, sanitizePlan } from '@/features/factory/stale';
import { getSolverClient } from '@/features/factory/solverClient';
import { useFactoryStore } from '@/features/factory/store';
import { useSolvePlan } from '@/features/factory/useSolvePlan';
import { useCachedQuery } from '@/shared/lib/useCachedQuery';
import { useDebounced } from '@/shared/lib/useDebounced';

// Six extra solves per call: wait for the plan to settle so typing a rate does not queue dozens.
const DEBOUNCE_MS = 800;

/** What +1 level of each upgrade track would change for the active plan (solved in the worker). */
export function useUpgradeAdvice(data: GameData) {
  const plan = useSolvePlan(data);
  const levels = useFactoryStore((s) => s.levels);
  const clean = sanitizePlan(data, plan).plan;
  const hasWork = clean.mode === 'targets' ? clean.targets.some((t) => t.rate > 0) : clean.maximize !== null;
  const lv = clampLevels(data, levels);
  const key = useDebounced(hasWork ? JSON.stringify(['upgrades', data.build.id, clean, lv]) : null, DEBOUNCE_MS);
  return { hasWork, state: useCachedQuery(key, () => getSolverClient().upgradeImpact(data, clean, lv)) };
}
