import { STORAGE_KEY, useFactoryStore } from './store';

const active = () => {
  const s = useFactoryStore.getState();
  return s.factories.find((f) => f.id === s.activeId)!;
};

beforeEach(async () => {
  localStorage.clear();
  const fresh = useFactoryStore.getState().createFactory('fresh');
  useFactoryStore.setState((s) => ({ factories: s.factories.filter((f) => f.id === fresh), activeId: fresh }));
});

test('addTarget appends to the active factory only', () => {
  const other = useFactoryStore.getState().factories[0]!.id;
  useFactoryStore.getState().createFactory('second');
  useFactoryStore.getState().addTarget({ item: 'Elixir', rate: 30 });
  expect(active().plan.targets).toEqual([{ item: 'Elixir', rate: 30 }]);
  expect(useFactoryStore.getState().factories.find((f) => f.id === other)!.plan.targets).toEqual([]);
});

test('toggleImport twice restores the plan', () => {
  const { toggleImport } = useFactoryStore.getState();
  toggleImport('Salt');
  expect(active().plan.imports).toEqual(['Salt']);
  toggleImport('Salt');
  expect(active().plan.imports).toEqual([]);
});

test('persist round-trip through localStorage', async () => {
  const s = useFactoryStore.getState();
  s.addTarget({ item: 'Elixir', rate: 12.5 });
  s.setRecipe('Charcoal', 'CharcoalFromLog');
  s.setLevels({ conveyor: 4 });
  const raw = localStorage.getItem(STORAGE_KEY)!;
  expect(JSON.parse(raw).version).toBe(1);

  // Wipe memory (persist writes this too), then put the saved snapshot back as a fresh page load would see it.
  useFactoryStore.setState({ factories: [], levels: { ...s.levels, conveyor: 0 } });
  localStorage.setItem(STORAGE_KEY, raw);
  await useFactoryStore.persist.rehydrate();

  expect(active().plan.targets).toEqual([{ item: 'Elixir', rate: 12.5 }]);
  expect(active().plan.recipeFor).toEqual({ Charcoal: 'CharcoalFromLog' });
  expect(useFactoryStore.getState().levels.conveyor).toBe(4);
});

test('unknown stored version or garbage resets instead of throwing', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { factories: 'nope' }, version: 99 }));
  await expect(useFactoryStore.persist.rehydrate()).resolves.not.toThrow();
  expect(useFactoryStore.getState().factories.length).toBeGreaterThan(0);
  expect(active()).toBeDefined();

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { factories: 42 }, version: 1 }));
  await useFactoryStore.persist.rehydrate();
  expect(active().plan.targets).toBeDefined();
});

test('deleting the last factory leaves a fresh active one', () => {
  const s = useFactoryStore.getState();
  s.deleteFactory(s.activeId);
  const after = useFactoryStore.getState();
  expect(after.factories).toHaveLength(1);
  expect(after.activeId).toBe(after.factories[0]!.id);
});

test('init creates the first factory with build defaults only when none exist', () => {
  useFactoryStore.setState({ factories: [], activeId: '' });
  useFactoryStore.getState().init({ fuel: 'Charcoal', fertilizer: 'BasicFertilizer' });
  const first = active();
  expect(first.plan.fuel).toBe('Charcoal');
  expect(first.plan.fertilizer).toBe('BasicFertilizer');
  expect(first.plan.targets).toEqual([]);

  useFactoryStore.getState().init({ fuel: 'Coal' });
  expect(useFactoryStore.getState().factories).toHaveLength(1);
  useFactoryStore.getState().createFactory();
  expect(active().plan.fuel).toBe('Coal');
});
