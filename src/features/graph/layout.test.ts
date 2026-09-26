import { demoGameData } from './fixtures/demo-gamedata';
import { demoResult } from './fixtures/demo-result';
import { flowDurationSec, toElements } from './elements';
import { layoutGraph } from './layout';

const graph = () => toElements(demoGameData, demoResult);

test('layout: no node boxes overlap', async () => {
  const { nodes, edges } = graph();
  const laid = await layoutGraph(nodes, edges);
  for (let i = 0; i < laid.length; i++)
    for (let j = i + 1; j < laid.length; j++) {
      const a = laid[i]!;
      const b = laid[j]!;
      const apart =
        a.position.x + a.width! <= b.position.x ||
        b.position.x + b.width! <= a.position.x ||
        a.position.y + a.height! <= b.position.y ||
        b.position.y + b.height! <= a.position.y;
      expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
    }
});

test('layout: every import/raw node sits left of every target node', async () => {
  const { nodes, edges } = graph();
  const laid = await layoutGraph(nodes, edges);
  const imports = laid.filter((n) => n.type === 'import');
  const targets = laid.filter((n) => n.type === 'target');
  expect(imports.length).toBeGreaterThan(0);
  expect(targets.length).toBeGreaterThan(0);
  const maxImportX = Math.max(...imports.map((n) => n.position.x));
  const minTargetX = Math.min(...targets.map((n) => n.position.x));
  expect(maxImportX).toBeLessThan(minTargetX);
});

test('elements: endpoints derived from edge ids, self-loops folded into nodes, fuel edges tagged', () => {
  const { nodes, edges } = graph();
  expect(nodes.find((n) => n.id === 'import:Salt')?.type).toBe('import');
  expect(nodes.find((n) => n.id === 'surplus:Sawdust')?.type).toBe('surplus');
  expect(edges.some((e) => e.source === e.target)).toBe(false);
  const kiln = nodes.find((n) => n.id === 'n:Charcoal');
  expect(kiln?.type === 'recipe' && kiln.data.loops.map((l) => l.item)).toEqual(['Charcoal']);
  expect(edges.find((e) => e.source === 'n:Charcoal' && e.target === 'n:IronIngot')?.data?.kind).toBe('fuel');
  expect(edges.find((e) => e.target === 'n:Elixir' && e.data?.edge.item === 'LinseedOil')?.data?.kind).toBe('liquid');
});

test('flow speed grows with throughput and stays bounded', () => {
  expect(flowDurationSec(1)).toBeGreaterThan(flowDurationSec(100));
  expect(flowDurationSec(0)).toBeLessThanOrEqual(6);
  expect(flowDurationSec(1e9)).toBe(0.8);
});
