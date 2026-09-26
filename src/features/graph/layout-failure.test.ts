import { demoGameData } from './fixtures/demo-gamedata';
import { demoResult } from './fixtures/demo-result';
import { labelWidth, toElements } from './elements';

const constructed = vi.fn();
const terminated = vi.fn();
vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    constructor() {
      constructed();
    }
    layout() {
      return Promise.reject(new Error('elk crashed'));
    }
    terminateWorker() {
      terminated();
    }
  },
}));
const { layoutGraph } = await import('./layout');

test('an ELK failure falls back to a plain layered layout and the next layout gets a fresh ELK', async () => {
  const { nodes, edges } = toElements(demoGameData, demoResult);
  const first = await layoutGraph(nodes, edges, labelWidth);
  expect(first.fallback).toBe(true);
  expect(first.routes.size).toBe(0);

  const boxes = first.nodes.map((n) => ({ ...n.position, w: n.width!, h: n.height! }));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i]!, boxes[j]!];
      expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
    }
  const x = (id: string) => first.nodes.find((n) => n.id === id)!.position.x;
  expect(x('import:Log')).toBeLessThan(x('n:Plank'));
  expect(x('n:Elixir')).toBeLessThan(x('target:Elixir'));

  await layoutGraph(nodes, edges, labelWidth);
  expect(constructed).toHaveBeenCalledTimes(2);
  expect(terminated).toHaveBeenCalled();
});
