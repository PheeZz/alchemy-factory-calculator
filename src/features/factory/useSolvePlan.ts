import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import type { FactoryPlan } from '@/features/solver/types';
import { sanitizeUnlocked } from './stale';
import { useActiveFactory, useFactoryStore } from './store';

/**
 * The active plan as every solver call must see it: the player's learned tech (a profile shared by
 * all factories, like upgrade levels) folded into `unlocked`.
 */
export function useSolvePlan(data: GameData): FactoryPlan {
  const plan = useActiveFactory().plan;
  const unlocked = useFactoryStore((s) => s.unlocked);
  return useMemo(() => ({ ...plan, unlocked: sanitizeUnlocked(data, unlocked) }), [plan, unlocked, data]);
}
