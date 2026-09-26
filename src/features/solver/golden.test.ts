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

describe('golden: late game (Crown)', () => {
  // Crown: 3 GoldIngot + 1 Ruby + 1 Sapphire → 1 (Omni-Machine, 15 s); Ruby/Sapphire come only from
  // special cauldron rows, so they are raw imports. At 0.1 Crown/min, hybrid defaults:
  //   GoldIngot 0.3 ← GoldDust5 0.3 ← 2 GoldDust3 = 0.6/min.
  //   GoldDust3 (Adv. Athanor): 1 SilverPowder3 + 1 VolcanicAsh + 18 Mercury → 0.1 GD3 + 0.3 GD2 + 0.6 GD
  //     → x = 6: SP3 6, VolcanicAsh 6, Mercury 108; GD2 1.8 and GD 3.6 left over. (starfi5h "Gold Dust":
  //     10 + 10 + 180 → 1 + 3 + 6, same row ×10.) This 10 % yield multiplies everything upstream by 10.
  //   Mercury (Adv. Alembic, yield): 1 SilverPowder + 1 Vitae + 80 SulfuricAcid → 10 → x = 10.8.
  //   SilverPowder3: 4 CopperPowder2 + 2 BlackPowder → 0.2 SP3 + 0.8 SP → x = 30 (SP side 24, 13.2 spare).
  //   CopperPowder2: 6 IronSand + 6 SoapPowder → 0.5 CP2 + 0.5 CP → x = 240 → IronSand 1440/min;
  //     IronSand is a 30 s grind → 1440·30/60 = 720 grinders.
  //   VolcanicAsh 6 ← Obsidian 6: 2 Mors + 1 Crystal1 → 0.5 Obsidian + 0.5 Marble → x = 12 → Crystal1 12.
  //   Crystal1 ← 2 Shard3 ← … ← 2^10 Sand (7 Sand refinings, starfi5h "Refined Sand" 128 → 1 Shard1):
  //     12·1024 = 12288 Sand, Sand2 x = 6144; the Salt row's side Sand covers 1555.2, grinders make
  //     the other 10732.8 at 12 s → 2146.6 grinders — the single biggest node.
  //   Salt: SulfuricAcid 864/min = 43.2 batches → 2592 SaltWater → 129.6 Salt → x = 129.6/0.333333 = 388.8.
  //   Quicklime 4575.2 = BasicFertilizer 2720 + Salt 4·388.8 + Limewater 9000/30.
  //   BasicFertilizer 2720 feeds Sage (PlantAsh for Soap + the fertilizer itself) and Flax (LinseedOil for Soap).
  //   Iron: SulfurPowder 103.2 (BlackPowder 60 + SulfuricAcid 43.2) → Sulfur x = 103.2/40 = 2.58 (Pyrite),
  //     whose side 2.58·120 = 309.6 IronIngot covers part of IronSand's 1440; smelters make the other
  //     1130.4 from Iron Ore (x = 11.304 → 113.04 smelters). Hybrid weighs imports by value, so it does
  //     not burn 11 000-copper Pyrite for the side ingots (Iron Ore is 1 200) — no Sulfur surplus.
  // Total ≈ 7709 machines at 0.1/min, i.e. 4.63 M at 60/min: arithmetic, not a bug. The waste is in
  // the default recipes (GD/GD2 side products not refined up, Shard1 from sand rather than Quartz).
  const crown = [{ item: 'Crown', rate: 0.1 }];

  it('hybrid chain matches the hand derivation', async () => {
    const res = await run(crown);
    expect(node(res, 'GoldDust3').batchesPerMin).toBeCloseTo(6, 9);
    expect(node(res, 'Mercury').batchesPerMin).toBeCloseTo(10.8, 9);
    expect(node(res, 'SilverPowder3').batchesPerMin).toBeCloseTo(30, 9);
    expect(node(res, 'CopperPowder2').batchesPerMin).toBeCloseTo(240, 9);
    expect(node(res, 'IronSand').machinesExact).toBeCloseTo(720, 9);
    expect(node(res, 'Obsidian').batchesPerMin).toBeCloseTo(12, 9);
    expect(node(res, 'Sand2').batchesPerMin).toBeCloseTo(6144, 9);
    expect(node(res, 'Salt').batchesPerMin).toBeCloseTo(129.6 / 0.333333, 6);
    expect(node(res, 'Sand').machinesExact).toBeCloseTo(((12288 - (4 * 129.6) / 0.333333) * 12) / 60, 6);
    expect(node(res, 'BasicFertilizer').batchesPerMin).toBeCloseTo(2720, 3);
    expect(node(res, 'Sulfur').batchesPerMin).toBeCloseTo(2.58, 9);
    expect(node(res, 'IronIngot').batchesPerMin).toBeCloseTo(11.304, 9);
    expect(raw(res, 'Pyrite')).toBeCloseTo(2.58, 9);
    expect(raw(res, 'IronOre')).toBeCloseTo(11.304, 9);
    const surplus = (item: string) => res.totals.surplus.find((s) => s.item === item)?.qty ?? 0;
    expect(surplus('GoldDust2')).toBeCloseTo(1.8, 9);
    expect(surplus('GoldDust')).toBeCloseTo(3.6, 9);
    expect(surplus('Sulfur')).toBe(0);
    const total = res.nodes.reduce((s, n) => s + n.machinesExact, 0);
    expect(total).toBeCloseTo(7708.8, 0);
  });

  it('optimize machines finds a chain an order of magnitude smaller', async () => {
    const hybrid = (await run(crown)).nodes.reduce((s, n) => s + n.machinesExact, 0);
    const optimized = (await run(crown, { optimize: 'machines' })).nodes.reduce((s, n) => s + n.machinesExact, 0);
    expect(optimized).toBeLessThan(hybrid / 10);
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
