import type { GameData } from '@/shared/data/types';
import type { WorkerRequest, WorkerResponse } from './client';
import { solve } from './index';
import { SolverError } from './types';

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
      return { id: msg.id, ok: true, result: await solve(data, msg.plan, msg.levels) };
    } catch (e) {
      const err = e instanceof SolverError ? e : null;
      return {
        id: msg.id,
        ok: false,
        code: err?.code ?? 'infeasible',
        item: err?.item,
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
