import highsLoader, { type Highs } from 'highs';
import wasmUrl from 'highs/runtime?url';

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

export async function runLp(lp: string): Promise<LpRun> {
  const highs = await loadHighs();
  const res = highs.solve(lp, { output_flag: false });
  return {
    status: res.Status,
    value: (column) => (res.Columns[column] as { Primal?: number } | undefined)?.Primal ?? 0,
  };
}
