import type { SolveResult } from '@/features/solver/types';
import { branchOf, collapseBranches, collapsibleNodes } from './collapse';

const node = (id: string, machines: number) =>
  ({ id, recipe: id, building: 'B', batchesPerMin: 1, machinesExact: machines, machines, utilization: 1, portWarnings: [] }) as SolveResult['nodes'][number];
const edge = (from: string, to: string, item: string, perMin: number) => ({ from, to, item, perMin, belts: 1 });

// Ore ─┬─> A ──> B ──> R ──> target:R      S is shared: it feeds A (inside R's branch) and Z (outside).
//      ├─> C ─┘↑  │      ↕                 B ⇄ C is a loop inside the branch; R ⇄ L loops through the root.
//      └─> S ──┴──┼───> Z ──> target:Z     A dumps slag to surplus, which must not keep A visible.
const hand: SolveResult = {
  beltSpeed: 60,
  nodes: [node('A', 2), node('B', 3), node('C', 1), node('S', 4), node('Z', 1), node('R', 5), node('L', 2)],
  edges: [
    edge('import:Ore', 'A', 'ore', 10),
    edge('import:Ore', 'C', 'ore', 5),
    edge('import:Ore', 'S', 'ore', 20),
    edge('S', 'A', 's', 6),
    edge('S', 'Z', 's', 14),
    edge('A', 'B', 'a', 8),
    edge('A', 'surplus:Slag', 'slag', 2),
    edge('C', 'B', 'c', 3),
    edge('B', 'C', 'b', 1),
    edge('B', 'R', 'b', 7),
    edge('R', 'L', 'r', 70),
    edge('L', 'R', 'l', 50),
    edge('R', 'R', 'seed', 4),
    edge('R', 'target:R', 'r', 30),
    edge('Z', 'target:Z', 'z', 14),
  ],
  totals: {} as SolveResult['totals'],
};

test('branch: nodes that only feed the root, loops included; a shared intermediate stays', () => {
  expect([...branchOf(hand, 'R')].sort()).toEqual(['A', 'B', 'C', 'L']);
  expect(branchOf(hand, 'Z').size).toBe(0);
});

test('collapse: boundary edges re-attach to the root, summed per item; inner flows vanish', () => {
  const { result, hidden } = collapseBranches(hand, ['R']);
  expect(result.nodes.map((n) => n.id).sort()).toEqual(['R', 'S', 'Z']);
  expect(hidden.get('R')).toEqual({ nodes: 4, machines: 8 });
  const edges = result.edges.map((e) => `${e.from}>${e.to}:${e.item}=${e.perMin}`).sort();
  expect(edges).toEqual([
    'R>R:seed=4',
    'R>surplus:Slag:slag=2',
    'R>target:R:r=30',
    'S>R:s=6',
    'S>Z:s=14',
    'Z>target:Z:z=14',
    'import:Ore>R:ore=15',
    'import:Ore>S:ore=20',
  ]);
});

test('collapse: an inner fold rolls up into the outer one and expanding the outer restores it', () => {
  const nested = collapseBranches(hand, ['B', 'R']);
  expect(nested.hidden.has('B')).toBe(false);
  expect(nested.hidden.get('R')).toEqual({ nodes: 4, machines: 8 });

  const inner = collapseBranches(hand, ['B']);
  expect(inner.hidden.get('B')).toEqual({ nodes: 2, machines: 3 });
  expect(inner.result.nodes.map((n) => n.id)).not.toContain('C');
});

test('collapsible: only nodes with something upstream to fold', () => {
  expect([...collapsibleNodes(hand)].sort()).toEqual(['B', 'R']);
});
