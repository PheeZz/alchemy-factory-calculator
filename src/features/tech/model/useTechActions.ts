import type { GameData } from '@/shared/data/types';
import { useFactoryStore } from '@/features/factory/store';
import { learn, openSet, unlearn } from '../lib/tech';

/** Toggle a node: learning adds its prerequisites, unlearning removes what depends on it. */
export function toggleTech(data: GameData, id: string) {
  const { unlocked, setUnlocked } = useFactoryStore.getState();
  const open = openSet(data, unlocked);
  setUnlocked(open === null || open.has(id) ? unlearn(data, unlocked, id) : learn(data, unlocked, [id]));
}

/** "Отметить изученными" from a solver error: learn these (and their prerequisites) at once. */
export function learnAll(data: GameData, ids: string[]) {
  const { unlocked, setUnlocked } = useFactoryStore.getState();
  setUnlocked(learn(data, unlocked ?? [], ids));
}
