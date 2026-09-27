import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import type { FactoryPlan, SolveResult } from '@/features/solver/types';
import { clampLevels, sanitizePlan, sanitizeUnlocked } from '@/features/factory/stale';
import { getSolverClient } from '@/features/factory/solverClient';
import { useFactoryStore, type Factory } from '@/features/factory/store';
import { hasWork, toErrorInfo, type SolveErrorInfo } from '@/features/factory/useSolve';
import { useCachedQuery } from '@/shared/lib/useCachedQuery';
import { resolvePair } from '../lib/pair';
import { useCompareStore } from './useCompareStore';

export type SideState =
  | { status: 'none' | 'empty' | 'loading' }
  | { status: 'error'; error: SolveErrorInfo }
  | { status: 'ready'; result: SolveResult };

export interface Side {
  factory: Factory | null;
  /** The plan exactly as solved: stale ids dropped, the player's tech folded in. */
  plan: FactoryPlan | null;
  state: SideState;
}

/** One factory solved in the worker with the calculator's inputs, cached per plan for the session. */
function useSide(data: GameData, factory: Factory | null): Side {
  const levels = useFactoryStore((s) => s.levels);
  const unlocked = useFactoryStore((s) => s.unlocked);
  const plan = useMemo(
    () => (factory ? { ...sanitizePlan(data, factory.plan).plan, unlocked: sanitizeUnlocked(data, unlocked) } : null),
    [data, factory, unlocked],
  );
  const lv = clampLevels(data, levels);
  const work = plan !== null && hasWork(plan);
  const q = useCachedQuery(work ? JSON.stringify(['solve', data.build.id, plan, lv]) : null, () => getSolverClient().solve(data, plan!, lv));
  const state: SideState = !factory
    ? { status: 'none' }
    : !work
      ? { status: 'empty' }
      : q.status === 'ready'
        ? { status: 'ready', result: q.data }
        : q.status === 'error'
          ? { status: 'error', error: toErrorInfo(q.error) }
          : { status: 'loading' };
  return { factory, plan, state };
}

/** The two compared factories (picked or defaulted) and their solves. */
export function useComparePair(data: GameData) {
  const factories = useFactoryStore((s) => s.factories);
  const activeId = useFactoryStore((s) => s.activeId);
  const pick = useCompareStore();
  const ids = resolvePair(
    factories.map((f) => f.id),
    activeId,
    pick,
  );
  const find = (id: string | null) => factories.find((f) => f.id === id) ?? null;
  return { ids, a: useSide(data, find(ids.a)), b: useSide(data, find(ids.b)) };
}
