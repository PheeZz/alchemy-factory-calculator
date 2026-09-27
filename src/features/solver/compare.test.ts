// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { comparePlans, solve } from './index';
import { level0, levels, plan } from './fixtures/builders';
import { heatersData } from './fixtures/heaters';

describe('comparePlans', () => {
  it('reports b − a for machines, raw, fuel, heat, belts, area and build cost', async () => {
    const p = plan({ targets: [{ item: 'Ingot', rate: 100 }], fuel: 'Coal' });
    const a = await solve(heatersData, p, level0);
    // Factory speed 4 (×2): 10 → 5 crucibles, stoves ceil(5/4) = 2 instead of 3.
    const b = await solve(heatersData, p, levels({ factorySpeed: 4 }));
    const diff = comparePlans(a, b);
    expect(diff.machinesByBuilding).toEqual([
      { building: 'Crucible', a: 10, b: 5, delta: -5 },
      { building: 'Stove', a: 3, b: 2, delta: -1 },
    ]);
    expect(diff.machines).toEqual({ a: 13, b: 7, delta: -6 });
    expect(diff.machinesExact).toEqual({ a: 12.5, b: 6.25, delta: -6.25 }); // 10 + 10/4 vs 5 + 5/4
    // Same Ore and same heat per batch: raw and fuel do not move; heat/s is per batch too.
    expect(diff.raw).toEqual([{ item: 'Ore', a: 100, b: 100, delta: 0 }, { item: 'Coal', a: 60, b: 60, delta: 0 }]);
    expect(diff.fuel).toEqual([{ item: 'Coal', a: 60, b: 60, delta: 0 }]);
    // Stoves: 20 Stone each; 1-cell fixture buildings → floor = stoves, cells = machines + stoves.
    expect(diff.buildCost).toEqual([{ item: 'Stone', a: 60, b: 40, delta: -20 }]);
    expect(diff.area).toEqual({ floor: { a: 3, b: 2, delta: -1 }, cells: { a: 13, b: 7, delta: -6 } });
    expect(diff.belts.delta).toBe(0);
  });

  it('an item only one side has shows up with 0 on the other', async () => {
    const a = await solve(heatersData, plan({ targets: [{ item: 'Ingot', rate: 10 }] }), level0);
    const b = await solve(heatersData, plan({ targets: [{ item: 'Ingot', rate: 10 }], fuel: 'Coal' }), level0);
    expect(comparePlans(a, b).fuel).toEqual([{ item: 'Coal', a: 0, b: 6, delta: 6 }]); // 10 batches·24 heat / 40
  });
});
