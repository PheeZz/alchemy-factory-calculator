import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { demoResult } from '@/features/graph/fixtures/demo-result';
import { resolveSelection } from './selection';

test('a solved node is inspected with its numbers', () => {
  const sel = resolveSelection(demoGameData, demoResult, 'n:Charcoal');
  expect(sel).toMatchObject({ kind: 'recipe', recipeId: 'Charcoal' });
  expect(sel?.kind === 'recipe' && sel.node?.machines).toBe(5);
});

test('a just-picked recipe stays inspectable while solving or after the solve failed', () => {
  expect(resolveSelection(demoGameData, null, 'CharcoalFromLog')).toEqual({ kind: 'recipe', recipeId: 'CharcoalFromLog', node: undefined });
  expect(resolveSelection(demoGameData, demoResult, 'CharcoalFromLog')).toMatchObject({ kind: 'recipe', node: undefined });
});

test('unknown ids and prototype keys select nothing', () => {
  expect(resolveSelection(demoGameData, demoResult, 'constructor')).toBeNull();
  expect(resolveSelection(demoGameData, null, 'target:Elixir')).toBeNull();
});
