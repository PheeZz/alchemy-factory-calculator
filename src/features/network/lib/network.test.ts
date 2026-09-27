import { demoResult } from '@/features/graph/fixtures/demo-result';
import { emptyPlan } from '@/features/factory/store';
import { solveAll, suppliersOf } from './network';

const plan = (item: string, imports: string[] = []) => ({ ...emptyPlan(), targets: [{ item, rate: 10 }], imports });

test('solves each factory, skips empty plans, and reports failures without dropping the rest', async () => {
  const solve = vi.fn(async (p: ReturnType<typeof plan>) => {
    if (p.targets[0]!.item === 'Broken') throw new Error('infeasible');
    return demoResult;
  });
  const { runs, failed } = await solveAll(
    [
      { id: 'a', plan: plan('Elixir') },
      { id: 'b', plan: plan('Broken') },
      { id: 'c', plan: emptyPlan() },
    ],
    solve,
  );
  expect(runs.map((r) => r.id)).toEqual(['a']);
  expect(failed).toEqual(['b']);
  expect(solve).toHaveBeenCalledTimes(2);
});

test('an import comes from the other factories that target the item', () => {
  const factories = [
    { id: 'salt', name: 'Соль', plan: plan('Salt') },
    { id: 'elixir', name: 'Эликсир', plan: plan('Elixir', ['Salt']) },
  ];
  expect(suppliersOf(factories, 'elixir', 'Salt').map((f) => f.name)).toEqual(['Соль']);
  expect(suppliersOf(factories, 'salt', 'Salt')).toEqual([]);
});
