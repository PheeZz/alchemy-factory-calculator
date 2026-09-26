// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rankFuels, rankFuelVariants, type FuelVariant } from './index';
import { level0, levels } from './fixtures/builders';
import { fuelsData } from './fixtures/fuels';
import { loadRealData } from './fixtures/real';

const key = (v: FuelVariant) => `${v.fuel}:${v.path.join('>')}`;
const approx = (item: string, qty: number) => ({ item, qty: expect.closeTo(qty, 6) });

describe('rankFuelVariants (fixture)', () => {
  it('self-heated: every path of every fuel, ranked by machines', async () => {
    const v = await rankFuelVariants(fuelsData, level0, { fertilizer: null, heating: 'self' });
    expect(v.map(key)).toEqual(['Coal:', 'F:R_F_Alt', 'P:R_P>R_F_Alt', 'P:R_P>R_F', 'F:R_F']);

    // Coal (raw, 50 heat): 60000/50 = 1200/min, no machines, value 1200·20 = 24000; 60000/1200 = 50 heat per item.
    expect(v[0]).toMatchObject({ recipeFor: {}, heatValue: 50, machinesPer1k: 0, machinesCeilPer1k: 0, rawValuePer1k: 24000 });
    expect(v[0]!.heatPerRawItem).toBeCloseTo(50, 9);
    // Burning instead of selling: fuel/min × value. Coal 1200·20 = 24000 (= its raw value);
    // F 600·3 = 1800 whichever path makes it; P 400·8 = 3200.
    expect(v[0]!.fuelValuePer1k).toBeCloseTo(24000, 9);
    expect(v.filter((x) => x.fuel === 'F').map((x) => x.fuelValuePer1k)).toEqual([expect.closeTo(1800, 9), expect.closeTo(1800, 9)]);
    expect(v.filter((x) => x.fuel === 'P').map((x) => x.fuelValuePer1k)).toEqual([expect.closeTo(3200, 9), expect.closeTo(3200, 9)]);

    // F via R_F_Alt: 60000/100 = 600 F → x = 300 (2 per Ore), 300·6/60 = 30 presses; Ore 300 (value 3000);
    // 60000/300 = 200 heat per Ore; build cost 2 Ore × 30 presses.
    const fAlt = v[1]!;
    expect(fAlt.recipeFor).toEqual({ F: 'R_F_Alt' });
    expect(fAlt.machinesPer1k).toBeCloseTo(30, 9);
    expect(fAlt.machinesCeilPer1k).toBe(30);
    expect(fAlt.raw).toEqual([approx('Ore', 300)]);
    expect(fAlt.rawValuePer1k).toBeCloseTo(3000, 6);
    expect(fAlt.heatPerRawItem).toBeCloseTo(200, 9);
    expect(fAlt.buildCostPer1k).toEqual([approx('Ore', 60)]);
    expect(fAlt.selfHeated).toBe(true);

    // P (150 heat) needs 400/min net; each 3 s batch burns 15 heat = 0.1 P → nets 0.9 → x = 444.44,
    // 444.44·3/60 = 22.22 kilns (ceil 23). Via R_F_Alt: 222.22 presses-batches → 22.22 presses (ceil 23),
    // Ore 222.22 → 60000/222.22 = 270 heat per Ore.
    const pAlt = v[2]!;
    expect(pAlt.recipeFor).toEqual({ P: 'R_P', F: 'R_F_Alt' });
    expect(pAlt.machinesPer1k).toBeCloseTo(400 / 9, 9);
    expect(pAlt.machinesCeilPer1k).toBe(46);
    expect(pAlt.heatPerRawItem).toBeCloseTo(270, 9);
    // Via R_F: 444.44 F at 30 s → 222.22 mills (ceil 223) + 22.22 kilns; Log 444.44 → 135 heat per Log.
    const pDef = v[3]!;
    expect(pDef.machinesPer1k).toBeCloseTo(2200 / 9, 9);
    expect(pDef.machinesCeilPer1k).toBe(246);
    expect(pDef.rawValuePer1k).toBeCloseTo(8000 / 9, 6);
    expect(pDef.heatPerRawItem).toBeCloseTo(135, 9);
    // F via R_F: 600 at 30 s → 300 mills; Log 600 (value 1200) → 100 heat per Log.
    expect(v[4]!.machinesPer1k).toBeCloseTo(300, 9);
    expect(v[4]!.rawValuePer1k).toBeCloseTo(1200, 6);
  });

  it('heated by Coal: the chain buys its heat, raw is no longer single-sourced', async () => {
    const v = await rankFuelVariants(fuelsData, level0, { fertilizer: null, heating: 'Coal' });
    expect(v.map(key)).toEqual(['Coal:', 'F:R_F_Alt', 'P:R_P>R_F_Alt', 'P:R_P>R_F', 'F:R_F']);
    // P via R_F_Alt: 400 P → x = 400 → 20 kilns, 400 F → 20 presses = 40 machines;
    // heat 400·15 = 6000/min → 120 Coal (2400) + Ore 200 (2000) = 4400 copper; Coal 55 % → no dominant raw.
    const pAlt = v[2]!;
    expect(pAlt.machinesPer1k).toBeCloseTo(40, 9);
    expect(pAlt.raw).toEqual(expect.arrayContaining([approx('Ore', 200), approx('Coal', 120)]));
    expect(pAlt.rawValuePer1k).toBeCloseTo(4400, 6);
    expect(pAlt.heatPerRawItem).toBeNull();
    expect(pAlt.selfHeated).toBe(false);
    expect(v[0]!.selfHeated).toBe(true); // Coal heated by Coal
    // Sale value depends only on the fuel delivered, not on who heats the chain: 400·8.
    expect(pAlt.fuelValuePer1k).toBeCloseTo(3200, 9);
    // P via R_F: 20 kilns + 200 mills.
    expect(v[3]!.machinesPer1k).toBeCloseTo(220, 9);
  });

  it('caps variants per fuel (defaults first) and applies fuel efficiency', async () => {
    const one = await rankFuelVariants(fuelsData, level0, { fertilizer: null, heating: 'self', maxVariantsPerFuel: 1 });
    expect(one.map(key)).toEqual(['Coal:', 'P:R_P>R_F', 'F:R_F']);
    // Fuel efficiency 5 (×1.5): F carries 150 heat → 400 F/min → 200 R_F_Alt batches → 20 presses.
    const eff = await rankFuelVariants(fuelsData, levels({ fuelEfficiency: 5 }), { fertilizer: null, heating: 'self' });
    const fAlt = eff.find((x) => key(x) === 'F:R_F_Alt')!;
    expect(fAlt.heatValue).toBeCloseTo(150, 9);
    expect(fAlt.machinesPer1k).toBeCloseTo(20, 9);
  });

  it('rankFuels keeps the best variant per fuel', async () => {
    const ranks = await rankFuels(fuelsData, level0);
    expect(ranks.map((r) => r.item)).toEqual(['Coal', 'F', 'P']);
    expect(ranks[1]!.machinesPerHeat).toBeCloseTo(0.03, 9);
  });
});

