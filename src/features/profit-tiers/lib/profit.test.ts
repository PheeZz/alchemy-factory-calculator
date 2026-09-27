import type { ProfitVariant } from '@/features/solver';
import { groupProfit } from './profit';

const v = (item: string, p: Partial<ProfitVariant>): ProfitVariant => ({
  item,
  recipeFor: {},
  path: [item],
  salePrice: 100,
  saleMultiplier: 1,
  machinesPerItem: 1,
  rawPerItem: [],
  rawCostPerItem: 10,
  marginPerItem: 90,
  valueMultiplier: 10,
  salePerMachine: 100,
  marginPerMachine: 90,
  fuelPerItem: [],
  fuelValuePerItem: 0,
  byproductValuePerItem: 0,
  heatPerSecPerItem: 0,
  ...p,
});

test('profit tiers: best margin per machine is S; losses fall to D; machine-less resale has no tier', () => {
  const groups = groupProfit(
    [v('Loss', { marginPerMachine: -5 }), v('Best', { marginPerMachine: 1000 }), v('Half', { marginPerMachine: 500 }), v('Resale', { marginPerMachine: null })],
    'marginMachine',
  );
  expect(groups.map((g) => [g.tier, g.rows.map((r) => r.item.item)])).toEqual([
    ['S', ['Best']],
    ['A', ['Half']],
    ['D', ['Loss']],
    [null, ['Resale']],
  ]);
});
