import { formatNumber, formatPercent, formatRate, splitCopper } from './format';

const plain = (s: string) => s.replace(/\s/g, ' ');

test('numbers use the locale decimal separator', () => {
  expect(formatNumber('ru', 3.456)).toBe('3,46');
  expect(formatNumber('en', 3.456)).toBe('3.46');
});

test('rates shrink precision with magnitude and go compact when huge', () => {
  expect(formatRate('ru', 1.234)).toBe('1,23');
  expect(formatRate('ru', 93.333)).toBe('93,3');
  expect(plain(formatRate('ru', 1234.5))).toBe('1 235');
  expect(formatRate('en', 12_500)).toBe('12.5K');
});

test('percent is compact in every locale', () => {
  expect(formatPercent(0.853)).toBe('85%');
});

test('copper splits into gold/silver/copper', () => {
  expect(splitCopper(123_456)).toEqual({ gold: 1, silver: 23, copper: 456 });
  expect(splitCopper(999.6)).toEqual({ gold: 0, silver: 1, copper: 0 });
});
