import type { GameData } from '@/shared/data/types';
import { maxLevelsOf, planDefaults } from '@/features/factory/defaults';
import { useFactoryStore } from '@/features/factory/store';

/** Runs once data is loaded: build-specific defaults (fuel ranked in the solver worker), first factory. */
export async function bootstrap(data: GameData) {
  const { levels, init } = useFactoryStore.getState();
  init(await planDefaults(data, levels), maxLevelsOf(data));
}
