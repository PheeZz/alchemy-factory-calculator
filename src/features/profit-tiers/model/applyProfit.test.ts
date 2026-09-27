import { emptyPlan, useFactoryStore } from '@/features/factory/store';
import { useViewStore } from '@/shared/lib/view';
import { applyProfit } from './applyProfit';

test('"Use" adds the item as a target with its recipe path and returns to the calculator', () => {
  useFactoryStore.setState({ factories: [{ id: 'f', name: 'F', plan: { ...emptyPlan(), recipeFor: { A: 'A1' } } }], activeId: 'f' });
  useViewStore.setState({ view: 'profit' });
  applyProfit({
    item: 'Elixir', recipeFor: { Elixir: 'Elixir', Salt: 'Salt' }, path: ['Elixir', 'Salt'], salePrice: 900, saleMultiplier: 1, machinesPerItem: 1,
    rawPerItem: [], rawCostPerItem: 1, marginPerItem: 899, valueMultiplier: 900, salePerMachine: 1, marginPerMachine: 1,
    fuelPerItem: [], fuelValuePerItem: 0, byproductValuePerItem: 0, heatPerSecPerItem: 0,
  });
  const plan = useFactoryStore.getState().factories[0]!.plan;
  expect(plan.targets).toEqual([{ item: 'Elixir', rate: 60 }]);
  expect(plan.recipeFor).toEqual({ A: 'A1', Elixir: 'Elixir', Salt: 'Salt' });
  expect(useViewStore.getState().view).toBe('calculator');
});
