import { canRedo, canUndo, redo, resetHistory, undo, useHistory } from './history';
import { useFactoryStore } from './store';

const targets = () => {
  const s = useFactoryStore.getState();
  return s.factories.find((f) => f.id === s.activeId)!.plan.targets.map((t) => t.rate);
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useFactoryStore.setState({ factories: [], activeId: '' });
  useFactoryStore.getState().init({});
  resetHistory();
});
afterEach(() => vi.useRealTimers());

test('undo/redo walk plan changes; a new change clears redo', () => {
  const s = useFactoryStore.getState();
  s.addTarget({ item: 'A', rate: 1 });
  vi.advanceTimersByTime(1000);
  s.updateTarget(0, { rate: 2 });
  expect(targets()).toEqual([2]);
  undo();
  expect(targets()).toEqual([1]);
  undo();
  expect(targets()).toEqual([]);
  expect(canUndo()).toBe(false);
  redo();
  expect(targets()).toEqual([1]);
  vi.advanceTimersByTime(1000);
  s.updateTarget(0, { rate: 5 });
  expect(canRedo()).toBe(false);
});

test('rapid edits (typing a rate) coalesce into one undo step', () => {
  const s = useFactoryStore.getState();
  s.addTarget({ item: 'A', rate: 1 });
  vi.advanceTimersByTime(1000);
  for (const r of [1, 12, 120]) {
    s.updateTarget(0, { rate: r });
    vi.advanceTimersByTime(100);
  }
  undo();
  expect(targets()).toEqual([1]);
});

test('history is capped and never undoes back past the first factory', () => {
  const s = useFactoryStore.getState();
  for (let i = 0; i < 120; i++) {
    s.setLevels({ conveyor: i % 2 });
    vi.advanceTimersByTime(1000);
  }
  expect(useHistory.getState().past.length).toBe(100);
  resetHistory();
  useFactoryStore.setState({ factories: [] });
  // A snapshot with no factories must not be restorable.
  useFactoryStore.getState().init({});
  undo();
  expect(useFactoryStore.getState().factories.length).toBeGreaterThan(0);
});
