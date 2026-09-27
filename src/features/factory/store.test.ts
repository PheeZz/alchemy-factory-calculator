import { useLangStore } from '@/shared/i18n';
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

test('another tab saving is picked up via the storage event; this tab keeps its active factory', async () => {
  const mine = useFactoryStore.getState().activeId;
  const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  const other = { id: 'other-tab', name: 'Из другой вкладки', plan: snapshot.state.factories[0].plan };
  snapshot.state.factories.push(other);
  snapshot.state.activeId = 'other-tab';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  await vi.waitFor(() => expect(useFactoryStore.getState().factories.map((f) => f.id)).toContain('other-tab'));
  expect(useFactoryStore.getState().activeId).toBe(mine);
  // The next local edit now saves both factories instead of dropping the other tab's one.
  useFactoryStore.getState().addTarget({ item: 'X', rate: 1 });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.factories).toHaveLength(2);
});

test('levels are clamped at the boundary: persisted, init with track lengths, setLevels', async () => {
  const max = { conveyor: 13, factorySpeed: 13, alchemySkill: 13, fuelEfficiency: 13, fertilizerEfficiency: 13 };
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  raw.state.levels = { conveyor: 20, factorySpeed: -2, alchemySkill: 2.6, fuelEfficiency: 'x' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  await useFactoryStore.persist.rehydrate();
  expect(useFactoryStore.getState().levels).toEqual({ conveyor: 20, factorySpeed: 0, alchemySkill: 3, fuelEfficiency: 0, fertilizerEfficiency: 0 });

  useFactoryStore.getState().init({}, max);
  expect(useFactoryStore.getState().levels.conveyor).toBe(13);
  useFactoryStore.getState().setLevels({ factorySpeed: 99 });
  expect(useFactoryStore.getState().levels.factorySpeed).toBe(13);
});

test('new factory names skip taken ones; clearOverrides resets recipe and machine choices', () => {
  useLangStore.setState({ lang: 'ru' });
  const s = useFactoryStore.getState();
  s.renameFactory(s.activeId, 'Завод 1');
  s.createFactory();
  s.createFactory();
  expect(useFactoryStore.getState().factories.map((f) => f.name)).toEqual(['Завод 1', 'Завод 2', 'Завод 3']);

  s.setRecipe('Charcoal', 'Coke');
  s.setBuilding('Coke', 'Athanor');
  s.setFuel('Coal');
  s.clearOverrides();
  const plan = active().plan;
  expect([plan.recipeFor, plan.buildingFor, plan.fuel]).toEqual([{}, {}, 'Coal']);
});

test('heater actions set and reset plan-wide and per-node heaters; clearOverrides drops node heaters too', () => {
  const s = useFactoryStore.getState();
  s.setHeater('StoneFurnace');
  s.setHeaterFor('Coke', 'SteamHeater');
  expect([active().plan.heater, active().plan.heaterFor]).toEqual(['StoneFurnace', { Coke: 'SteamHeater' }]);
  s.setHeaterFor('Coke', null);
  s.setHeater(null);
  expect([active().plan.heater, active().plan.heaterFor]).toEqual([null, {}]);
  s.setHeaterFor('Coke', 'SteamHeater');
  s.clearOverrides();
  expect(active().plan.heaterFor).toEqual({});
});

test('plan-level catalyst and machine-cap choices; negative caps are dropped; built checklist toggles', () => {
  const s = useFactoryStore.getState();
  s.setCatalystFor('GoldDust3', 'Catalyst3');
  s.setMachineCap('GoldDust3', 4);
  s.setMachineCap('Coke', -1);
  expect(active().plan.catalystFor).toEqual({ GoldDust3: 'Catalyst3' });
  expect(active().plan.machineCaps).toEqual({ GoldDust3: 4 });
  s.setMachineCap('GoldDust3', null);
  expect(active().plan.machineCaps).toEqual({});
  s.toggleBuilt('Crucible');
  expect(active().built).toEqual(['Crucible']);
  s.toggleBuilt('Crucible');
  expect(active().built).toEqual([]);
});

test('learned tech is a persisted player profile; null means everything open', async () => {
  const s = useFactoryStore.getState();
  expect(s.unlocked).toBeNull();
  s.setUnlocked(['Level1']);
  const raw = localStorage.getItem(STORAGE_KEY)!;
  useFactoryStore.setState({ unlocked: null });
  localStorage.setItem(STORAGE_KEY, raw);
  await useFactoryStore.persist.rehydrate();
  expect(useFactoryStore.getState().unlocked).toEqual(['Level1']);
  s.setUnlocked(null);
});
