import type { GameData } from '@/shared/data/types';
import type { FuelVariantOptions } from '@/features/solver';
import type { UpgradeLevels } from '@/features/solver/types';
import { getSolverClient } from '@/features/factory/solverClient';
import { useCachedQuery } from '@/shared/lib/useCachedQuery';

/** Fuel variants ranked in the solver worker for the given factory context. */
export function useFuelVariants(data: GameData, levels: UpgradeLevels, opts: FuelVariantOptions) {
  return useCachedQuery(JSON.stringify(['fuel', data.build.id, levels, opts]), () =>
    getSolverClient().rankFuelVariants(data, levels, opts),
  );
}
