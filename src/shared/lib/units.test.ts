import { fromPerMin, toPerMin } from './units';

test('rates convert from the internal /min and back without drift', () => {
  expect(fromPerMin(60, 'sec')).toBe(1);
  expect(fromPerMin(2.5, 'hour')).toBe(150);
  expect(toPerMin(1, 'sec')).toBe(60);
  for (const u of ['sec', 'min', 'hour'] as const) expect(toPerMin(fromPerMin(37.25, u), u)).toBeCloseTo(37.25, 10);
});
