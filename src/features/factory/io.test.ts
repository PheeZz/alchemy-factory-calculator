import { importFile, parseImport, serializeExport } from './io';
import { useFactoryStore } from './store';

beforeEach(() => {
  localStorage.clear();
  useFactoryStore.setState({ factories: [], activeId: '' });
  useFactoryStore.getState().init({});
});

test('export → import merges the backup as new factories and restores levels', () => {
  const s = useFactoryStore.getState();
  s.addTarget({ item: 'HealingPotion', rate: 6 });
  s.setLevels({ conveyor: 5 });
  const text = serializeExport('25321648');

  s.setLevels({ conveyor: 0 });
  const res = importFile(text);

  const after = useFactoryStore.getState();
  expect(res.ok).toBe(true);
  expect(after.factories).toHaveLength(2);
  expect(after.factories[1]!.plan.targets).toEqual([{ item: 'HealingPotion', rate: 6 }]);
  expect(after.factories[1]!.id).not.toBe(after.factories[0]!.id);
  expect(after.levels.conveyor).toBe(5);
});

test('invalid files are rejected with a reason and change nothing', () => {
  const snapshot = useFactoryStore.getState().factories;
  expect(importFile('{not json').ok).toBe(false);
  expect(parseImport('{"kind":"other"}')).toEqual({ ok: false, error: 'kind' });
  expect(parseImport('{"kind":"alchemy-factory-calculator","v":9}')).toEqual({ ok: false, error: 'version' });
  expect(
    parseImport('{"kind":"alchemy-factory-calculator","v":1,"factories":[{"name":"x","plan":{}}]}'),
  ).toEqual({ ok: false, error: 'shape' });
  expect(useFactoryStore.getState().factories).toBe(snapshot);
});
