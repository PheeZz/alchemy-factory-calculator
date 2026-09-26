import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { emptyPlan, useFactoryStore } from './store';

const fuelRanksFor = vi.fn();
vi.mock('./solverClient', () => ({ fuelRanksFor: (...a: unknown[]) => fuelRanksFor(...a) }));
const { planDefaults } = await import('./defaults');

const levels = { conveyor: 0, factorySpeed: 0, alchemySkill: 0, fuelEfficiency: 0, fertilizerEfficiency: 0 };

test('default fuel is the top of the solver ranking; ranking failure leaves fuel unset', async () => {
  fuelRanksFor.mockResolvedValueOnce([
    { item: 'Plank', machinesPerHeat: 0.01, rawPerHeat: 0.1 },
    { item: 'Charcoal', machinesPerHeat: 0.02, rawPerHeat: 0.1 },
  ]);
  expect((await planDefaults(demoGameData, levels)).fuel).toBe('Plank');
  fuelRanksFor.mockRejectedValueOnce(new Error('worker died'));
  expect(await planDefaults(demoGameData, levels)).toEqual({ fuel: null, fertilizer: null });
});

test("defaults apply to new factories only, never to an existing factory's explicit fuel", () => {
  useFactoryStore.setState({
    factories: [{ id: 'mine', name: 'Мой', plan: { ...emptyPlan(), fuel: 'Log' } }],
    activeId: 'mine',
  });
  useFactoryStore.getState().init({ fuel: 'Plank', fertilizer: null });
  expect(useFactoryStore.getState().factories[0]!.plan.fuel).toBe('Log');
  useFactoryStore.getState().createFactory();
  expect(useFactoryStore.getState().factories[1]!.plan.fuel).toBe('Plank');
});
