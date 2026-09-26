// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { linkFactories, solve } from './index';
import { level0, plan } from './fixtures/builders';
import { chainData } from './fixtures/chain';

describe('linkFactories', () => {
  it('matches imports with other factories’ targets and surplus', async () => {
    // Ingots: 60/min as a target. Gears A: 50 Gear needs 75 Ingot (import). Gears B: 20 Gear → 30 Ingot.
    const ingots = plan({ targets: [{ item: 'Ingot', rate: 60 }] });
    const gearsA = plan({ targets: [{ item: 'Gear', rate: 50 }], imports: ['Ingot'] });
    const gearsB = plan({ targets: [{ item: 'Gear', rate: 20 }], imports: ['Ingot'] });
    const net = linkFactories([
      { id: 'ingots', plan: ingots, result: await solve(chainData, ingots, level0) },
      { id: 'gearsA', plan: gearsA, result: await solve(chainData, gearsA, level0) },
      { id: 'gearsB', plan: gearsB, result: await solve(chainData, gearsB, level0) },
    ]);
    const ingot = net.items.find((i) => i.item === 'Ingot')!;
    // Supply 60, demand 75 + 30 = 105 → 45 short; each importer gets its share of the 60.
    expect(ingot.supplied).toBeCloseTo(60, 9);
    expect(ingot.demanded).toBeCloseTo(105, 9);
    expect(ingot.balance).toBeCloseTo(-45, 9);
    const flow = (to: string) => net.flows.find((f) => f.item === 'Ingot' && f.to === to)!.rate;
    expect(flow('gearsA')).toBeCloseTo((60 * 75) / 105, 9);
    expect(flow('gearsB')).toBeCloseTo((60 * 30) / 105, 9);
    // The ingot factory's Slag surplus (60 batches · 0.5) and the gears are listed as supply nobody imports.
    const slag = net.items.find((i) => i.item === 'Slag')!;
    expect(slag.supply).toEqual([{ factory: 'ingots', rate: expect.closeTo(30, 9) }]);
    expect(slag.balance).toBeCloseTo(30, 9);
    expect(net.items.find((i) => i.item === 'Gear')!.supplied).toBeCloseTo(70, 9);
  });

  it('a surplus covers the demand in full', async () => {
    const big = plan({ targets: [{ item: 'Ingot', rate: 100 }] });
    const small = plan({ targets: [{ item: 'Gear', rate: 20 }], imports: ['Ingot'] });
    const net = linkFactories([
      { id: 'big', plan: big, result: await solve(chainData, big, level0) },
      { id: 'small', plan: small, result: await solve(chainData, small, level0) },
    ]);
    // 30 Ingot needed of 100 supplied: the flow is the full 30, 70 left over.
    expect(net.flows).toEqual([{ from: 'big', to: 'small', item: 'Ingot', rate: expect.closeTo(30, 9) }]);
    expect(net.items.find((i) => i.item === 'Ingot')!.balance).toBeCloseTo(70, 9);
  });
});
