import { useEffect, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import { createSolverClient, type FuelRank } from '@/features/solver';
import type { UpgradeLevels } from '@/features/solver/types';

// One worker for the app lifetime: HiGHS WASM init and the GameData post are paid once.
let client: ReturnType<typeof createSolverClient> | null = null;
export const getSolverClient = () => (client ??= createSolverClient());

const fuelRanks = new Map<string, Promise<FuelRank[]>>();

/**
 * Fuel ranking, once per build for the session (it only guides defaults and list order, so
 * re-ranking on every level change is not worth the solver time). Failures are not cached.
 */
export function fuelRanksFor(data: GameData, levels: UpgradeLevels, fertilizer: string | null): Promise<FuelRank[]> {
  let p = fuelRanks.get(data.build.id);
  if (!p) {
    p = getSolverClient().rankFuels(data, levels, fertilizer);
    fuelRanks.set(data.build.id, p);
    p.catch(() => fuelRanks.delete(data.build.id));
  }
  return p;
}

/** Ranking already computed at bootstrap for this build, or null while/if unavailable. */
export function useFuelRanks(data: GameData): FuelRank[] | null {
  const [ranks, setRanks] = useState<FuelRank[] | null>(null);
  useEffect(() => {
    let alive = true;
    fuelRanks.get(data.build.id)?.then(
      (r) => alive && setRanks(r),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [data]);
  return ranks;
}
