import type { GameData } from '@/shared/data/types';
import type { WorkerJob, WorkerRequest, WorkerResponse } from './client';
import { rankFuels, rankFuelVariants } from './rank-fuels';
import { rankProfitVariants } from './rank-profit';
import { upgradeImpact } from './upgrade-impact';
import { solve } from './solve';
import { SolverError } from './types';

function run(data: GameData, job: WorkerJob) {
  switch (job.type) {
    case 'solve':
      return solve(data, job.plan, job.levels);
    case 'rankFuels':
      return rankFuels(data, job.levels, job.fertilizer);
    case 'rankFuelVariants':
      return rankFuelVariants(data, job.levels, job.opts);
    case 'rankProfitVariants':
      return rankProfitVariants(data, job.levels, job.opts);
    case 'upgradeImpact':
      return upgradeImpact(data, job.plan, job.levels);
  }
}

/** Message handler with its own GameData cache; exported so tests can drive it without a real Worker. */
export function createWorkerHandler() {
  let data: GameData | null = null;
  return async (msg: WorkerRequest): Promise<WorkerResponse | null> => {
    if (msg.type === 'data') {
      data = msg.data;
      return null;
    }
    try {
      if (data?.build.id !== msg.buildId) throw new Error(`game data ${msg.buildId} was not posted to the worker`);
      const result = await run(data, msg);
      return { id: msg.id, ok: true, result };
    } catch (e) {
      const err = e instanceof SolverError ? e : null;
      return {
        id: msg.id,
        ok: false,
        code: err?.code ?? 'internal',
        item: err?.item,
        requiredTech: err?.requiredTech,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  };
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  const scope = self as unknown as DedicatedWorkerGlobalScope;
  const handle = createWorkerHandler();
  scope.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const reply = await handle(e.data);
    if (reply) scope.postMessage(reply);
  };
}
