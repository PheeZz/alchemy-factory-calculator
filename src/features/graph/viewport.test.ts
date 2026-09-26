import { openingViewport } from './viewport';

const desktop = { width: 1050, height: 510 };
const phone = { width: 390, height: 700 };

test('a small chain (≈8 nodes) fits entirely and is centered', () => {
  const graph = { x: 24, y: 24, width: 1500, height: 400 };
  const v = openingViewport(graph, null, desktop);
  expect(v.zoom).toBeGreaterThanOrEqual(0.55);
  // Both ends inside the view.
  expect(graph.x * v.zoom + v.x).toBeGreaterThanOrEqual(0);
  expect((graph.x + graph.width) * v.zoom + v.x).toBeLessThanOrEqual(desktop.width);
});

test('a large chain opens at a legible zoom on the target side, centered on the target', () => {
  const graph = { x: 24, y: 24, width: 9000, height: 2400 };
  const target = { x: 8800, y: 1200, width: 184, height: 56 };
  const v = openingViewport(graph, target, desktop);
  expect(v.zoom).toBe(0.75);
  expect((graph.x + graph.width) * v.zoom + v.x).toBeCloseTo(desktop.width - 24);
  expect((target.y + target.height / 2) * v.zoom + v.y).toBeCloseTo(desktop.height / 2);
});

test('phones accept a smaller fit before switching to the target view', () => {
  const graph = { x: 0, y: 0, width: 750, height: 300 };
  expect(openingViewport(graph, null, phone).zoom).toBeCloseTo((390 * 0.88) / 750);
  expect(openingViewport({ ...graph, width: 3000 }, null, phone).zoom).toBe(0.6);
});
