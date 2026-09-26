import type { GameData, ItemId } from '@/shared/data/types';
import type { FuelRank, FuelVariant, FuelVariantOptions } from './rank-fuels';
import type { ProfitVariant, ProfitVariantOptions } from './rank-profit';
import type { PlanSummary, UpgradeImpact } from './upgrade-impact';
import { SolverError, type FactoryPlan, type SolveResult, type SolverErrorCode, type UpgradeLevels } from './types';

/** Jobs the worker runs against the cached GameData. */
export type WorkerJob =
  | { type: 'solve'; plan: FactoryPlan; levels: UpgradeLevels }
  | { type: 'rankFuels'; levels: UpgradeLevels; fertilizer: ItemId | null }
  | { type: 'rankFuelVariants'; levels: UpgradeLevels; opts: FuelVariantOptions }
  | { type: 'rankProfitVariants'; levels: UpgradeLevels; opts: ProfitVariantOptions }
  | { type: 'upgradeImpact'; plan: FactoryPlan; levels: UpgradeLevels };

export type UpgradeImpactResult = { before: PlanSummary; impacts: UpgradeImpact[] };
export type WorkerResult = SolveResult | FuelRank[] | FuelVariant[] | ProfitVariant[] | UpgradeImpactResult;

export type WorkerRequest = { type: 'data'; data: GameData } | (WorkerJob & { id: number; buildId: string });

export type WorkerResponse =
  | { id: number; ok: true; result: WorkerResult }
  | { id: number; ok: false; code: SolverErrorCode; item?: ItemId; message: string; requiredTech?: string[] };

export const SOLVE_TIMEOUT_MS = 10_000;

interface Pending {
  resolve(result: WorkerResult): void;
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
      else p.reject(new SolverError(msg.code, msg.item, msg.message, msg.requiredTech));
    };
    w.onerror = (e: ErrorEvent) => {
      reset();
      failAll(new SolverError('internal', undefined, `solver worker failed: ${e.message}`));
    };
    return (worker = w);
  };

  const run = (data: GameData, job: WorkerJob): Promise<WorkerResult> => {
    const w = ensureWorker();
    if (postedBuild !== data.build.id) {
      w.postMessage({ type: 'data', data } satisfies WorkerRequest);
      postedBuild = data.build.id;
    }
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // HiGHS blocks the worker thread, so a runaway solve can only be stopped by killing it;
        // everything queued behind it dies too.
        reset();
        failAll(new SolverError('timeout'));
      }, SOLVE_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      w.postMessage({ ...job, id, buildId: data.build.id } satisfies WorkerRequest);
    });
  };

  return {
    solve: (data: GameData, plan: FactoryPlan, levels: UpgradeLevels) =>
      run(data, { type: 'solve', plan, levels }) as Promise<SolveResult>,
    rankFuels: (data: GameData, levels: UpgradeLevels, fertilizer: ItemId | null = null) =>
      run(data, { type: 'rankFuels', levels, fertilizer }) as Promise<FuelRank[]>,
    rankFuelVariants: (data: GameData, levels: UpgradeLevels, opts: FuelVariantOptions) =>
      run(data, { type: 'rankFuelVariants', levels, opts }) as Promise<FuelVariant[]>,
    rankProfitVariants: (data: GameData, levels: UpgradeLevels, opts: ProfitVariantOptions) =>
      run(data, { type: 'rankProfitVariants', levels, opts }) as Promise<ProfitVariant[]>,
    upgradeImpact: (data: GameData, plan: FactoryPlan, levels: UpgradeLevels) =>
      run(data, { type: 'upgradeImpact', plan, levels }) as Promise<UpgradeImpactResult>,
    dispose() {
      reset();
      failAll(new SolverError('internal', undefined, 'solver disposed'));
    },
  };
}
