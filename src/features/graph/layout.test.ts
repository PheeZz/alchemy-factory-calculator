import { demoGameData } from './fixtures/demo-gamedata';
import { demoResult } from './fixtures/demo-result';
import { flowDurationSec, labelWidth, toElements } from './elements';
import { layoutForView, layoutGraph } from './layout';
import { boundsOf } from './viewport';

const graph = () => toElements(demoGameData, demoResult);

test('layout: no node boxes overlap', async () => {
  const { nodes, edges } = graph();
  const { nodes: laid } = await layoutGraph(nodes, edges, labelWidth);
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
  const { nodes: laid } = await layoutGraph(nodes, edges, labelWidth);
  const imports = laid.filter((n) => n.type === 'import');
  const targets = laid.filter((n) => n.type === 'target');
  expect(imports.length).toBeGreaterThan(0);
  expect(targets.length).toBeGreaterThan(0);
  const maxImportX = Math.max(...imports.map((n) => n.position.x));
  const minTargetX = Math.min(...targets.map((n) => n.position.x));
  expect(maxImportX).toBeLessThan(minTargetX);
});

test('layout: every edge gets an orthogonal route from source side to target side with a label slot', async () => {
  const { nodes, edges } = graph();
  const { nodes: laid, routes } = await layoutGraph(nodes, edges, labelWidth);
  const byId = new Map(laid.map((n) => [n.id, n]));
  for (const e of edges) {
    const r = routes.get(e.id)!;
    expect(r.points.length).toBeGreaterThanOrEqual(2);
    // The label slot must sit on its own route; ELK leaves ignored labels (no `text`) at the origin.
    const xs = r.points.map((p) => p.x);
    const ys = r.points.map((p) => p.y);
    expect(r.label!.x).toBeGreaterThanOrEqual(Math.min(...xs) - 1);
    expect(r.label!.x).toBeLessThanOrEqual(Math.max(...xs) + 1);
    expect(r.label!.y).toBeGreaterThanOrEqual(Math.min(...ys));
    expect(r.label!.y).toBeLessThanOrEqual(Math.max(...ys));
    const src = byId.get(e.source)!;
    const start = r.points[0]!;
    // Starts on the source's boundary box.
    expect(start.x).toBeGreaterThanOrEqual(src.position.x - 1);
    expect(start.x).toBeLessThanOrEqual(src.position.x + src.width! + 1);
    for (let i = 1; i < r.points.length; i++) {
      const [a, b] = [r.points[i - 1]!, r.points[i]!];
      expect(Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5, `${e.id} segment ${i} is diagonal`).toBe(true);
    }
  }
});

test('elements: endpoints derived from edge ids, self-loops and fuel deliveries folded into nodes', () => {
  const { nodes, edges } = graph();
  expect(nodes.find((n) => n.id === 'import:Salt')?.type).toBe('import');
  expect(nodes.find((n) => n.id === 'surplus:Sawdust')?.type).toBe('surplus');
  expect(edges.some((e) => e.source === e.target)).toBe(false);
  const kiln = nodes.find((n) => n.id === 'n:Charcoal');
  expect(kiln?.type === 'recipe' && kiln.data.loops.map((l) => l.item)).toEqual(['Charcoal']);
  // Pure fuel deliveries become a chip on the producer, not edges across the chain.
  expect(edges.some((e) => e.source === 'n:Charcoal' && e.target === 'n:IronIngot')).toBe(false);
  expect(kiln?.type === 'recipe' && kiln.data.feeds).toEqual([{ item: 'Charcoal', kind: 'fuel', perMin: 28, consumers: 2 }]);
  expect(edges.find((e) => e.target === 'n:Elixir' && e.data?.edge.item === 'LinseedOil')?.data?.kind).toBe('liquid');
});

test('flow speed grows with throughput and stays bounded', () => {
  expect(flowDurationSec(1)).toBeGreaterThan(flowDurationSec(100));
  expect(flowDurationSec(0)).toBeLessThanOrEqual(6);
  expect(flowDurationSec(1e9)).toBe(0.8);
});

test('a long chain is wrapped into rows only when that makes it fit the view', async () => {
  const { nodes, edges } = graph();
  // Roomy view: the flat layout already fits.
  expect((await layoutForView(nodes, edges, labelWidth, { width: 2400, height: 1200 })).wrapped).toBe(false);
  // 900×700: the flat chain (~1480 px) would need zoom 0.53 < 0.55, two rows fit at ~0.68.
  const rows = await layoutForView(nodes, edges, labelWidth, { width: 900, height: 700 });
  expect(rows.wrapped).toBe(true);
  expect(boundsOf(rows.nodes).width).toBeLessThan(boundsOf((await layoutGraph(nodes, edges, labelWidth)).nodes).width);
  // Phone: nothing fits, keep the flat layout (target-side view takes over).
  expect((await layoutForView(nodes, edges, labelWidth, { width: 200, height: 200 })).wrapped).toBe(false);
});
