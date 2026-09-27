import type { SolveResult } from '@/features/solver/types';
import { demoGameData } from '../fixtures/demo-gamedata';
import { demoResult } from '../fixtures/demo-result';
import { fitLabel, layoutFlows, linkPath, toFlows } from './model';

const edge = (from: string, to: string, item: string, perMin: number) => ({ from, to, item, perMin, belts: 1 });
const node = (id: string) => ({ ...demoResult.nodes[0]!, id });

test('flows: self-loops dropped, fuel kept as a fuel link, endpoints become nodes', () => {
  const { nodes, links } = toFlows(demoGameData, demoResult);
  expect(links.some((l) => l.source === l.target)).toBe(false);
  expect(links.find((l) => l.source === 'n:Charcoal' && l.target === 'n:IronIngot')?.kind).toBe('fuel');
  expect(nodes.find((n) => n.id === 'target:Elixir')?.kind).toBe('target');
  expect(nodes.find((n) => n.id === 'surplus:Sawdust')?.kind).toBe('surplus');
});

test('flows: a cycle is cut at the link that returns upstream, so d3-sankey can lay it out', () => {
  const looped: SolveResult = {
    ...demoResult,
    nodes: [node('A'), node('B')],
    edges: [edge('import:Ore', 'A', 'Ore', 10), edge('A', 'B', 'x', 10), edge('B', 'A', 'y', 4), edge('B', 'target:Y', 'y', 6)],
  };
  const flows = toFlows(demoGameData, looped);
  expect(flows.links.map((l) => `${l.source}>${l.target}`)).toEqual(['import:Ore>A', 'A>B', 'B>target:Y']);
  const laid = layoutFlows(flows, 600, 300);
  expect(laid.links).toHaveLength(3);
  // Width ∝ flow: the 10/min link is wider than the 6/min one.
  expect(laid.links[1]!.width!).toBeGreaterThan(laid.links[2]!.width!);
});

test('hovered link lights its whole upstream and downstream path, not a sibling branch', () => {
  const links = [
    { source: 'import:Ore', target: 'A' },
    { source: 'A', target: 'B' },
    { source: 'B', target: 'target:X' },
    { source: 'import:Log', target: 'C' },
    { source: 'C', target: 'target:X' },
  ];
  expect([...linkPath(links, 1)].sort()).toEqual([0, 1, 2]);
});

test('node rate is the main product leaving a recipe (byproduct excluded) and the endpoint rate otherwise', () => {
  const { nodes } = toFlows(demoGameData, demoResult);
  const plank = nodes.find((n) => n.id === 'n:Plank')!;
  // Sawmill: 28/0.6·2 Plank to the kilns; the 35/6 Sawdust byproduct must not be added in.
  expect(plank.item).toBe('Plank');
  expect(plank.perMin).toBeCloseTo((28 / 0.6) * 2);
  expect(nodes.find((n) => n.id === 'import:Log')).toMatchObject({ item: 'Log', perMin: 35 / 3 });
  expect(nodes.find((n) => n.id === 'target:Elixir')).toMatchObject({ item: 'Elixir', perMin: 30 });
});

test('layout scrolls sideways only when columns would get narrower than a readable minimum', () => {
  const flows = toFlows(demoGameData, demoResult);
  expect(layoutFlows(flows, 300, 200).width).toBeGreaterThan(300);
  const wide = layoutFlows(flows, 1400, 500);
  expect(wide.width).toBe(1400);
  expect(wide.labelRoom).toBeGreaterThan(100);
});

test('labels shorten the name, never the rate, to fit the gap between columns', () => {
  expect(fitLabel('Камень', '300/мин', 200)).toBe('Камень');
  const cut = fitLabel('Порошок негашеной извести', '300/мин', 110);
  expect(cut.endsWith('…')).toBe(true);
  expect((cut.length + 1 + '300/мин'.length) * 6.8).toBeLessThanOrEqual(110);
});
