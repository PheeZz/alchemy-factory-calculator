// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameData } from '@/shared/data/types';
import { solve, SolverError } from './index';
import type { SolveResult } from './types';
import { level0, levels, plan } from './fixtures/builders';
import { chainData } from './fixtures/chain';
import { heatData } from './fixtures/heat';
import { edgeData } from './fixtures/edge';
import { largeData, largeTarget } from './fixtures/large';

function node(res: SolveResult, id: string) {
  const n = res.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id}: ${res.nodes.map((x) => x.id).join(',')}`);
  return n;
}

function edge(res: SolveResult, from: string, to: string, item: string) {
  const e = res.edges.find((x) => x.from === from && x.to === to && x.item === item);
  if (!e) throw new Error(`no edge ${from}->${to} ${item}: ${JSON.stringify(res.edges)}`);
  return e;
}

/** Stack with float tolerance: LP values carry ~1e-9 relative noise. */
const approx = (item: string, qty: number) => ({ item, qty: expect.closeTo(qty, 6) });

const ids = (res: SolveResult) => res.nodes.map((n) => n.id).sort();

async function solveError(data: GameData, p: Parameters<typeof solve>[1]): Promise<SolverError> {
  try {
    await solve(data, p, level0);
  } catch (e) {
    if (e instanceof SolverError) return e;
    throw e;
  }
  throw new Error('expected SolverError');
}

describe('solve', () => {
  it('linear chain: exact rates, machines, edges and totals', async () => {
    const res = await solve(chainData, plan({ targets: [{ item: 'Gear', rate: 50 }] }), level0);

    // Gear: 50/min ÷ 2 per batch = 25 batches/min; 25·6 s / 60 = 2.5 machines → 3, 2.5/3 utilized.
    const gear = node(res, 'R_Gear');
    expect(gear.batchesPerMin).toBeCloseTo(25, 9);
    expect(gear.machinesExact).toBeCloseTo(2.5, 9);
    expect(gear.machines).toBe(3);
    expect(gear.utilization).toBeCloseTo(2.5 / 3, 9);
    expect(gear.building).toBe('Press');

    // Ingot: 25·3 = 75/min = 75 batches; 75·3 s / 60 = 3.75 machines → 4.
    const ingot = node(res, 'R_Ingot');
    expect(ingot.batchesPerMin).toBeCloseTo(75, 9);
    expect(ingot.machinesExact).toBeCloseTo(3.75, 9);
    expect(ingot.machines).toBe(4);
    expect(ingot.utilization).toBeCloseTo(0.9375, 9);
    expect(ingot.portWarnings).toEqual([]);

    expect(ids(res)).toEqual(['R_Gear', 'R_Ingot']);

    // Ore: 75·2 = 150/min → 3 belts at 60; Ingot 75 → 2 belts; Slag side output 75·0.5 = 37.5 unused.
    expect(edge(res, 'import:Ore', 'R_Ingot', 'Ore')).toMatchObject({ perMin: 150, belts: 3 });
    expect(edge(res, 'R_Ingot', 'R_Gear', 'Ingot')).toMatchObject({ perMin: 75, belts: 2 });
    expect(edge(res, 'R_Gear', 'target:Gear', 'Gear')).toMatchObject({ perMin: 50, belts: 1 });
    expect(edge(res, 'R_Ingot', 'surplus:Slag', 'Slag').perMin).toBeCloseTo(37.5, 9);
    expect(res.edges).toHaveLength(4);

    const t = res.totals;
    expect(t.raw).toEqual([approx('Ore', 150)]);
    expect(t.imports).toEqual([]);
    expect(t.surplus).toEqual([approx('Slag', 37.5)]);
    expect(t.byproducts).toEqual([approx('Slag', 37.5)]);
    // Smelter 4×5 Stone + Press 3×3 Stone = 29; money 4·100 + 3·50 = 550; Ore 150·5 copper.
    expect(t.buildCost).toEqual([approx('Stone', 29)]);
    expect(t.buildCostMoney).toBe(550);
    expect(t.rawMoneyPerMin).toBeCloseTo(750, 9);
    expect(t.machines).toEqual(expect.arrayContaining([{ building: 'Press', count: 3 }, { building: 'Smelter', count: 4 }]));
    expect(t.heatPerSec).toBe(0);
    expect(res.beltSpeed).toBe(60);
  });

  it('multi-output byproduct reuse: side Slag is consumed before producing more', async () => {
    const res = await solve(chainData, plan({ targets: [{ item: 'Brick', rate: 30 }] }), level0);
    // Brick 30 → Ingot 30 (x_Ingot 30, +15 Slag) and Slag 30 → only 30 − 15 = 15 from R_Slag.
    expect(node(res, 'R_Ingot').batchesPerMin).toBeCloseTo(30, 9);
    expect(node(res, 'R_Slag').batchesPerMin).toBeCloseTo(15, 9);
    expect(edge(res, 'R_Ingot', 'R_Brick', 'Slag').perMin).toBeCloseTo(15, 9);
    expect(edge(res, 'R_Slag', 'R_Brick', 'Slag').perMin).toBeCloseTo(15, 9);
    // Ore: 30·2 + 15·1 = 75, nothing left over.
    expect(res.totals.raw).toEqual([approx('Ore', 75)]);
    expect(res.totals.surplus).toEqual([]);
    expect(res.totals.byproducts).toEqual([]);
  });

  it('self-fuel loop: Plank heats its own chain, net output equals the target', async () => {
    const p = plan({ targets: [{ item: 'Plank', rate: 60 }], fuel: 'Plank' });
    const res = await solve(heatData, p, level0);
    // Heat per batch = 10 s · 2/s = 20 → 20/10 = 2 Plank burned per batch; net 4 − 2 = 2 → x = 60/2 = 30.
    const plank = node(res, 'R_Plank');
    expect(plank.batchesPerMin).toBeCloseTo(30, 9);
    expect(plank.fuel?.item).toBe('Plank');
    expect(plank.fuel?.rate).toBeCloseTo(60, 9);
    expect(plank.machinesExact).toBeCloseTo(5, 9); // 30·10/60
    expect(res.totals.heatPerSec).toBeCloseTo(10, 9); // 5 machines · 2/s
    expect(edge(res, 'R_Plank', 'R_Plank', 'Plank').perMin).toBeCloseTo(60, 9);
    expect(edge(res, 'R_Plank', 'target:Plank', 'Plank').perMin).toBeCloseTo(60, 9);
    expect(res.totals.raw).toEqual([approx('Log', 30)]);

    // Fuel efficiency 5 (×1.5): 20/15 = 4/3 burned, net 8/3 → x = 22.5, fuel 30/min, heat 22.5·20/60 = 7.5/s.
    const eff = await solve(heatData, p, levels({ fuelEfficiency: 5 }));
    expect(node(eff, 'R_Plank').batchesPerMin).toBeCloseTo(22.5, 9);
    expect(node(eff, 'R_Plank').fuel?.rate).toBeCloseTo(30, 9);
    expect(eff.totals.heatPerSec).toBeCloseTo(7.5, 9);
  });

  it('heater fuel override per recipe (fuelFor) and heat without any fuel', async () => {
    const base = plan({ targets: [{ item: 'Ingot', rate: 30 }], fuel: 'Plank' });

    // Furnace: 4 s · 5/s = 20 heat per batch, x = 30.
    const coal = await solve(heatData, { ...base, fuelFor: { R_Ingot: 'Coal' } }, level0);
    expect(ids(coal)).toEqual(['R_Ingot']);
    expect(node(coal, 'R_Ingot').fuel).toEqual({ item: 'Coal', rate: expect.closeTo(15, 9) }); // 30·20/40
    expect(coal.totals.raw).toEqual(expect.arrayContaining([approx('Ore', 60), approx('Coal', 15)]));
    expect(coal.totals.rawMoneyPerMin).toBeCloseTo(60 * 1 + 15 * 5, 9); // Ore value 1, Coal buyPrice 5
    expect(coal.totals.heatPerSec).toBeCloseTo(10, 9); // 30·20/60

    // Global Plank: 30·20/10 = 60 Plank/min; R_Plank nets 2 per batch → 30 batches, burning 60 itself.
    const plank = await solve(heatData, base, level0);
    expect(ids(plank)).toEqual(['R_Ingot', 'R_Plank']);
    expect(node(plank, 'R_Plank').batchesPerMin).toBeCloseTo(30, 9);
    expect(edge(plank, 'R_Plank', 'R_Ingot', 'Plank').perMin).toBeCloseTo(60, 9);
    expect(edge(plank, 'R_Plank', 'R_Plank', 'Plank').perMin).toBeCloseTo(60, 9);
    expect(plank.totals.heatPerSec).toBeCloseTo(20, 9); // 10 (furnaces) + 30·20/60 (sawmills)

    // No fuel chosen: heat is still reported, nothing is burned.
    const none = await solve(heatData, { ...base, fuel: null }, level0);
    expect(ids(none)).toEqual(['R_Ingot']);
    expect(node(none, 'R_Ingot').fuel).toBeUndefined();
    expect(none.totals.heatPerSec).toBeCloseTo(10, 9);
  });

  it('nursery: fertilizer sets growth time and consumption', async () => {
    const p = plan({ targets: [{ item: 'Flower', rate: 40 }], fertilizer: 'Compost' });
    const res = await solve(heatData, p, level0);
    // x = 40/2 = 20 batches; time = 24 nutrients / 4 per s = 6 s → 20·6/60 = 2 machines;
    // consumption 24/12 = 2 Compost per batch → 40/min.
    const flower = node(res, 'R_Flower');
    expect(flower.machinesExact).toBeCloseTo(2, 9);
    expect(flower.fertilizer).toEqual({ item: 'Compost', rate: expect.closeTo(40, 9) });
    expect(edge(res, 'import:Compost', 'R_Flower', 'Compost').perMin).toBeCloseTo(40, 9);
    // Fertilizer efficiency 5 (×1.5) cuts consumption to 20·24/18 = 26.667 but not growth time.
    const eff = await solve(heatData, p, levels({ fertilizerEfficiency: 5 }));
    expect(node(eff, 'R_Flower').fertilizer?.rate).toBeCloseTo(80 / 3, 9);
    expect(node(eff, 'R_Flower').machinesExact).toBeCloseTo(2, 9);
    // Factory speed 2 (×1.5) speeds growth: 2/1.5 = 1.333 machines.
    expect(node(await solve(heatData, p, levels({ factorySpeed: 2 })), 'R_Flower').machinesExact).toBeCloseTo(4 / 3, 9);
    // No fertilizer: timeSec (10 s) placeholder, nothing consumed → 20·10/60 = 3.333.
    const bare = node(await solve(heatData, { ...p, fertilizer: null }, level0), 'R_Flower');
    expect(bare.machinesExact).toBeCloseTo(10 / 3, 9);
    expect(bare.fertilizer).toBeUndefined();
  });

  it('seed loop: the crop returns its own seeds', async () => {
    const res = await solve(heatData, plan({ targets: [{ item: 'Wheat', rate: 30 }] }), level0);
    // x = 30/3 = 10: seeds 15 out, 10 back in, 5 left; Water 2·10 = 20.
    const wheat = node(res, 'R_Wheat');
    expect(wheat.batchesPerMin).toBeCloseTo(10, 9);
    expect(edge(res, 'R_Wheat', 'R_Wheat', 'Seed').perMin).toBeCloseTo(10, 9);
    expect(edge(res, 'R_Wheat', 'surplus:Seed', 'Seed').perMin).toBeCloseTo(5, 9);
    expect(res.totals.raw).toEqual([approx('Water', 20)]);
    expect(res.totals.byproducts).toEqual([approx('Seed', 5)]);
    // Water is liquid: piped, no belts.
    expect(edge(res, 'import:Water', 'R_Wheat', 'Water')).toMatchObject({ perMin: 20, belts: 0 });
  });

  it('import hides the subtree', async () => {
    const res = await solve(chainData, plan({ targets: [{ item: 'Gear', rate: 50 }], imports: ['Ingot'] }), level0);
    expect(ids(res)).toEqual(['R_Gear']);
    expect(edge(res, 'import:Ingot', 'R_Gear', 'Ingot')).toMatchObject({ perMin: 75, belts: 2 });
    expect(res.totals.imports).toEqual([approx('Ingot', 75)]);
    expect(res.totals.raw).toEqual([]);
  });

  it('fromInput: maximizes the target within the supply', async () => {
    const p = plan({ mode: 'fromInput', supplies: [{ item: 'Ore', rate: 100 }], maximize: 'Gear' });
    const res = await solve(chainData, p, level0);
    // Ore 100 → Ingot 50 → Gear 50·2/3 = 33.33 (x_Gear 16.67); Slag 25 left over.
    expect(edge(res, 'R_Gear', 'target:Gear', 'Gear').perMin).toBeCloseTo(100 / 3, 6);
    expect(node(res, 'R_Gear').batchesPerMin).toBeCloseTo(50 / 3, 6);
    expect(res.totals.raw).toEqual([approx('Ore', 100)]);
    expect(res.totals.byproducts).toEqual([approx('Slag', 25)]);
  });

  it('fromInput: a supplied intermediate adds to its own production', async () => {
    const p = plan({ mode: 'fromInput', supplies: [{ item: 'Ore', rate: 60 }, { item: 'Ingot', rate: 1 }], maximize: 'Gear' });
    const res = await solve(chainData, p, level0);
    // Ore 60 → 30 Ingot, +1 supplied = 31 → Gear 31·2/3 = 20.667.
    expect(edge(res, 'R_Gear', 'target:Gear', 'Gear').perMin).toBeCloseTo(62 / 3, 6);
    expect(node(res, 'R_Ingot').batchesPerMin).toBeCloseTo(30, 6);
    expect(edge(res, 'import:Ingot', 'R_Gear', 'Ingot').perMin).toBeCloseTo(1, 6);
  });

  it('fromInput: unsupplied raw items are not free', async () => {
    // Only 3 Ingot/min: Ore is raw but not supplied → Gear = 3·2/3 = 2.
    const only = plan({ mode: 'fromInput', supplies: [{ item: 'Ingot', rate: 3 }], maximize: 'Gear' });
    const res = await solve(chainData, only, level0);
    expect(edge(res, 'R_Gear', 'target:Gear', 'Gear').perMin).toBeCloseTo(2, 6);
    expect(ids(res)).toEqual(['R_Gear']);
    // Nothing supplied that leads to Gear: the error names what to supply.
    const none = plan({ mode: 'fromInput', supplies: [{ item: 'Sand', rate: 10 }], maximize: 'Gear' });
    expect(await solveError(chainData, none)).toMatchObject({ code: 'infeasible', item: 'Ore' });
  });

  it('fromInput: an unbounded import feeding the target is named', async () => {
    const p = plan({ mode: 'fromInput', supplies: [{ item: 'Ore', rate: 10 }], imports: ['Ingot'], maximize: 'Gear' });
    expect(await solveError(chainData, p)).toMatchObject({ code: 'unbounded', item: 'Ingot' });
  });

  it('rejects invalid rates', async () => {
    for (const rate of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1e-7, 1e13]) {
      expect(await solveError(chainData, plan({ targets: [{ item: 'Gear', rate }] }))).toMatchObject({
        code: 'invalidInput',
        item: 'Gear',
      });
    }
    const supply = plan({ mode: 'fromInput', supplies: [{ item: 'Ore', rate: Number.NaN }], maximize: 'Gear' });
    expect(await solveError(chainData, supply)).toMatchObject({ code: 'invalidInput', item: 'Ore' });
  });

  it('unreachable item error names the missing input (special producers do not count)', async () => {
    const err = await solveError(chainData, plan({ targets: [{ item: 'Alloy', rate: 10 }] }));
    expect(err.code).toBe('unreachable');
    expect(err.item).toBe('Mystery');

    const unknown = await solveError(chainData, plan({ targets: [{ item: 'Nope', rate: 1 }] }));
    expect(unknown).toMatchObject({ code: 'unreachable', item: 'Nope' });

    // Importing it resolves the chain.
    const ok = await solve(chainData, plan({ targets: [{ item: 'Alloy', rate: 10 }], imports: ['Mystery'] }), level0);
    expect(ids(ok)).toEqual(['R_Alloy', 'R_Ingot']);
  });

  it('infeasible loop reports the short item', async () => {
    const wheat = heatData.recipes.R_Wheat!;
    const poor: GameData = {
      ...heatData,
      recipes: {
        ...heatData.recipes,
        R_Wheat: { ...wheat, outputs: [wheat.outputs[0]!, { item: 'Seed', qty: 0.5, chance: 0.5 }] },
      },
    };
    const err = await solveError(poor, plan({ targets: [{ item: 'Wheat', rate: 30 }] }));
    expect(err).toMatchObject({ code: 'infeasible', item: 'Seed' });
  });

  it('infeasibility hint points upstream, never at the target', async () => {
    // X ← 2Y ← X loses half per round: the short item is Y, not the target X.
    expect(await solveError(edgeData, plan({ targets: [{ item: 'X', rate: 10 }] }))).toMatchObject({
      code: 'infeasible',
      item: 'Y',
    });
    // T ← A ← B, with B ↔ C closed: the hint is inside the loop.
    const err = await solveError(edgeData, plan({ targets: [{ item: 'T', rate: 10 }] }));
    expect(err.code).toBe('infeasible');
    expect(['B', 'C']).toContain(err.item);
  });

  it('upgrades scale machines, belts and the chosen building', async () => {
    const p = plan({ targets: [{ item: 'Gear', rate: 50 }] });
    const res = await solve(chainData, p, levels({ factorySpeed: 6, conveyor: 6 }));
    // speed ×2.5: Gear 2.5/2.5 = 1 machine, Ingot 3.75/2.5 = 1.5 → 2.
    expect(node(res, 'R_Gear').machinesExact).toBeCloseTo(1, 9);
    expect(node(res, 'R_Gear').machines).toBe(1);
    expect(node(res, 'R_Ingot').machines).toBe(2);
    // belt 60 + 15·6 = 150: Ore 150 → 1 belt, Ingot 75 → 1 belt.
    expect(res.beltSpeed).toBe(150);
    expect(edge(res, 'import:Ore', 'R_Ingot', 'Ore').belts).toBe(1);
    expect(edge(res, 'R_Ingot', 'R_Gear', 'Ingot').belts).toBe(1);

    // SmelterPlus (speedMult 2): 3.75/2 = 1.875 → 2 machines of it.
    const plus = await solve(chainData, { ...p, buildingFor: { R_Ingot: 'SmelterPlus' } }, level0);
    expect(node(plus, 'R_Ingot')).toMatchObject({ building: 'SmelterPlus', machines: 2 });
    expect(node(plus, 'R_Ingot').machinesExact).toBeCloseTo(1.875, 9);
    // A building the recipe cannot run in is ignored.
    const bad = await solve(chainData, { ...p, buildingFor: { R_Ingot: 'Press' } }, level0);
    expect(node(bad, 'R_Ingot').building).toBe('Smelter');
  });

  it('port warning when one input port must carry more than a belt', async () => {
    const p = plan({ targets: [{ item: 'Dust', rate: 13 }] });
    const res = await solve(chainData, p, level0);
    // 13 batches → 130 Ore/min on 1 machine; 2 solid input ports (in + both; pipe excluded) → 65 > 60.
    const dust = node(res, 'R_Dust');
    expect(dust.machines).toBe(1);
    expect(dust.portWarnings).toEqual([{ item: 'Ore', perMachine: 65, beltSpeed: 60 }]);
    // Conveyor level 1 → 75/min belt: no warning.
    const faster = await solve(chainData, p, levels({ conveyor: 1 }));
    expect(node(faster, 'R_Dust').portWarnings).toEqual([]);
  });

  it('port warning sums items sharing one port', async () => {
    // 50 batches → 0.83 machine → 1; PA 50 + PB 50 = 100/min through the single input port.
    const res = await solve(edgeData, plan({ targets: [{ item: 'Mixed', rate: 50 }] }), level0);
    const w = node(res, 'R_Mixed').portWarnings;
    expect(w).toHaveLength(1);
    expect(w[0]!.perMachine).toBeCloseTo(100, 9);
    expect(w[0]!.beltSpeed).toBe(60);
    expect(['PA', 'PB']).toContain(w[0]!.item);
    // Liquid output of 100·x never warns and rides no belts: 600/min of Juice from 6 batches.
    const juice = await solve(edgeData, plan({ targets: [{ item: 'Juice', rate: 600 }] }), level0);
    expect(node(juice, 'R_Juice').portWarnings).toEqual([]);
    expect(edge(juice, 'R_Juice', 'target:Juice', 'Juice').belts).toBe(0);
  });

  it('hidden recipes are used only when picked explicitly', async () => {
    const base = plan({ targets: [{ item: 'Q', rate: 10 }] });
    expect(ids(await solve(edgeData, base, level0))).toEqual(['R_Q']);
    expect(ids(await solve(edgeData, { ...base, optimize: 'raw' }, level0))).toEqual(['R_Q']);
    expect(ids(await solve(edgeData, { ...base, recipeFor: { Q: 'R_AQ' } }, level0))).toEqual(['R_AQ']);
  });

  it('optimize picks the cheaper alternate by goal; hybrid follows manual choice', async () => {
    const base = plan({ targets: [{ item: 'Glass', rate: 10 }] });
    // Default recipe: 4 Sand/Glass (40 raw); alternate: 1 Ore + 1 Sand (20 raw).
    expect(ids(await solve(chainData, base, level0))).toEqual(['R_Glass']);
    const raw = await solve(chainData, { ...base, optimize: 'raw' }, level0);
    expect(ids(raw)).toEqual(['R_GlassAlt']);
    expect(raw.totals.raw).toEqual(expect.arrayContaining([approx('Ore', 10), approx('Sand', 10)]));
    // Money: default 40·1 = 40 copper vs alternate 10·5 + 10·1 = 60 → default.
    expect(ids(await solve(chainData, { ...base, optimize: 'money' }, level0))).toEqual(['R_Glass']);
    // Manual recipe choice in hybrid mode.
    expect(ids(await solve(chainData, { ...base, recipeFor: { Glass: 'R_GlassAlt' } }, level0))).toEqual(['R_GlassAlt']);
  });

  it('yieldSkill recipes scale output by the alchemy multiplier', async () => {
    const p = plan({ targets: [{ item: 'Essence', rate: 56 }] });
    // Level 0: 56/2 = 28 batches. Level 2 (×1.12): 56/(2·1.12) = 25 batches, 25·5/60 = 2.083 → 3 machines.
    expect(node(await solve(heatData, p, level0), 'R_Essence').batchesPerMin).toBeCloseTo(28, 9);
    const res = await solve(heatData, p, levels({ alchemySkill: 2 }));
    expect(node(res, 'R_Essence').batchesPerMin).toBeCloseTo(25, 9);
    expect(node(res, 'R_Essence').machines).toBe(3);
    expect(res.totals.raw).toEqual([approx('Herb', 25)]);
  });

  it('empty plan gives an empty result', async () => {
    const res = await solve(chainData, plan(), level0);
    expect(res.nodes).toEqual([]);
    expect(res.edges).toEqual([]);
  });

  it('is deterministic', async () => {
    const p = plan({ targets: [{ item: 'Brick', rate: 30 }, { item: 'Gear', rate: 7 }] });
    expect(await solve(chainData, p, level0)).toEqual(await solve(chainData, p, level0));
    const lp = plan({ targets: [{ item: largeTarget, rate: 60 }], optimize: 'raw', fuel: 'Fuel' });
    expect(await solve(largeData, lp, level0)).toEqual(await solve(largeData, lp, level0));
  });

  it('solves 200 recipes quickly', async () => {
    const p = plan({ targets: [{ item: largeTarget, rate: 60 }], optimize: 'raw', fuel: 'Fuel' });
    await solve(largeData, p, level0); // warm-up: loads the wasm
    const t0 = performance.now();
    const res = await solve(largeData, p, level0);
    const ms = performance.now() - t0;
    console.info(`large fixture (200 recipes, optimize raw): ${ms.toFixed(1)} ms, ${res.nodes.length} nodes`);
    expect(res.nodes.length).toBeGreaterThan(50);
    expect(ms).toBeLessThan(200);
  });
});
