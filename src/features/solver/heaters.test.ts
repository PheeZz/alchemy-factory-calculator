// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { defaultHeater, solve } from './index';
import { level0, plan } from './fixtures/builders';
import { heatersData } from './fixtures/heaters';
import { loadRealData } from './fixtures/real';
import type { SolveResult } from './types';

const node = (res: SolveResult, id: string) => res.nodes.find((n) => n.id === id)!;

describe('heaters', () => {
  it('default heater: cheapest solid-fuel heater, never the steam pad', () => {
    expect(defaultHeater(heatersData)).toBe('Stove');
    expect(defaultHeater(loadRealData())).toBe('StoneStove');
  });

  it('packs whole machines per heater and adds heaters to totals', async () => {
    const res = await solve(heatersData, plan({ targets: [{ item: 'Ingot', rate: 100 }], fuel: 'Coal' }), level0);
    // x = 100 → 100·6/60 = 10 crucibles; a 9-slot stove holds floor(9/2) = 4 → ceil(10/4) = 3 stoves,
    // 10/4 = 2.5 exact.
    const ingot = node(res, 'R_Ingot');
    expect(ingot.machines).toBe(10);
    expect(ingot.heater).toEqual({ building: 'Stove', countExact: 2.5, count: 3 });
    expect(res.totals.machines).toEqual(expect.arrayContaining([{ building: 'Crucible', count: 10 }, { building: 'Stove', count: 3 }]));
    // 3 stoves × 20 Stone.
    expect(res.totals.buildCost).toEqual([{ item: 'Stone', qty: 60 }]);
  });

  it('per-node override and global choice', async () => {
    const base = plan({ targets: [{ item: 'Ingot', rate: 100 }], fuel: 'Coal' });
    // Furnace: floor(42/2) = 21 per furnace → ceil(10/21) = 1, 10/21 exact.
    const node1 = node(await solve(heatersData, { ...base, heaterFor: { R_Ingot: 'Furnace' } }, level0), 'R_Ingot');
    expect(node1.heater).toEqual({ building: 'Furnace', countExact: 10 / 21, count: 1 });
    const node2 = node(await solve(heatersData, { ...base, heater: 'Furnace' }, level0), 'R_Ingot');
    expect(node2.heater?.building).toBe('Furnace');
    // An unknown or non-heater id falls back to the default.
    const node3 = node(await solve(heatersData, { ...base, heater: 'Crucible' }, level0), 'R_Ingot');
    expect(node3.heater?.building).toBe('Stove');
  });

  it('a machine too big for the heater warns and counts no heaters', async () => {
    const p = plan({ targets: [{ item: 'Bar', rate: 10 }], fuel: 'Coal' });
    const res = await solve(heatersData, p, level0);
    const bar = node(res, 'R_Bar');
    expect(bar.heater).toBeUndefined();
    expect(bar.heaterWarning).toEqual({ building: 'Stove', slotsRequired: 12, heatSlots: 9 });
    expect(res.totals.machines).toEqual([{ building: 'Big', count: 1 }]);
    // In a furnace: floor(42/12) = 3 per furnace; 10 batches → 1 machine → 1 furnace, 1/3 exact.
    const inFurnace = node(await solve(heatersData, { ...p, heaterFor: { R_Bar: 'Furnace' } }, level0), 'R_Bar');
    expect(inFurnace.heater).toEqual({ building: 'Furnace', countExact: 1 / 3, count: 1 });
    expect(inFurnace.heaterWarning).toBeUndefined();
  });

  it('real data: a Paradox Crucible (9 slots) fills a Stone Stove', async () => {
    const res = await solve(loadRealData(), plan({ targets: [{ item: 'Vitae', rate: 60 }], fuel: 'Coal' }), level0);
    // Vitae: 1 Mors → 1 in 5 s → x = 60 → 5 crucibles → 5 stoves.
    expect(node(res, 'Vitae').heater).toEqual({ building: 'StoneStove', countExact: 5, count: 5 });
    // Mors via Paradox_Limestone, 3.333 s: 60·3.33333/60 = 3.33333 machines → 4 → 4 stoves.
    const mors = node(res, 'Paradox_Limestone');
    expect(mors.heater?.count).toBe(4);
    expect(mors.heater?.countExact).toBeCloseTo(3.33333, 5);
    // Unheated machines get no heater.
    expect(node(res, 'Coal').heater).toBeUndefined();
  });

  it('real data: steam heating pads under smelters, the Coal-fired boiler skips them; heat unchanged', async () => {
    // Global SteamHeater, no override for the boiler: its fuel is solid, so the pad is skipped for it.
    const p = plan({
      targets: [{ item: 'IronIngot', rate: 60 }],
      fuel: 'Steam',
      fuelFor: { SteamBoiler_High: 'Coal' },
      heater: 'SteamHeater',
    });
    const res = await solve(loadRealData(), p, level0);
    // 6 smelters (9 slots each) on 9-slot pads → 6 pads; they still burn 162 Steam/min (54 heat/s).
    expect(node(res, 'IronIngot').heater).toEqual({ building: 'SteamHeater', countExact: 6, count: 6 });
    expect(node(res, 'IronIngot').fuel?.rate).toBeCloseTo(162, 9);
    // 0.018 boilers (9 slots) on a stove: 1 stove, 0.018 exact; its 6 Coal/min are unchanged.
    expect(node(res, 'SteamBoiler_High').heater).toEqual({ building: 'StoneStove', countExact: expect.closeTo(0.018, 12), count: 1 });
    expect(node(res, 'SteamBoiler_High').fuel?.rate).toBeCloseTo(6, 9);
    expect(res.totals.machines).toEqual(expect.arrayContaining([{ building: 'SteamHeater', count: 6 }, { building: 'StoneStove', count: 1 }]));
  });

  it('heater follows the node fuel: Steam without a heater choice gets the pad', async () => {
    const data = loadRealData();
    expect(defaultHeater(data, data.items.Steam!)).toBe('SteamHeater');
    const res = await solve(data, plan({ targets: [{ item: 'IronIngot', rate: 60 }], fuel: 'Steam', fuelFor: { SteamBoiler_High: 'Coal' } }), level0);
    expect(node(res, 'IronIngot').heater?.building).toBe('SteamHeater');
    expect(node(res, 'SteamBoiler_High').heater?.building).toBe('StoneStove');
    // A solid-fuel node skips a pipe-fed override too.
    const coal = await solve(data, plan({ targets: [{ item: 'IronIngot', rate: 60 }], fuel: 'Coal', heaterFor: { IronIngot: 'SteamHeater' } }), level0);
    expect(node(coal, 'IronIngot').heater?.building).toBe('StoneStove');
  });
});
