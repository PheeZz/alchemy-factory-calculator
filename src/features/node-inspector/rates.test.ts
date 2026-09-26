import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { demoResult } from '@/features/graph/fixtures/demo-result';
import { recipeRates } from './rates';

test('rates scale by batches/min and only yield-skill outputs get the alchemy multiplier', () => {
  const oil = demoResult.nodes.find((n) => n.recipe === 'LinseedOil')!;
  const r = recipeRates(demoGameData.recipes.LinseedOil!, oil, 1.5);
  expect(r.inputs).toEqual([
    { item: 'Flax', perMin: 120 },
    { item: 'Water', perMin: 60 },
  ]);
  expect(r.outputs).toEqual([{ item: 'LinseedOil', perMin: 90 }]);

  const ingot = demoResult.nodes.find((n) => n.recipe === 'IronIngot')!;
  expect(recipeRates(demoGameData.recipes.IronIngot!, ingot, 1.5).outputs[0]!.perMin).toBe(30);
});
