import highsLoader, { type Highs } from 'highs';
import wasmUrl from 'highs/runtime?url';
import { SolverError } from './types';

let loading: Promise<Highs> | undefined;

function loadHighs(): Promise<Highs> {
  // Node (vitest) finds highs.wasm next to the loader; bundled code must be pointed at the asset Vite emitted.
  const inNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
  loading ??= highsLoader(inNode ? {} : { locateFile: () => wasmUrl }).catch((e: unknown) => {
    loading = undefined;
    throw e;
  });
  return loading;
}

export interface LpRun {
  status: string;
  value(column: string): number;
}

const internal = (what: string, e: unknown) =>
  new SolverError('internal', undefined, `${what}: ${e instanceof Error ? e.message : String(e)}`);

export async function runLp(lp: string): Promise<LpRun> {
  const highs = await loadHighs().catch((e: unknown) => {
    throw internal('HiGHS failed to load', e);
  });
  let res: ReturnType<Highs['solve']>;
  try {
    res = highs.solve(lp, { output_flag: false });
  } catch (e) {
    throw internal('HiGHS rejected the model', e);
  }
  return {
    status: res.Status,
    value: (column) => (res.Columns[column] as { Primal?: number } | undefined)?.Primal ?? 0,
  };
}
