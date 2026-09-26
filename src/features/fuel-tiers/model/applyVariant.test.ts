import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { emptyPlan, useFactoryStore } from '@/features/factory/store';
import { useViewStore } from '@/shared/lib/view';
import { applyVariant } from './applyVariant';

test('"Use" sets the fuel, merges the path recipes into existing choices and returns to the calculator', () => {
  useFactoryStore.setState({
    factories: [{ id: 'f', name: 'F', plan: { ...emptyPlan(), fuel: 'Log', recipeFor: { Salt: 'Salt' } } }],
    activeId: 'f',
  });
  useViewStore.setState({ view: 'fuel' });
  applyVariant(demoGameData, {
    fuel: 'Charcoal',
    recipeFor: { Charcoal: 'CharcoalFromLog' },
    path: ['CharcoalFromLog'],
    heatValue: 120,
    machinesPer1k: 1,
    machinesCeilPer1k: 1,
    raw: [],
    rawValuePer1k: 0,
    fuelValuePer1k: 0,
    buildCostPer1k: [],
    heatPerRawItem: null,
    selfHeated: true,
  });
  const plan = useFactoryStore.getState().factories[0]!.plan;
  expect(plan.fuel).toBe('Charcoal');
  expect(plan.recipeFor).toEqual({ Salt: 'Salt', Charcoal: 'CharcoalFromLog' });
  expect(useViewStore.getState().view).toBe('calculator');
});
