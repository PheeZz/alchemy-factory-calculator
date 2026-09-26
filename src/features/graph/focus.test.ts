import { demoGameData } from './fixtures/demo-gamedata';
import { demoResult } from './fixtures/demo-result';
import { toElements } from './elements';
import { chainFocus } from './focus';

test('hovering a node lights it, its direct neighbours and the edges between them only', () => {
  const { edges } = toElements(demoGameData, demoResult);
  const f = chainFocus(edges, 'n:IronIngot')!;
  expect([...f.nodes].sort()).toEqual(['import:IronOre', 'n:Elixir', 'n:IronIngot']);
  expect(f.edges.size).toBe(2);
  expect(chainFocus(edges, null)).toBeNull();
});
