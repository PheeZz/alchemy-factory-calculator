import type { TechNode } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';

/** Level nodes have no entity of their own: they read "Уровень N" (N = tier + 1). */
export function useTechLabel() {
  const t = useT();
  const name = useNames();
  return (n: TechNode) => (n.nameKey ? name(n.nameKey) : t('tech.level', { n: n.stage + 1 }));
}
