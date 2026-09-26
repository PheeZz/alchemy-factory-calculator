// @vitest-environment node
/**
 * Golden cases on the real build data. Every expectation is derived by hand from the recipe rows
 * in public/data/25321648/gamedata.json (quoted per case) and cross-checked against starfi5h's
 * alchemy_db.js where it has the same recipe (its batches are sometimes a multiple of ours; the
 * per-minute rates agree). Defaults: upgrades 0, fuel Coal (540 heat), fertilizer BasicFertilizer
 * (144 nutrients, 12 nutrients/s).
 */
import { describe, expect, it } from 'vitest';
import type { FactoryPlan, SolveResult, UpgradeLevels } from './types';
import { solve, SolverError } from './index';
import { level0, levels, plan } from './fixtures/builders';
import { loadRealData } from './fixtures/real';

const data = loadRealData();

function run(targets: FactoryPlan['targets'], patch: Partial<FactoryPlan> = {}, lv: UpgradeLevels = level0) {
  return solve(data, plan({ targets, fuel: 'Coal', fertilizer: 'BasicFertilizer', ...patch }), lv);
}

function node(res: SolveResult, id: string) {
  const n = res.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id}: ${res.nodes.map((x) => x.id).join(',')}`);
  return n;
}

function flow(res: SolveResult, from: string, to: string, item: string) {
  return res.edges.filter((e) => e.from === from && e.to === to && e.item === item).reduce((s, e) => s + e.perMin, 0);
}

const raw = (res: SolveResult, item: string) => res.totals.raw.find((s) => s.item === item)?.qty ?? 0;

describe('golden: real data', () => {
  it('Plank (Table Saw): 1 Wood → 200 in 400 s', async () => {
    const res = await run([{ item: 'WoodBoard', rate: 60 }]);
    // 60/200 = 0.3 batches/min; 0.3·400/60 = 2 saws; Wood 0.3/min. starfi5h "Plank": same row.
    expect(node(res, 'WoodBoard').batchesPerMin).toBeCloseTo(0.3, 9);
    expect(node(res, 'WoodBoard').machinesExact).toBeCloseTo(2, 9);
    expect(raw(res, 'Wood')).toBeCloseTo(0.3, 9);
    expect(res.totals.heatPerSec).toBe(0);
  });

  it('Iron Ingot (Iron Smelter, heat 9/s) fired with Coal', async () => {
    const res = await run([{ item: 'IronIngot', rate: 60 }]);
    // 1 IronOre → 100 in 600 s: x = 0.6, 0.6·600/60 = 6 smelters, heat 6·9 = 54/s.
    // Coal: 54·60/540 = 6/min; Coal row 1 CoalOre → 120 in 360 s → x = 0.05, 0.3 crushers.
    const ingot = node(res, 'IronIngot');
    expect(ingot.machinesExact).toBeCloseTo(6, 9);
    expect(ingot.fuel?.item).toBe('Coal');
    expect(ingot.fuel?.rate).toBeCloseTo(6, 9);
    expect(node(res, 'Coal').machinesExact).toBeCloseTo(0.3, 9);
    expect(raw(res, 'IronOre')).toBeCloseTo(0.6, 9);
    expect(raw(res, 'CoalOre')).toBeCloseTo(0.05, 9);
    expect(res.totals.heatPerSec).toBeCloseTo(54, 9);
  });

  it('Charcoal (Crucible, heat 4/s) burning its own Charcoal', async () => {
    const res = await run([{ item: 'Charcoal', rate: 60 }], { fuel: 'Charcoal' });
    // 1 Plank → 1 Charcoal in 4 s: heat/batch 16, 16/40 = 0.4 burned → net 0.6 → x = 100,
    // 100·4/60 = 6.667 crucibles, 40 Charcoal/min to the fire; Plank 100/min = 0.5 saw batches → 3.333 saws.
    const charcoal = node(res, 'Charcoal');
    expect(charcoal.batchesPerMin).toBeCloseTo(100, 9);
    expect(charcoal.machinesExact).toBeCloseTo(20 / 3, 9);
    expect(charcoal.fuel?.rate).toBeCloseTo(40, 9);
    expect(flow(res, 'Charcoal', 'Charcoal', 'Charcoal')).toBeCloseTo(40, 9);
    expect(node(res, 'WoodBoard').machinesExact).toBeCloseTo(10 / 3, 9);
    expect(raw(res, 'Wood')).toBeCloseTo(0.5, 9);
  });

  it('Flax (Auto Nursery) with Basic Fertilizer', async () => {
    const res = await run([{ item: 'Flax', rate: 60 }]);
    // 4800 nutrients → 200 Flax: time 4800/12 = 400 s (= GrowthSeconds); x = 0.3 → 0.3·400/60 = 2 plots;
    // fertilizer 0.3·4800/144 = 10/min. starfi5h: 24 nutrients/Flax, maxFertility 12 → 2 s/Flax/plot.
    const flax = node(res, 'Nursery_FlaxSeed');
    expect(flax.machinesExact).toBeCloseTo(2, 9);
    expect(flax.fertilizer?.item).toBe('BasicFertilizer');
    expect(flax.fertilizer?.rate).toBeCloseTo(10, 9);
  });

  it('Redcurrant: Advanced Fertilizer at Factory Efficiency 1 = 75/min per plot (in-game)', async () => {
    const res = await run([{ item: 'Redcurrant', rate: 75 }], { fertilizer: 'AdvancedFertilizer' }, levels({ factorySpeed: 1 }));
    // 21600 nutrients → 150: 21600/144 = 150 s at speed 1 → 60/min per plot; ×1.25 → 75/min → 1 plot.
    expect(node(res, 'Nursery_RedcurrantSeed').machinesExact).toBeCloseTo(1, 9);
    // Consumption: 0.5 batches·21600/720 = 15 Advanced Fertilizer/min.
    expect(node(res, 'Nursery_RedcurrantSeed').fertilizer?.rate).toBeCloseTo(15, 9);
  });

  it('Coke (Athanor): side Charcoal feeds back into Charcoal Powder', async () => {
    const res = await run([{ item: 'Coke', rate: 10 }]);
    // 6 CharcoalPowder → 0.5 Coke + 1 Charcoal in 3 s: x = 20 → 1 Athanor, 120 powder/min, 20 Charcoal back;
    // Crucibles make only 120 − 20 = 100. Athanor heat 32/s → 32·60/540 = 3.556 Coal/min.
    // starfi5h "Coke": 12 → 1 Coke + 2 Charcoal in 6 s (same rates).
    const coke = node(res, 'Coke');
    expect(coke.machinesExact).toBeCloseTo(1, 9);
    expect(coke.fuel?.rate).toBeCloseTo(32 / 9, 9);
    expect(flow(res, 'CharcoalPowder', 'Coke', 'CharcoalPowder')).toBeCloseTo(120, 9);
    expect(node(res, 'Charcoal').batchesPerMin).toBeCloseTo(100, 9);
    expect(flow(res, 'Coke', 'CharcoalPowder', 'Charcoal')).toBeCloseTo(20, 9);
  });

  it('Linseed Oil (Extractor, yieldSkill, liquid)', async () => {
    const res = await run([{ item: 'LinseedOil', rate: 120 }]);
    // 1 Flax → 20 in 2 s: x = 6 → 0.2 extractors, Flax 6/min; liquid → no belts.
    expect(node(res, 'LinseedOil').machinesExact).toBeCloseTo(0.2, 9);
    expect(flow(res, 'Nursery_FlaxSeed', 'LinseedOil', 'Flax')).toBeCloseTo(6, 9);
    expect(res.edges.find((e) => e.to === 'target:LinseedOil')?.belts).toBe(0);
    // Alchemy 2 (×1.12): 120/(20·1.12) = 5.357 batches.
    const skilled = await run([{ item: 'LinseedOil', rate: 120 }], {}, levels({ alchemySkill: 2 }));
    expect(node(skilled, 'LinseedOil').batchesPerMin).toBeCloseTo(120 / 22.4, 9);
  });

  it('Steel Ingot (Athanor) returns 3/4 of its Iron Ingot', async () => {
    const res = await run([{ item: 'SteelIngot', rate: 15 }]);
    // 1 IronIngot + 1 CokePowder → 0.25 Steel + 0.75 IronIngot in 4 s: x = 60 → 4 Athanors;
    // 60 Iron in, 45 back out → smelters make 15 (x 0.15 → 1.5); CokePowder 60/min.
    // Heat 4·32 = 128/s → 128·60/540 = 14.222 Coal/min. starfi5h: 4+4 → 1 Steel + 3 Iron in 16 s.
    const steel = node(res, 'SteelIngot');
    expect(steel.machinesExact).toBeCloseTo(4, 9);
    expect(steel.fuel?.rate).toBeCloseTo(128 / 9, 9);
    expect(flow(res, 'SteelIngot', 'SteelIngot', 'IronIngot')).toBeCloseTo(45, 9);
    expect(flow(res, 'IronIngot', 'SteelIngot', 'IronIngot')).toBeCloseTo(15, 9);
    expect(node(res, 'IronIngot').machinesExact).toBeCloseTo(1.5, 9);
    expect(flow(res, 'CokePowder', 'SteelIngot', 'CokePowder')).toBeCloseTo(60, 9);
  });

  it('Salt Water (Extractor, liquid) from Athanor Salt with Sand byproduct', async () => {
    const res = await run([{ item: 'SaltWater', rate: 100 }]);
    // 1 Salt → 20 in 4 s: x = 5 → 1/3 extractor. Salt row yields 0.333333 per 6 s batch:
    // x = 5/0.333333 = 15.000015 → 1.5 Athanors, Sand side 4·15 ≈ 60/min unused.
    expect(node(res, 'SaltWater').machinesExact).toBeCloseTo(1 / 3, 9);
    expect(node(res, 'Salt').machinesExact).toBeCloseTo(1.5, 4);
    expect(res.totals.byproducts.find((s) => s.item === 'Sand')?.qty).toBeCloseTo(60, 3);
    expect(res.edges.filter((e) => e.item === 'SaltWater').every((e) => e.belts === 0)).toBe(true);
  });

  it('Glass (Kiln, heat 15/s) down to Limestone', async () => {
    const res = await run([{ item: 'Glass', rate: 10 }]);
    // 6 Sand → 1 in 6 s: x = 10 → 1 kiln; Sand 60 (1 Stone → 1 in 12 s → 12 grinders);
    // Stone 1 Limestone → 150 in 450 s: x = 0.4 → 3 crushers; Coal 15·60/540 = 1.667/min.
    expect(node(res, 'Glass').machinesExact).toBeCloseTo(1, 9);
    expect(node(res, 'Glass').fuel?.rate).toBeCloseTo(5 / 3, 9);
    expect(node(res, 'Sand').machinesExact).toBeCloseTo(12, 9);
    expect(node(res, 'Stone').machinesExact).toBeCloseTo(3, 9);
    expect(raw(res, 'Limestone')).toBeCloseTo(0.4, 9);
  });

  it('Nails (Processor)', async () => {
    const res = await run([{ item: 'Nails', rate: 30 }]);
    // 1 IronIngot → 3 in 12 s: x = 10 → 2 processors; Iron 10/min → 1 smelter.
    expect(node(res, 'Nails').machinesExact).toBeCloseTo(2, 9);
    expect(node(res, 'IronIngot').machinesExact).toBeCloseTo(1, 9);
    expect(raw(res, 'IronOre')).toBeCloseTo(0.1, 9);
  });

  it('Brandy (Alembic, liquid in and out) from Redcurrant', async () => {
    const res = await run([{ item: 'Brandy', rate: 80 }]);
    // 5 CokePowder + 100 FruitWine → 40 in 5 s: x = 2 → 1/6 alembic; FruitWine 200/min
    // (1 Redcurrant → 10 in 6 s: x = 20 → 2 extractors); Redcurrant 20/min = 0.1333 nursery batches,
    // 21600/12 = 1800 s each → 4 plots (starfi5h: 144 nutrients/berry at fertility 12 → 12 s/berry).
    expect(node(res, 'Brandy').machinesExact).toBeCloseTo(1 / 6, 9);
    expect(flow(res, 'FruitWine', 'Brandy', 'FruitWine')).toBeCloseTo(200, 9);
    expect(flow(res, 'CokePowder', 'Brandy', 'CokePowder')).toBeCloseTo(10, 9);
    expect(node(res, 'FruitWine').machinesExact).toBeCloseTo(2, 9);
    expect(node(res, 'Nursery_RedcurrantSeed').machinesExact).toBeCloseTo(4, 9);
  });
});

/** Items that cannot be solved yet; keep explicit so the list only shrinks. */
const KNOWN_INFEASIBLE: string[] = [];

describe('golden: sweep', () => {
  it('every producible item solves in hybrid mode', async () => {
    const producible = Object.values(data.items).filter(
      (item) =>
        !item.raw &&
        Object.values(data.recipes).some((r) => !r.special && !r.hidden && r.outputs.some((o) => o.item === item.id)),
    );
    expect(producible.length).toBeGreaterThan(100);
    const failed: string[] = [];
    for (const item of producible) {
      try {
        const res = await run([{ item: item.id, rate: 1 }]);
        if (!res.edges.some((e) => e.to === `target:${item.id}`)) failed.push(`${item.id}: no target edge`);
      } catch (e) {
        failed.push(e instanceof SolverError ? `${item.id}: ${e.code} ${e.item ?? ''}` : `${item.id}: ${String(e)}`);
      }
    }
    expect(failed.map((f) => f.split(':')[0]).sort()).toEqual([...KNOWN_INFEASIBLE].sort());
  }, 60_000);
});
