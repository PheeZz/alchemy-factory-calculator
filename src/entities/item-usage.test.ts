import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { itemUsage } from './item-usage';

test('produced by: default recipe first, then alternates, special last; hidden never', () => {
  const data = {
    ...demoGameData,
    recipes: {
      ...demoGameData.recipes,
      CharcoalHidden: { ...demoGameData.recipes.Charcoal!, id: 'CharcoalHidden', hidden: true },
      CharcoalCauldron: { ...demoGameData.recipes.Charcoal!, id: 'CharcoalCauldron', special: 'cauldron' as const },
    },
  };
  expect(itemUsage(data, 'Charcoal').producedBy.map((r) => r.id)).toEqual(['Charcoal', 'CharcoalFromLog', 'CharcoalCauldron']);
});

test('used in: recipes that consume it, plus its fuel/fertilizer role', () => {
  const log = itemUsage(demoGameData, 'Log');
  expect(log.consumedBy.map((r) => r.id).sort()).toEqual(['CharcoalFromLog', 'Plank']);
  expect(log.heat).toBe(40);
  expect(itemUsage(demoGameData, 'PlantAsh').nutrient).toBe(8);
  expect(itemUsage(demoGameData, 'Elixir')).toMatchObject({ consumedBy: [], heat: 0, nutrient: 0 });
});

test('unknown id yields an empty usage instead of throwing', () => {
  expect(itemUsage(demoGameData, 'constructor')).toEqual({ producedBy: [], consumedBy: [], heat: 0, nutrient: 0 });
});
