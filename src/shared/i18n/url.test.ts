import { langFromUrl, pickLang, withLang } from './url';

const B = '/afc/';
const O = 'https://x.io';

test('the URL language: ?lang beats the /en/ path, junk is ignored', () => {
  expect(langFromUrl(`${O}/afc/`, B)).toBeNull();
  expect(langFromUrl(`${O}/afc/en/`, B)).toBe('en');
  expect(langFromUrl(`${O}/afc/?lang=en`, B)).toBe('en');
  expect(langFromUrl(`${O}/afc/en/?lang=ru`, B)).toBe('ru');
  expect(langFromUrl(`${O}/afc/?lang=de`, B)).toBeNull();
  expect(langFromUrl(`${O}/other/en/`, B)).toBeNull();
});

test('precedence: URL > saved > browser', () => {
  expect(pickLang('en', 'ru', 'ru-RU')).toBe('en');
  expect(pickLang(null, 'en', 'ru-RU')).toBe('en');
  expect(pickLang(null, null, 'en-GB')).toBe('en');
  expect(pickLang(null, null, 'de-DE')).toBe('ru');
});

test('switching moves between the entries and keeps other params and the hash', () => {
  expect(withLang(`${O}/afc/?view=fuel#s=1`, 'en', B)).toBe(`${O}/afc/en/?view=fuel&lang=en#s=1`);
  expect(withLang(`${O}/afc/en/?view=fuel&lang=en`, 'ru', B)).toBe(`${O}/afc/?view=fuel&lang=ru`);
  expect(withLang(`${O}/afc/en/`, 'en', B)).toBe(`${O}/afc/en/?lang=en`);
});
