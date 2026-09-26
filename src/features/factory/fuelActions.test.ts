import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import type { GameData } from '@/shared/data/types';
import { chooseFuel } from './fuelActions';
import { useFactoryStore } from './store';

const data: GameData = {
  ...demoGameData,
  items: { ...demoGameData.items, Steam: { ...demoGameData.items.Water!, id: 'Steam', liquid: true, heatValue: 20 } },
  recipes: {
    ...demoGameData.recipes,
    SteamBoiler_Low: { ...demoGameData.recipes.Salt!, id: 'SteamBoiler_Low', inputs: [], outputs: [{ item: 'Steam', qty: 30, chance: 1 }] },
  },
};

test('choosing steam as factory fuel also assigns the recommended solid fuel to boilers', () => {
  useFactoryStore.setState({ factories: [], activeId: '' });
  useFactoryStore.getState().init({ fuel: 'Charcoal', fertilizer: null });
  chooseFuel(data, null, 'Steam');
  const plan = useFactoryStore.getState().factories[0]!.plan;
  expect(plan.fuel).toBe('Steam');
  expect(plan.fuelFor).toEqual({ SteamBoiler_Low: 'Charcoal' });
});