describe('rankFuelVariants (real data)', () => {
  const data = loadRealData();

  it('lists the paths of Charcoal, Coal and Charcoal Powder; Coal beats Charcoal Powder', async () => {
    const t0 = performance.now();
    const self = await rankFuelVariants(data, level0, { fertilizer: 'BasicFertilizer', heating: 'self' });
    const ms = performance.now() - t0;
    const paths = (fuel: string) => self.filter((v) => v.fuel === fuel).map((v) => v.path.join('>'));
    // Charcoal has one maker (Crucible, from Plank) and Plank one (Table Saw); Coke's side Charcoal is not a main output.
    expect(paths('Charcoal')).toEqual(['Charcoal']);
    expect(paths('Coal')).toEqual(['Coal']);
    expect(paths('CharcoalPowder')).toEqual(['CharcoalPowder']);
    // Coke: Athanor (default) or Crucible from Coal; Coke Powder inherits both.
    expect(paths('CokePowder').sort()).toEqual(['CokePowder>Coke', 'CokePowder>Coke_Alt']);
    const machines = (fuel: string) => Math.min(...self.filter((v) => v.fuel === fuel).map((v) => v.machinesPer1k));
    // Coal: 111.1 Coal/min → 0.926 crusher batches → 5.556 crushers (unheated); Charcoal Powder: 312.5
    // machines + 31.25 stoves = 343.75 (see rankFuels).
    expect(machines('Coal')).toBeCloseTo(5.5556, 3);
    expect(machines('CharcoalPowder')).toBeCloseTo(343.75, 6);
    expect(machines('Coal')).toBeLessThan(machines('CharcoalPowder'));
    // Coal: 60000/540 = 111.1/min × 40 = 4444, same as its Coal Ore (0.926 × 4800): no markup.
    // Black Powder: 60000/6000 = 10/min × 660 = 6600 — selling it earns more than its inputs cost.
    const coalV = self.find((v) => v.fuel === 'Coal')!;
    expect(coalV.fuelValuePer1k).toBeCloseTo(40000 / 9, 6);
    expect(coalV.rawValuePer1k).toBeCloseTo(40000 / 9, 6);
    const black = self.find((v) => v.fuel === 'BlackPowder')!;
    expect(black.fuelValuePer1k).toBeCloseTo(6600, 9);
    expect(black.fuelValuePer1k).toBeGreaterThan(black.rawValuePer1k);
    // Mors has 136 generated Paradox_<item> makers; they collapse into the planner's default
    // (Paradox_Limestone) and the cheapest buyable input (Gelatinous Gridlock, 100 copper). Mors_Alt
    // (Vitae loop) stays as a real alternative but cannot be solved on its own.
    const blast = paths('BlastPotion');
    expect(blast.filter((p) => p.includes('Paradox_')).length).toBeLessThanOrEqual(2);
    expect(blast).toContain('BlastPotion>Paradox_Limestone');
    expect(blast.sort()).toEqual(['BlastPotion>Paradox_GelatinousGridlock', 'BlastPotion>Paradox_Limestone']);
    expect(ms).toBeLessThan(300);

    const coal = await rankFuelVariants(data, level0, { fertilizer: 'BasicFertilizer', heating: 'Coal' });
    const table = (vs: FuelVariant[]) =>
      vs
        .slice(0, 10)
        .map(
          (v) =>
            `${v.fuel} | ${v.path.join(' > ') || '(raw)'} | ${v.machinesPer1k.toFixed(3)} | ${v.rawValuePer1k.toFixed(0)} | ${v.fuelValuePer1k.toFixed(0)} | ${v.buildCostPer1k.map((b) => `${b.qty.toFixed(0)} ${b.item}`).join(', ') || '-'}`,
        )
        .join('\n');
    console.info(`rankFuelVariants self (${ms.toFixed(0)} ms)\n${table(self)}\n\nheating=Coal\n${table(coal)}`);
  });
});
