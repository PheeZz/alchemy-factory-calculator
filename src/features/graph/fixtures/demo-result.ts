import type { FactoryPlan, SolveResult } from '@/features/solver/types';

// Numbers follow spec §4 by hand for 30 Elixir/min at level 0 (Salt imported, Charcoal as fuel):
// Kiln burns part of its own charcoal (self-fuel loop), Nursery returns seeds (seed loop).

export const demoPlanPatch: Pick<FactoryPlan, 'targets' | 'imports' | 'fuel' | 'fertilizer'> = {
  targets: [{ item: 'Elixir', rate: 30 }],
  imports: ['Salt'],
  fuel: 'Charcoal',
  fertilizer: 'PlantAsh',
};

const node = (
  id: string,
  building: string,
  batchesPerMin: number,
  timeSec: number,
  extra: Partial<SolveResult['nodes'][number]> = {},
): SolveResult['nodes'][number] => {
  const machinesExact = (batchesPerMin * timeSec) / 60;
  const machines = Math.ceil(machinesExact - 1e-9);
  return {
    id: `n:${id}`,
    recipe: id,
    building,
    batchesPerMin,
    machinesExact,
    machines,
    utilization: machinesExact / machines,
    portWarnings: [],
    ...extra,
  };
};

const edge = (from: string, to: string, item: string, perMin: number) => ({
  from,
  to,
  item,
  perMin,
  belts: Math.ceil(perMin / 60 - 1e-9),
});

const kilnBatches = 28 / 0.6;

export const demoResult: SolveResult = {
  beltSpeed: 60,
  nodes: [
    node('Plank', 'Sawmill', 35 / 3, 6, { portWarnings: [{ item: 'Plank', perMachine: 80, beltSpeed: 60 }] }),
    node('Charcoal', 'Kiln', kilnBatches, 6, { fuel: { item: 'Charcoal', rate: kilnBatches * 0.4 } }),
    node('IronIngot', 'Crucible', 30, 5, { fuel: { item: 'Charcoal', rate: 15 } }),
    node('Flax', 'Nursery', 40, 20, { fertilizer: { item: 'PlantAsh', rate: 20 } }),
    node('LinseedOil', 'Extractor', 60, 8),
    node('Elixir', 'Alembic', 30, 13, { fuel: { item: 'Charcoal', rate: 13 } }),
  ],
  edges: [
    edge('import:Log', 'n:Plank', 'Log', 35 / 3),
    edge('n:Plank', 'n:Charcoal', 'Plank', kilnBatches * 2),
    edge('n:Plank', 'surplus:Sawdust', 'Sawdust', 35 / 6),
    edge('n:Charcoal', 'n:Charcoal', 'Charcoal', kilnBatches * 0.4),
    edge('n:Charcoal', 'n:IronIngot', 'Charcoal', 15),
    edge('n:Charcoal', 'n:Elixir', 'Charcoal', 13),
    edge('import:IronOre', 'n:IronIngot', 'IronOre', 60),
    edge('n:IronIngot', 'n:Elixir', 'IronIngot', 30),
    edge('import:PlantAsh', 'n:Flax', 'PlantAsh', 20),
    edge('n:Flax', 'n:Flax', 'FlaxSeed', 40),
    edge('n:Flax', 'surplus:FlaxSeed', 'FlaxSeed', 20),
    edge('n:Flax', 'n:LinseedOil', 'Flax', 120),
    edge('import:Water', 'n:LinseedOil', 'Water', 60),
    edge('n:LinseedOil', 'n:Elixir', 'LinseedOil', 60),
    edge('import:Salt', 'n:Elixir', 'Salt', 30),
    edge('n:Elixir', 'target:Elixir', 'Elixir', 30),
  ],
  totals: {
    raw: [
      { item: 'Log', qty: 35 / 3 },
      { item: 'IronOre', qty: 60 },
      { item: 'Water', qty: 60 },
      { item: 'PlantAsh', qty: 20 },
    ],
    imports: [{ item: 'Salt', qty: 30 }],
    surplus: [
      { item: 'FlaxSeed', qty: 20 },
      { item: 'Sawdust', qty: 35 / 6 },
    ],
    byproducts: [{ item: 'Sawdust', qty: 35 / 6 }],
    buildCost: [
      { item: 'Plank', qty: 318 },
      { item: 'IronIngot', qty: 229 },
      { item: 'Log', qty: 40 },
    ],
    buildCostMoney: 2 * 2_000 + 5 * 5_000 + 3 * 12_000 + 14 * 1_500 + 8 * 9_000 + 7 * 25_000,
    rawMoneyPerMin: (35 / 3) * 5 + 60 * 20 + 20 * 15,
    machines: [
      { building: 'Nursery', count: 14 },
      { building: 'Extractor', count: 8 },
      { building: 'Alembic', count: 7 },
      { building: 'Kiln', count: 5 },
      { building: 'Crucible', count: 3 },
      { building: 'Sawmill', count: 2 },
    ],
    heatPerSec: 30 + 26 + kilnBatches * 0.8,
  },
};
