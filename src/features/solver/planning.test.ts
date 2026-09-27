// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameData } from '@/shared/data/types';
import { buildList, byproductOptions, rankProfitVariants, solve, SolverError, upgradeImpact } from './index';
import { level0, levels, plan } from './fixtures/builders';
import { chainData } from './fixtures/chain';
import { heatersData } from './fixtures/heaters';
import { loadRealData } from './fixtures/real';

const real = loadRealData();

describe('rankProfitVariants', () => {
  // chainData with shop prices: Ore (buy 5, value 1) resold, Ingot value 10, Gear value 40.
  const shop: GameData = {
    ...chainData,
    items: {
      ...chainData.items,
      Ore: { ...chainData.items.Ore!, sellType: 'groceries' },
      Ingot: { ...chainData.items.Ingot!, sellType: 'groceries' },
      Gear: { ...chainData.items.Gear!, sellType: 'groceries' },
    },
  };

  it('fixture: per-item and per-machine margins, resale last', async () => {
    const v = await rankProfitVariants(shop, level0, { fuel: null, fertilizer: null });
    expect(v.map((x) => x.item)).toEqual(['Gear', 'Ingot', 'Ore']);
    // Gear: 3 Ingot → 2 Gear (6 s) = 1.5 Ingot = 3 Ore = 15 copper per Gear; 40 − 15 = 25.
    // Machines per Gear/min: 0.5 batch·6/60 = 0.05 presses + 1.5 batches·3/60 = 0.075 smelters = 0.125.
    const gear = v[0]!;
    expect(gear.rawCostPerItem).toBeCloseTo(15, 9);
    expect(gear.marginPerItem).toBeCloseTo(25, 9);
    expect(gear.machinesPerItem).toBeCloseTo(0.125, 9);
    expect(gear.marginPerMachine).toBeCloseTo(200, 9);
    expect(gear.salePerMachine).toBeCloseTo(320, 9);
    expect(gear.valueMultiplier).toBeCloseTo(40 / 15, 9);
    expect(gear.byproductValuePerItem).toBeCloseTo(0.75, 9); // 0.75 Slag × value 1
    // Ingot: 2 Ore = 10 copper for a value-10 ingot → margin 0 on 0.05 machines.
    expect(v[1]).toMatchObject({ marginPerItem: expect.closeTo(0, 9), marginPerMachine: expect.closeTo(0, 9) });
    // Resale of the raw: no machines, value 1 − buy 5.
    expect(v[2]).toMatchObject({ path: [], machinesPerItem: 0, marginPerItem: -4, marginPerMachine: null });
  });

  it('licence tiers raise the sale price additively (store-wide + category)', async () => {
    const withBonuses: GameData = {
      ...shop,
      saleBonuses: [
        { id: 'GeneralGoodsProfit', nameKey: 'g', sellTypes: ['groceries'], maxLevel: 2, values: [0, 0.1, 0.24] },
        { id: 'StoreProfit', nameKey: 's', sellTypes: 'all', maxLevel: 1, values: [0, 0.1] },
        { id: 'JewelProfit', nameKey: 'j', sellTypes: ['jewelry'], maxLevel: 1, values: [0, 0.5] },
      ],
    };
    // Gear (groceries): 1 + 0.24 + 0.1 = 1.34 → 40 × 1.34 = 53.6, margin 53.6 − 15 = 38.6; the jewel line
    // does not apply; a tier above max is clamped.
    const v = await rankProfitVariants(withBonuses, level0, {
      fuel: null,
      fertilizer: null,
      saleLevels: { GeneralGoodsProfit: 9, StoreProfit: 1, JewelProfit: 1 },
    });
    const gear = v.find((x) => x.item === 'Gear')!;
    expect(gear.saleMultiplier).toBeCloseTo(1.34, 12);
    expect(gear.salePrice).toBeCloseTo(53.6, 9);
    expect(gear.marginPerItem).toBeCloseTo(38.6, 9);
  });

  it('real data: every sellable item that can be made, well within the worker budget', async () => {
    const t0 = performance.now();
    const v = await rankProfitVariants(real, level0, { fuel: 'Coal', fertilizer: 'BasicFertilizer' });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(2000);
    expect(new Set(v.map((x) => x.item)).size).toBeGreaterThanOrEqual(45);
    // Salt via Rock Salt (StoneCrusher, 1 → 100 Salt + 100 Sand in 600 s): 9000/100 = 90 copper per Salt
    // for a price of 100; 0.6 batches for 60/min → 6 crushers → 0.1 machine per Salt/min → 100 per machine.
    const salt = v.find((x) => x.item === 'Salt' && x.path[0] === 'Salt_Alt')!;
    expect(salt.marginPerItem).toBeCloseTo(10, 6);
    expect(salt.marginPerMachine).toBeCloseTo(100, 6);
  });
});

describe('upgradeImpact', () => {
  it('re-solves with each track +1 and sorts by machines saved', async () => {
    const p = plan({ targets: [{ item: 'Gear', rate: 50 }] });
    const { before, impacts } = await upgradeImpact(chainData, p, level0);
    // Base: 2.5 presses + 3.75 smelters = 6.25 (3 + 4 built); belts 3 + 2 + 1 + 1 (Ore, Ingot, Gear, Slag).
    expect(before).toMatchObject({ machinesExact: 6.25, machines: 7, belts: 7 });
    expect(impacts.map((i) => i.track)).toEqual(['factorySpeed', 'conveyor', 'alchemySkill', 'fuelEfficiency', 'fertilizerEfficiency']);
    // Speed ×1.25: 5 exact, 2 + 3 built.
    expect(impacts[0]!.delta).toMatchObject({ machinesExact: expect.closeTo(-1.25, 9), machines: -2, belts: 0 });
    // Belt 75/min: Ore 150 → 2, Ingot 75 → 1: two belts fewer.
    expect(impacts[1]!.delta).toMatchObject({ machinesExact: expect.closeTo(0, 9), belts: -2 });
    // A track at its max is skipped.
    const maxed = await upgradeImpact(chainData, p, levels({ factorySpeed: 20 }));
    expect(maxed.impacts.map((i) => i.track)).not.toContain('factorySpeed');
  });
});

