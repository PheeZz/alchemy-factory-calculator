import type { GameData } from '@/shared/data/types';
import { linkFactories } from '@/features/solver';
import { clampLevels, sanitizePlan, sanitizeUnlocked } from '@/features/factory/stale';
import { getSolverClient } from '@/features/factory/solverClient';
import { useFactoryStore } from '@/features/factory/store';
import { useCachedQuery } from '@/shared/lib/useCachedQuery';
import { solveAll } from '../lib/network';

/** All factories solved (in the worker, same inputs as the calculator) and linked by their imports. */
export function useNetwork(data: GameData) {
  const factories = useFactoryStore((s) => s.factories);
  const levels = useFactoryStore((s) => s.levels);
  const unlocked = useFactoryStore((s) => s.unlocked);
  const open = sanitizeUnlocked(data, unlocked);
  const inputs = factories.map((f) => ({ id: f.id, plan: { ...sanitizePlan(data, f.plan).plan, unlocked: open } }));
  const lv = clampLevels(data, levels);
  return useCachedQuery(JSON.stringify(['network', data.build.id, inputs, lv]), async () => {
    const { runs, failed } = await solveAll(inputs, (plan) => getSolverClient().solve(data, plan, lv));
    return { network: linkFactories(runs), failed, solved: runs.map((r) => r.id) };
  });
}
