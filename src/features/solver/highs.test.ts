// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { runLp } from './highs';
import { SolverError } from './types';

describe('runLp', () => {
  it('solves LP text', async () => {
    const res = await runLp('Minimize\n obj: + 1 x\nSubject To\n c: + 1 x >= 2\nEnd');
    expect(res.status).toBe('Optimal');
    expect(res.value('x')).toBe(2);
  });

  it('a model HiGHS cannot read is an internal error', async () => {
    const err = await runLp('Minimize\n obj: + 1 x\nSubject To\n c: + 1 x = NaN\nEnd').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SolverError);
    expect(err).toMatchObject({ code: 'internal' });
  });
});

describe('solve status mapping', () => {
  it('an unexpected HiGHS status is internal, not infeasible', async () => {
    vi.resetModules();
    vi.doMock('./highs', () => ({ runLp: async () => ({ status: 'Solve error', value: () => 0 }) }));
    const { solve } = await import('./index');
    const { chainData } = await import('./fixtures/chain');
    const { level0, plan } = await import('./fixtures/builders');
    const err = await solve(chainData, plan({ targets: [{ item: 'Gear', rate: 1 }] }), level0).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'internal' });
    vi.doUnmock('./highs');
  });
});