describe('area, build list, byproducts', () => {
  it('area: heated machines stand on their heaters (real data)', async () => {
    const res = await solve(real, plan({ targets: [{ item: 'IronIngot', rate: 60 }], fuel: 'Coal' }), level0);
    // 6 smelters (3×3, 27 cells) on 6 stoves (3×3, 27 cells): ground 6·9 = 54, cells 6·27 + 6·27 = 324.
    expect(res.nodes.find((n) => n.id === 'IronIngot')!.area).toEqual({ floor: 54, cells: 324 });
    // + 1 crusher (3×3, 27 cells) for Coal.
    expect(res.totals.area).toEqual({ floor: 63, cells: 351 });
  });

  it('build list: machines and heaters with unit and total cost', async () => {
    const res = await solve(heatersData, plan({ targets: [{ item: 'Ingot', rate: 100 }], fuel: 'Coal' }), level0);
    expect(buildList(heatersData, res)).toEqual([
      { building: 'Crucible', count: 10, unitCost: [], unitMoney: 0, totalCost: [], totalMoney: 0 },
      { building: 'Stove', count: 3, unitCost: [{ item: 'Stone', qty: 20 }], unitMoney: 0, totalCost: [{ item: 'Stone', qty: 60 }], totalMoney: 0 },
    ]);
  });

  it('byproducts: sale, heat and consumers of the surplus', async () => {
    const res = await solve(chainData, plan({ targets: [{ item: 'Gear', rate: 50 }] }), level0);
    const [slag] = byproductOptions(chainData, res);
    // 75 Ingot batches leave 37.5 Slag/min; R_Brick takes 1 per batch → 37.5 batches, 4 s on a Press → 2.5 machines.
    expect(slag).toMatchObject({ item: 'Slag', perMin: 37.5, saleValuePerMin: null, heatPerSec: null });
    expect(slag!.consumers).toEqual([
      { recipe: 'R_Brick', product: 'Brick', batchesPerMin: 37.5, machinesExact: 2.5, otherInputs: ['Ingot'] },
    ]);
    // Real data: Coke from bought Charcoal Powder leaves its side Charcoal (1 per batch, 20 batches) over:
    // a fuel of 40 heat → 20·40/60 = 13.33 heat/s; no shop buys it; the grinder (4 s) takes it as is.
    const coke = await solve(real, plan({ targets: [{ item: 'Coke', rate: 10 }], fuel: 'Coal', imports: ['CharcoalPowder'] }), level0);
    const charcoal = byproductOptions(real, coke).find((o) => o.item === 'Charcoal')!;
    expect(charcoal).toMatchObject({ perMin: expect.closeTo(20, 9), saleValuePerMin: null, heatPerSec: expect.closeTo(40 / 3, 9) });
    expect(charcoal.consumers[0]).toEqual({
      recipe: 'CharcoalPowder',
      product: 'CharcoalPowder',
      batchesPerMin: expect.closeTo(20, 9),
      machinesExact: expect.closeTo(4 / 3, 9),
      otherInputs: [],
    });
  });
});

describe('machine caps (reverse calc)', () => {
  it('fromInput: one belt of Ore needs no cap; a machine cap bounds the output', async () => {
    // One belt = 60 Ore/min → 30 Ingot → 20 Gear.
    const belt = plan({ mode: 'fromInput', supplies: [{ item: 'Ore', rate: 60 }], maximize: 'Gear' });
    const r1 = await solve(chainData, belt, level0);
    expect(r1.edges.find((e) => e.to === 'target:Gear')!.perMin).toBeCloseTo(20, 6);
    // Plenty of Ore but 1 press: 60/6 = 10 batches → 20 Gear; 0.5 press → 10 Gear.
    const one = plan({ mode: 'fromInput', supplies: [{ item: 'Ore', rate: 1000 }], maximize: 'Gear', machineCaps: { R_Gear: 1 } });
    expect((await solve(chainData, one, level0)).edges.find((e) => e.to === 'target:Gear')!.perMin).toBeCloseTo(20, 6);
    const half = { ...one, machineCaps: { R_Gear: 0.5 } };
    expect((await solve(chainData, half, level0)).edges.find((e) => e.to === 'target:Gear')!.perMin).toBeCloseTo(10, 6);
  });

  it('targets beyond the cap are infeasible; bad caps are rejected', async () => {
    const p = plan({ targets: [{ item: 'Gear', rate: 50 }], machineCaps: { R_Gear: 1 } });
    await expect(solve(chainData, p, level0)).rejects.toMatchObject({ code: 'infeasible', item: 'Gear' });
    await expect(solve(chainData, { ...p, machineCaps: { R_Gear: -1 } }, level0)).rejects.toBeInstanceOf(SolverError);
    await expect(solve(chainData, { ...p, machineCaps: { R_Gear: -1 } }, level0)).rejects.toMatchObject({ code: 'invalidInput' });
  });
});
