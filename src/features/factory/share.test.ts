import { decodeShare, encodeShare, importShareHash, shareUrl } from './share';
import { emptyPlan, useFactoryStore } from './store';

const factory = {
  name: 'Эликсирная',
  plan: { ...emptyPlan(), targets: [{ item: 'HealingPotion', rate: 12.5 }], imports: ['Salt'], recipeFor: { Coke: 'Coke' } },
};

beforeEach(() => {
  localStorage.clear();
  useFactoryStore.setState({ factories: [], activeId: '' });
  useFactoryStore.getState().init({});
});

test('round-trip: encoded link decodes to the same factory', () => {
  const hash = encodeShare('25321648', factory);
  expect(hash.startsWith('#s=')).toBe(true);
  expect(decodeShare(hash)).toEqual({ ok: true, build: '25321648', factory });
});

test('valid link imports as a new factory without overwriting existing ones', () => {
  const before = useFactoryStore.getState().factories;
  const res = importShareHash(encodeShare('25321648', factory));
  const after = useFactoryStore.getState();
  expect(res.ok).toBe(true);
  expect(after.factories).toHaveLength(before.length + 1);
  expect(after.factories[0]).toEqual(before[0]);
  expect(after.factories.find((f) => f.id === after.activeId)?.plan).toEqual(factory.plan);
});

test('broken share link: truncated or garbage hash returns an error and leaves the store untouched', () => {
  const hash = encodeShare('25321648', factory);
  const snapshot = useFactoryStore.getState().factories;
  for (const bad of [hash.slice(0, hash.length - 12), hash.slice(0, 10), '#s=%%%not-lz', '#s=', '#x=abc']) {
    expect(importShareHash(bad).ok).toBe(false);
  }
  expect(useFactoryStore.getState().factories).toBe(snapshot);
});

test('a payload with the wrong shape or version is rejected', async () => {
  const { compressToEncodedURIComponent } = await import('lz-string');
  const enc = (v: unknown) => '#s=' + compressToEncodedURIComponent(JSON.stringify(v));
  expect(decodeShare(enc({ v: 2, build: 'x', factory }))).toEqual({ ok: false, error: 'version' });
  expect(decodeShare(enc({ v: 1, build: 'x', factory: { name: 'x', plan: { targets: 'no' } } }))).toEqual({
    ok: false,
    error: 'format',
  });
});

test('heater fields survive a share round-trip; plans from before heaters still decode', () => {
  const withHeater = { name: 'H', plan: { ...emptyPlan(), heater: 'StoneFurnace', heaterFor: { Coke: 'SteamHeater' } } };
  expect(decodeShare(encodeShare('b', withHeater))).toEqual({ ok: true, build: 'b', factory: withHeater });
  const { heater: _h, heaterFor: _hf, ...legacyPlan } = emptyPlan();
  expect(decodeShare(encodeShare('b', { name: 'old', plan: legacyPlan })).ok).toBe(true);
});

test('share links keep the page path but not the ?view= switch', () => {
  history.replaceState(null, '', '/alchemy-factory-calculator/?view=fuel');
  const url = new URL(shareUrl('b', factory));
  expect(url.pathname).toBe('/alchemy-factory-calculator/');
  expect(url.search).toBe('');
  expect(decodeShare(url.hash)).toMatchObject({ ok: true });
});
