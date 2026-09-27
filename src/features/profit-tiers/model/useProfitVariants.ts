import type { GameData } from '@/shared/data/types';
import type { ProfitVariantOptions } from '@/features/solver';
import type { UpgradeLevels } from '@/features/solver/types';
import { getSolverClient } from '@/features/factory/solverClient';
import { useCachedQuery } from '@/shared/lib/useCachedQuery';

export function useProfitVariants(data: GameData, levels: UpgradeLevels, opts: ProfitVariantOptions) {
  return useCachedQuery(JSON.stringify(['profit', data.build.id, levels, opts]), () =>
    getSolverClient().rankProfitVariants(data, levels, opts),
  );
}
