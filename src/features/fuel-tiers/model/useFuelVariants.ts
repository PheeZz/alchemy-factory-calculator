import { useEffect, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import type { FuelVariant, FuelVariantOptions } from '@/features/solver';
import type { UpgradeLevels } from '@/features/solver/types';
import { getSolverClient } from '@/features/factory/solverClient';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; variants: FuelVariant[] };

// Session cache by inputs: switching tabs or metrics must not re-run a few dozen solves.
const cache = new Map<string, Promise<FuelVariant[]>>();

function load(data: GameData, levels: UpgradeLevels, opts: FuelVariantOptions) {
  const key = JSON.stringify([data.build.id, levels, opts]);
  let p = cache.get(key);
  if (!p) {
    p = getSolverClient().rankFuelVariants(data, levels, opts);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

/** Fuel variants ranked in the solver worker for the given factory context. */
export function useFuelVariants(data: GameData, levels: UpgradeLevels, opts: FuelVariantOptions): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  const key = JSON.stringify([levels, opts]);
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    load(data, levels, opts).then(
      (variants) => alive && setState({ status: 'ready', variants }),
      () => alive && setState({ status: 'error' }),
    );
    return () => {
      alive = false;
    };
    // key stands in for levels/opts: callers pass fresh object literals every render.
  }, [data, key]);
  return state;
}
