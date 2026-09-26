import { act, renderHook } from '@testing-library/react';
import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { demoResult } from '@/features/graph/fixtures/demo-result';
import { SolverError, type FactoryPlan } from '@/features/solver/types';
import { emptyPlan } from './store';

const solve = vi.fn();
vi.mock('@/features/solver/client', () => ({ createSolverClient: () => ({ solve, dispose: vi.fn() }) }));

const { useSolve } = await import('./useSolve');
const levels = { conveyor: 0, factorySpeed: 0, alchemySkill: 0, fuelEfficiency: 0, fertilizerEfficiency: 0 };
const plan = (rate: number): FactoryPlan => ({ ...emptyPlan(), targets: [{ item: 'Elixir', rate }] });

beforeEach(() => {
  vi.useFakeTimers();
  solve.mockReset();
});
afterEach(() => vi.useRealTimers());

test('debounces edits and ignores a slow answer to a superseded request', async () => {
  let resolveFirst!: (v: unknown) => void;
  solve.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValueOnce(demoResult);

  const { result, rerender } = renderHook(({ p }) => useSolve(demoGameData, p, levels), { initialProps: { p: plan(10) } });
  expect(result.current.status).toBe('solving');
  rerender({ p: plan(20) });
  await act(() => vi.advanceTimersByTimeAsync(149));
  expect(solve).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(solve).toHaveBeenCalledTimes(1);
  expect(solve.mock.calls[0]![1].targets).toEqual([{ item: 'Elixir', rate: 20 }]);

  rerender({ p: plan(30) });
  await act(() => vi.advanceTimersByTimeAsync(150));
  await act(async () => resolveFirst({ ...demoResult, beltSpeed: -1 }));
  expect(result.current).toEqual({ result: demoResult, status: 'idle' });
});

test('solver errors surface with code and item; empty plans do not call the solver', async () => {
  solve.mockRejectedValueOnce(new SolverError('unreachable', 'Salt'));
  const { result, rerender } = renderHook(({ p }) => useSolve(demoGameData, p, levels), { initialProps: { p: plan(10) } });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(result.current).toEqual({ result: null, status: 'error', error: { code: 'unreachable', item: 'Salt' } });

  rerender({ p: emptyPlan() });
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(result.current.status).toBe('idle');
  expect(solve).toHaveBeenCalledTimes(1);
});
