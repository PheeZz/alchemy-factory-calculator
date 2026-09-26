import { ru } from './ru';
import { en } from './en';
import { translate } from './index';

test('en covers exactly the ru keys', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
});

test('translate substitutes params', () => {
  expect(translate('en', 'app.title')).toBe('Alchemy Factory Calculator');
});
