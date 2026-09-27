import { resolvePair } from './pair';
import { splitRows, trend } from './rows';

const row = (id: string, a: number, b: number) => ({ id, a, b, delta: b - a });

test('trend: less is better, float residue is no change', () => {
  expect(trend(-1)).toBe('better');
  expect(trend(2)).toBe('worse');
  expect(trend(1e-12)).toBe('same');
});

test('splitRows sorts changes by |Δ| desc, keeps unchanged apart, drops rows absent from both', () => {
  const { changed, unchanged } = splitRows([row('small', 5, 6), row('zero', 0, 0), row('same', 3, 3), row('big', 10, 2), row('new', 0, 4)]);
  expect(changed.map((r) => r.id)).toEqual(['big', 'new', 'small']);
  expect(unchanged.map((r) => r.id)).toEqual(['same']);
});

test('resolvePair: A = active, B = newest other; explicit picks win while they exist', () => {
  const ids = ['f1', 'f2', 'f3'];
  expect(resolvePair(ids, 'f3', { a: null, b: null })).toEqual({ a: 'f3', b: 'f2' });
  expect(resolvePair(ids, 'f1', { a: null, b: null })).toEqual({ a: 'f1', b: 'f3' });
  expect(resolvePair(ids, 'f1', { a: 'f2', b: 'gone' })).toEqual({ a: 'f2', b: 'f3' });
  expect(resolvePair(['f1'], 'f1', { a: null, b: null })).toEqual({ a: 'f1', b: null });
});
