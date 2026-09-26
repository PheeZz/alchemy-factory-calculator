import { renderHook } from '@testing-library/react';
import { encodeShare } from '@/features/factory/share';
import { emptyPlan, useFactoryStore } from '@/features/factory/store';
import { useToastStore } from '@/shared/ui/Toast';
import { useShareLinks } from './useShareLinks';

const link = (name: string) => encodeShare('25321648', { name, plan: { ...emptyPlan(), targets: [{ item: 'Coal', rate: 1 }] } });
const names = () => useFactoryStore.getState().factories.map((f) => f.name);

beforeEach(() => {
  localStorage.clear();
  useFactoryStore.setState({ factories: [], activeId: '' });
  useToastStore.setState({ toasts: [] });
  history.replaceState(null, '', '/');
});

test('imports a link present at startup, before any game data or locale is loaded, and clears the hash', () => {
  history.replaceState(null, '', `/${link('A')}`);
  renderHook(() => useShareLinks());
  expect(names()).toEqual(['A']);
  expect(location.hash).toBe('');
});

test('a link pasted into the same document (hashchange) is imported too', () => {
  renderHook(() => useShareLinks());
  history.replaceState(null, '', `/${link('B')}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  expect(names()).toEqual(['B']);
  expect(location.hash).toBe('');
});

test('a broken link shows an error toast and imports nothing', () => {
  history.replaceState(null, '', '/#s=broken');
  renderHook(() => useShareLinks());
  expect(names()).toEqual([]);
  expect(useToastStore.getState().toasts[0]?.tone).toBe('error');
});
