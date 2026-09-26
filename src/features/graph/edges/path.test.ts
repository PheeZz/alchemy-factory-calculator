import { roundedPath } from './path';

test('straight route is a single line; corners become quadratic curves', () => {
  expect(roundedPath([{ x: 0, y: 0 }, { x: 50, y: 0 }])).toBe('M 0 0 L 50 0');
  expect(roundedPath([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }])).toBe('M 0 0 L 30 0 Q 40 0 40 10 L 40 40');
  // Short segment: radius shrinks to half its length.
  expect(roundedPath([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 40 }])).toBe('M 0 0 L 3 0 Q 6 0 6 3 L 6 40');
});
