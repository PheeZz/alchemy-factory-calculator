import { demoGameData, demoLocales } from '@/features/graph/fixtures/demo-gamedata';
import { buildIndex, searchIndex } from './search';

const index = buildIndex(demoGameData, (k) => demoLocales.ru[k] ?? k);

test('finds items by the Russian name and by the English id words', () => {
  expect(searchIndex(index, 'уголь')[0]).toMatchObject({ kind: 'item', id: 'Charcoal' });
  expect(searchIndex(index, 'iron ingot')[0]).toMatchObject({ kind: 'item', id: 'IronIngot' });
});

test('recipes are found by their inputs and open their main output', () => {
  const hit = searchIndex(index, 'брёвен').find((e) => e.kind === 'recipe');
  expect(hit).toMatchObject({ id: 'CharcoalFromLog', item: 'Charcoal' });
});

test('prefix matches outrank matches inside the name; items outrank recipes', () => {
  const ids = searchIndex(index, 'эл').map((e) => `${e.kind}:${e.id}`);
  expect(ids[0]).toBe('item:Elixir');
  expect(ids.indexOf('item:Elixir')).toBeLessThan(ids.indexOf('recipe:Elixir'));
});
