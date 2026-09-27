import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import { useFactoryStore } from '@/features/factory/store';
import { lockedBy } from '../lib/tech';
import { useTechLabel } from './useTechLabel';

/**
 * For pickers: `recipe(id)` / `building(id)` return the label of the node still to learn, or null
 * when usable. A recipe also counts as locked when none of its machines is open.
 */
export function useLocks(data: GameData) {
  const unlocked = useFactoryStore((s) => s.unlocked);
  const label = useTechLabel();
  const lock = useMemo(() => lockedBy(data, unlocked), [data, unlocked]);
  return useMemo(() => {
    const building = (id: string) => {
      const n = lock.building(id);
      return n ? label(n) : null;
    };
    const recipe = (id: string) => {
      const own = lock.recipe(id);
      if (own) return label(own);
      const r = data.recipes[id];
      if (!r || r.buildings.length === 0 || r.buildings.some((b) => !lock.building(b))) return null;
      return building(r.buildings[0]!);
    };
    return { recipe, building };
  }, [lock, label, data]);
}
