import type { SolveResult } from '@/features/solver/types';
import { demoGameData } from '../fixtures/demo-gamedata';
import { demoResult } from '../fixtures/demo-result';
import { layoutFlows, linkPath, toFlows } from './model';

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

test('layout grows past the box when columns would not leave room for labels', () => {
  const laid = layoutFlows(toFlows(demoGameData, demoResult), 300, 200);
  expect(laid.width).toBeGreaterThan(300);
});
