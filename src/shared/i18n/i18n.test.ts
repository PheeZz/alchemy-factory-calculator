import { ru } from './ru';
import { en } from './en';
import { translate } from './index';

test('en covers exactly the ru keys', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
});

test('translate substitutes params', () => {
  expect(translate('en', 'app.title')).toBe('Alchemy Factory Calculator');
});

test('rates render in the chosen unit through t.rate, inputs convert back to /min', async () => {
  const { renderHook, act } = await import('@testing-library/react');
  const { useT, useLangStore } = await import('./index');
  const { useUnitStore } = await import('@/shared/lib/units');
  useLangStore.setState({ lang: 'ru' });
  const { result } = renderHook(() => useT());
  expect(result.current.rate(90)).toBe('90/мин');
  act(() => useUnitStore.getState().setRateUnit('sec'));
  expect(result.current.rate(90)).toBe('1,5/с');
  expect(result.current.rateSuffix).toBe('/с');
  expect(result.current.toPerMin(2)).toBe(120);
  act(() => useUnitStore.getState().setRateUnit('hour'));
  expect(result.current.rate(90)).toBe('5 400/ч');
  act(() => useUnitStore.getState().setRateUnit('min'));
});
