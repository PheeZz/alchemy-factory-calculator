// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { solve } from './index';
import { level0, plan } from './fixtures/builders';
import { loadRealData } from './fixtures/real';
import type { SolveResult } from './types';

const data = loadRealData();
const node = (res: SolveResult, id: string) => res.nodes.find((n) => n.id === id)!;
const surplus = (res: SolveResult, item: string) => res.totals.surplus.find((s) => s.item === item)?.qty ?? 0;
const imported = (res: SolveResult, item: string) => res.totals.imports.find((s) => s.item === item)?.qty ?? 0;

describe('catalysts (real data: Gold Dust, Advanced Athanor)', () => {
  // GoldDust3: 1 SilverPowder3 + 1 VolcanicAsh + 18 Mercury → 0.1 GD3 + 0.3 GD2 + 0.6 GD in 8 s; CatalystCost 1000.
  // Inputs and catalysts are imported to keep the chain to one node.
  const base = plan({
    targets: [{ item: 'GoldDust3', rate: 1 }],
    fuel: 'Coal',
    imports: ['SilverPowder3', 'VolcanicAsh', 'Mercury', 'Catalyst1', 'Catalyst2', 'Catalyst3', 'Catalyst4'],
  });
  const run = (catalyst?: string) => solve(data, catalyst ? { ...base, catalystFor: { GoldDust3: catalyst } } : base, level0);

  it('without a catalyst: 10 batches for 1 Gold Dust', async () => {
    const res = await run();
    expect(node(res, 'GoldDust3').batchesPerMin).toBeCloseTo(10, 9);
    expect(node(res, 'GoldDust3').catalyst).toBeUndefined();
  });

  it('Unstable (180 charges): UnstableSequence 1/5 main → 5 batches, 5·1000/180 catalysts', async () => {
    const res = await run('Catalyst1');
    expect(node(res, 'GoldDust3').batchesPerMin).toBeCloseTo(5, 9);
    expect(node(res, 'GoldDust3').catalyst).toEqual({ item: 'Catalyst1', rate: expect.closeTo(5000 / 180, 9) });
    expect(imported(res, 'Catalyst1')).toBeCloseTo(5000 / 180, 9);
    expect(surplus(res, 'GoldDust2')).toBeCloseTo(4, 9); // 0.8 × 5
  });

  it('Fertile (240): outputs doubled → 5 batches, 5·1000/240 catalysts', async () => {
    const res = await run('Catalyst2');
    expect(node(res, 'GoldDust3').batchesPerMin).toBeCloseTo(5, 9);
    expect(node(res, 'GoldDust3').catalyst?.rate).toBeCloseTo(5000 / 240, 9);
    expect(surplus(res, 'GoldDust')).toBeCloseTo(6, 9); // 0.6 × 2 × 5
  });

  it('Resonant (1500): every product each batch → 1 batch, 1000/1500 catalysts', async () => {
    const res = await run('Catalyst3');
    expect(node(res, 'GoldDust3').batchesPerMin).toBeCloseTo(1, 9);
    expect(node(res, 'GoldDust3').catalyst?.rate).toBeCloseTo(1000 / 1500, 9);
    expect(surplus(res, 'GoldDust2')).toBeCloseTo(1, 9);
  });

  it('Eternal (99999): no material inputs, 10 batches', async () => {
    const res = await run('Catalyst4');
    expect(node(res, 'GoldDust3').batchesPerMin).toBeCloseTo(10, 9);
    expect(imported(res, 'Mercury')).toBe(0);
    expect(node(res, 'GoldDust3').catalyst?.rate).toBeCloseTo(10000 / 99999, 12);
  });

  it('a catalyst on a recipe that takes none is ignored', async () => {
    const res = await solve(data, plan({ targets: [{ item: 'Coke', rate: 10 }], fuel: 'Coal', catalystFor: { Coke: 'Catalyst1' } }), level0);
    expect(node(res, 'Coke').catalyst).toBeUndefined();
  });
});

describe('cauldron rows (real data)', () => {
  it('Ruby stays a bought raw item unless its cauldron row is chosen', async () => {
    const p = plan({ targets: [{ item: 'Ruby', rate: 1 }], imports: ['Diamond2', 'GoldDust5', 'Catalyst3'] });
    expect((await solve(data, p, level0)).totals.raw).toEqual([{ item: 'Ruby', qty: expect.closeTo(1, 9) }]);
    // Ruby_Alt: Diamond2 + GoldDust5 + Catalyst3 → 1 Ruby in 30.9 s → 1 batch/min = 0.515 cauldrons.
    const res = await solve(data, { ...p, recipeFor: { Ruby: 'Ruby_Alt' } }, level0);
    expect(node(res, 'Ruby_Alt').machinesExact).toBeCloseTo(30.9 / 60, 9);
    expect(res.totals.raw).toEqual([]);
    expect(imported(res, 'Diamond2')).toBeCloseTo(1, 9);
  });
});
