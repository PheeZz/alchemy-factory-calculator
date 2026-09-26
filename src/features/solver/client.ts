import type { GameData, ItemId } from '@/shared/data/types';
import { SolverError, type FactoryPlan, type SolveResult, type SolverErrorCode, type UpgradeLevels } from './types';

export type WorkerRequest =
  | { type: 'data'; data: GameData }
  | { type: 'solve'; id: number; buildId: string; plan: FactoryPlan; levels: UpgradeLevels };

export type WorkerResponse =
  | { id: number; ok: true; result: SolveResult }
  | { id: number; ok: false; code: SolverErrorCode; item?: ItemId; message: string };

export const SOLVE_TIMEOUT_MS = 10_000;

interface Pending {
  resolve(result: SolveResult): void;
  reject(error: SolverError): void;
  timer: ReturnType<typeof setTimeout>;
}

export function createSolverClient(
  createWorker: () => Worker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
) {
  let worker: Worker | null = null;
  // GameData is ~0.5 MB: post it once per build instead of with every solve.
  let postedBuild: string | null = null;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const failAll = (error: SolverError) => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    pending.clear();
  };
  const reset = () => {
    worker?.terminate();
    worker = null;
    postedBuild = null;
  };

  const ensureWorker = (): Worker => {
    if (worker) return worker;
    const w = createWorker();
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new SolverError(msg.code, msg.item, msg.message));
    };
    w.onerror = (e: ErrorEvent) => {
      reset();
      // ponytail: the contract has no 'internal' code; a crashed worker surfaces as 'infeasible' with its message
      failAll(new SolverError('infeasible', undefined, `solver worker failed: ${e.message}`));
    };
    return (worker = w);
  };

  return {
    solve(data: GameData, plan: FactoryPlan, levels: UpgradeLevels): Promise<SolveResult> {
      const w = ensureWorker();
      if (postedBuild !== data.build.id) {
        w.postMessage({ type: 'data', data } satisfies WorkerRequest);
        postedBuild = data.build.id;
      }
      const id = nextId++;
      return new Promise<SolveResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          // HiGHS blocks the worker thread, so a runaway solve can only be stopped by killing it;
          // everything queued behind it dies too.
          reset();
          failAll(new SolverError('timeout'));
        }, SOLVE_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        w.postMessage({ type: 'solve', id, buildId: data.build.id, plan, levels } satisfies WorkerRequest);
      });
    },
    dispose() {
      reset();
      failAll(new SolverError('timeout', undefined, 'solver disposed'));
    },
  };
}
