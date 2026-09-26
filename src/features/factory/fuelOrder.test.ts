import { fuelItems } from '@/entities/game';
import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import type { GameData } from '@/shared/data/types';
import { orderFuels } from './fuelOrder';

const data: GameData = {
  ...demoGameData,
  items: {
    ...demoGameData.items,
    Steam: { ...demoGameData.items.Water!, id: 'Steam', raw: true, liquid: true, heatValue: 20 },
    Tar: { ...demoGameData.items.Water!, id: 'Tar', raw: false, liquid: true, heatValue: 30 },
  },
  recipes: { ...demoGameData.recipes, Tar: { ...demoGameData.recipes.Salt!, id: 'Tar', outputs: [{ item: 'Tar', qty: 1, chance: 1 }] } },
};

test('fuel list drops producer-less liquids (free steam) but keeps produced ones', () => {
  const ids = fuelItems(data).map((i) => i.id);
  expect(ids).not.toContain('Steam');
  expect(ids).toContain('Tar');
});

test('fuels follow the solver ranking, unranked ones after it by name', () => {
  const ranks = [
    { item: 'Plank', machinesPerHeat: 1, rawPerHeat: 1 },
    { item: 'Log', machinesPerHeat: 2, rawPerHeat: 1 },
  ];
  const order = orderFuels(fuelItems(data), ranks, (k) => k).map((i) => i.id);
  expect(order.slice(0, 2)).toEqual(['Plank', 'Log']);
  expect(order.slice(2)).toEqual(['Charcoal', 'Tar']);
});
