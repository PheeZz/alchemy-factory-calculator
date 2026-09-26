import { useEffect, useRef, useState } from 'react';
import type { GameData } from '@/shared/data/types';
// Imported from client/types, not the solver index: the index pulls HiGHS into the main bundle,
// while the client only spawns the worker that loads it.
import { createSolverClient } from '@/features/solver/client';
import { SolverError, type FactoryPlan, type SolveResult, type SolverErrorCode, type UpgradeLevels } from '@/features/solver/types';
import { clampLevels, sanitizePlan } from './stale';

export interface SolveErrorInfo {
  code: SolverErrorCode;
  item?: string;
}

export interface SolveState {
  result: SolveResult | null;
  status: 'idle' | 'solving' | 'error';
  error?: SolveErrorInfo;
}

const DEBOUNCE_MS = 150;

// One worker for the app lifetime: HiGHS WASM init and the GameData post are paid once.
let client: ReturnType<typeof createSolverClient> | null = null;
const getClient = () => (client ??= createSolverClient());

const hasWork = (plan: FactoryPlan) =>
  plan.mode === 'targets' ? plan.targets.some((t) => t.rate > 0) : plan.maximize !== null;

export const toErrorInfo = (e: unknown): SolveErrorInfo =>
  e instanceof SolverError ? { code: e.code, item: e.item } : { code: 'internal' };

/** Debounced solve of the active plan; answers to superseded requests are dropped by sequence number. */
export function useSolve(data: GameData, plan: FactoryPlan, levels: UpgradeLevels): SolveState {
  const [state, setState] = useState<SolveState>({ result: null, status: 'idle' });
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const clean = sanitizePlan(data, plan).plan;
    if (!hasWork(clean)) {
      setState({ result: null, status: 'idle' });
      return;
    }
    // Previous graph stays on screen while solving, so typing a rate does not flash an empty canvas.
    setState((s) => ({ result: s.result, status: 'solving' }));
    const timer = setTimeout(() => {
      getClient()
        .solve(data, clean, clampLevels(data, levels))
        .then(
          (result) => id === seq.current && setState({ result, status: 'idle' }),
          (e: unknown) => id === seq.current && setState({ result: null, status: 'error', error: toErrorInfo(e) }),
        );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [data, plan, levels]);

  return state;
}
