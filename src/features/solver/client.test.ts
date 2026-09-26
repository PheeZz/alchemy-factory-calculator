// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSolverClient, SOLVE_TIMEOUT_MS, type WorkerRequest } from './client';
import { createWorkerHandler } from './worker';
import { rankFuels, rankFuelVariants, rankProfitVariants, solve, SolverError, upgradeImpact } from './index';
import { heatData } from './fixtures/heat';
import { level0, plan } from './fixtures/builders';
import { chainData } from './fixtures/chain';

/** In-process stand-in for a module Worker: same message protocol, async delivery. */
function fakeWorker(respond = true) {
  const handle = createWorkerHandler();
  const posted: WorkerRequest[] = [];
  const w = {
    onmessage: null as ((e: MessageEvent) => void) | null,
    onerror: null as ((e: ErrorEvent) => void) | null,
    terminated: false,
    postMessage(msg: WorkerRequest) {
      posted.push(msg);
      if (!respond) return;
      void handle(structuredClone(msg)).then((reply) => {
        if (reply && !w.terminated) w.onmessage?.({ data: reply } as MessageEvent);
      });
    },
    terminate() {
      w.terminated = true;
    },
  };
  return { w, posted, worker: w as unknown as Worker };
}

afterEach(() => vi.useRealTimers());

describe('createSolverClient', () => {
  it('matches the in-thread solve and posts GameData once per build', async () => {
    const fake = fakeWorker();
    const client = createSolverClient(() => fake.worker);
    const p = plan({ targets: [{ item: 'Gear', rate: 50 }] });
    const [a, b] = await Promise.all([client.solve(chainData, p, level0), client.solve(chainData, p, level0)]);
    expect(a).toEqual(await solve(chainData, p, level0));
    expect(b).toEqual(a);
    expect(fake.posted.map((m) => m.type)).toEqual(['data', 'solve', 'solve']);

    await client.solve({ ...chainData, build: { id: 'other', version: '1' } }, p, level0);
    expect(fake.posted.map((m) => m.type)).toEqual(['data', 'solve', 'solve', 'data', 'solve']);
    client.dispose();
  });

  it('ranks fuels in the worker', async () => {
    const client = createSolverClient(() => fakeWorker().worker);
    expect(await client.rankFuels(heatData, level0)).toEqual(await rankFuels(heatData, level0));
    const opts = { fertilizer: null, heating: 'self' } as const;
    expect(await client.rankFuelVariants(heatData, level0, opts)).toEqual(await rankFuelVariants(heatData, level0, opts));
    client.dispose();
  });

  it('runs the profit ranking and the upgrade advisor in the worker', async () => {
    const client = createSolverClient(() => fakeWorker().worker);
    const p = plan({ targets: [{ item: 'Gear', rate: 50 }] });
    expect(await client.upgradeImpact(chainData, p, level0)).toEqual(await upgradeImpact(chainData, p, level0));
    const opts = { fuel: null, fertilizer: null };
    expect(await client.rankProfitVariants(chainData, level0, opts)).toEqual(await rankProfitVariants(chainData, level0, opts));
    client.dispose();
  });

  it('rejects with the SolverError raised in the worker', async () => {
    const client = createSolverClient(() => fakeWorker().worker);
    const err = await client.solve(chainData, plan({ targets: [{ item: 'Alloy', rate: 1 }] }), level0).catch((e) => e);
    expect(err).toBeInstanceOf(SolverError);
    expect(err).toMatchObject({ code: 'unreachable', item: 'Mystery' });
    client.dispose();
  });

  it('a crashed worker rejects pending solves as internal', async () => {
    const fake = fakeWorker(false);
    const client = createSolverClient(() => fake.worker);
    const pending = client.solve(chainData, plan({ targets: [{ item: 'Gear', rate: 1 }] }), level0).catch((e) => e);
    fake.w.onerror?.({ message: 'boom' } as ErrorEvent);
    expect(await pending).toMatchObject({ code: 'internal' });
    client.dispose();
  });

  it('times out, kills the stuck worker and starts a fresh one with the data re-posted', async () => {
    vi.useFakeTimers();
    const workers = [fakeWorker(false), fakeWorker()];
    let created = 0;
    const client = createSolverClient(() => workers[created++]!.worker);
    const p = plan({ targets: [{ item: 'Gear', rate: 50 }] });

    const stuck = client.solve(chainData, p, level0).catch((e) => e);
    vi.advanceTimersByTime(SOLVE_TIMEOUT_MS);
    expect(await stuck).toMatchObject({ code: 'timeout' });
    expect(workers[0]!.w.terminated).toBe(true);

    vi.useRealTimers();
    await expect(client.solve(chainData, p, level0)).resolves.toBeTruthy();
    expect(workers[1]!.posted.map((m) => m.type)).toEqual(['data', 'solve']);
    client.dispose();
  });
});
