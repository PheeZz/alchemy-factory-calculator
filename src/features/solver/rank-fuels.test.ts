// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { defaultFuel, rankFuels } from './index';
import { level0, levels } from './fixtures/builders';
import { heatData } from './fixtures/heat';
import { loadRealData } from './fixtures/real';

describe('rankFuels', () => {
  it('ranks by machines per heat, then raw per heat', async () => {
    const ranks = await rankFuels(heatData, level0);
    // Coal (raw, 40 heat): 1000 heat/s = 1500/min imported, no machines.
    // Plank (10 heat): 6000/min net; each 10 s batch burns 20/10 = 2 of its 4 → x = 3000,
    // 3000·10/60 = 500 sawmills, 3000 Log → 0.5 machines and 3 raw per heat/s.
    expect(ranks.map((r) => r.item)).toEqual(['Coal', 'Plank']);
    // First made (non-raw) fuel; only raw ones → the best raw; nothing → null.
    expect(defaultFuel(ranks, heatData)).toBe('Plank');
    expect(defaultFuel(ranks.slice(0, 1), heatData)).toBe('Coal');
    expect(defaultFuel([], heatData)).toBeNull();
    expect(ranks[0]).toEqual({ item: 'Coal', machinesPerHeat: 0, rawPerHeat: 1.5 });
    expect(ranks[1]!.machinesPerHeat).toBeCloseTo(0.5, 9);
    expect(ranks[1]!.rawPerHeat).toBeCloseTo(3, 9);
    // Fuel efficiency 5 (×1.5): Plank burns 4/3 per batch, nets 8/3 → 4000/(8/3) = 1500 batches → 250 sawmills.
    const eff = await rankFuels(heatData, levels({ fuelEfficiency: 5 }));
    expect(eff[1]!.machinesPerHeat).toBeCloseTo(0.25, 9);
  });

  it('real data: raw Coal Ore and Wood need no machines, crushed Coal is the best made fuel', async () => {
    const ranks = await rankFuels(loadRealData(), level0, 'BasicFertilizer');
    // Coal: 60000/540 = 111.1/min = 0.926 ore batches → 0.926·360/60 = 5.556 crushers per 1000 heat/s.
    expect(ranks.slice(0, 3).map((r) => r.item)).toEqual(['CoalOre', 'Wood', 'Coal']);
    expect(defaultFuel(ranks, loadRealData())).toBe('Coal');
    expect(ranks[2]!.machinesPerHeat).toBeCloseTo(5.5556 / 1000, 6);
    // CharcoalPowder (the old UI default) burns a third of its own heat in the crucible: 312.5 machines/1000.
    expect(ranks.find((r) => r.item === 'CharcoalPowder')!.machinesPerHeat).toBeCloseTo(0.3125, 9);
  });
});
