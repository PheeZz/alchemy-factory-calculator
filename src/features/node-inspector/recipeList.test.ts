import { rankedRecipesFor } from '@/entities/game';
import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import type { GameData, Recipe } from '@/shared/data/types';
import { COLLAPSED_COUNT, filterRecipes, visibleRecipes } from './recipeList';

const base = demoGameData.recipes.Salt!;
const paradox = (input: string, alternate = true): Recipe => ({
  ...base,
  id: `Paradox_${input}`,
  nameKey: 'item.Mors',
  inputs: [{ item: input, qty: 1 }],
  outputs: [{ item: 'Mors', qty: 1, chance: 1 }],
  alternate,
});

const data: GameData = {
  ...demoGameData,
  items: {
    ...demoGameData.items,
    Mors: { ...demoGameData.items.Salt!, id: 'Mors' },
    ...Object.fromEntries(
      ['Gold', 'Lead', 'Sand', 'Limestone', 'Iron', 'Clay', 'Ash'].map((id, i) => [id, { ...demoGameData.items.Salt!, id, value: (i + 1) * 10 }]),
    ),
  },
  recipes: {
    ...demoGameData.recipes,
    ...Object.fromEntries(
      [paradox('Gold'), paradox('Limestone', false), paradox('Sand'), paradox('Clay'), paradox('Lead'), paradox('Iron'), paradox('Ash')].map((r) => [r.id, r]),
    ),
    Paradox_Hidden: { ...paradox('Ash'), id: 'Paradox_Hidden', hidden: true },
    Paradox_Special: { ...paradox('Ash'), id: 'Paradox_Special', special: 'cauldron' },
  },
};

test('alternatives: solver default first, then cheapest inputs per output; hidden/special excluded', () => {
  const ids = rankedRecipesFor(data, 'Mors').map((r) => r.id);
  expect(ids[0]).toBe('Paradox_Limestone');
  // Input values: Gold 10, Lead 20, Sand 30, Iron 50, Clay 60, Ash 70.
  expect(ids.slice(1)).toEqual(['Paradox_Gold', 'Paradox_Lead', 'Paradox_Sand', 'Paradox_Iron', 'Paradox_Clay', 'Paradox_Ash']);
  expect(ids).not.toContain('Paradox_Hidden');
  expect(ids).not.toContain('Paradox_Special');
});

test('collapsed list keeps the current choice visible; filter matches input names', () => {
  const list = rankedRecipesFor(data, 'Mors');
  const collapsed = visibleRecipes(list, 'Paradox_Ash', false);
  expect(collapsed).toHaveLength(COLLAPSED_COUNT + 1);
  expect(collapsed.at(-1)!.id).toBe('Paradox_Ash');
  expect(visibleRecipes(list, 'Paradox_Ash', true)).toHaveLength(list.length);

  const byInput = (r: Recipe) => r.inputs.map((s) => s.item).join(' ');
  expect(filterRecipes(list, 'sa', byInput).map((r) => r.id)).toEqual(['Paradox_Sand']);
});
