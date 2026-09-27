import type { GameData } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { isSteamLike } from './steam';
import type { SolveErrorInfo } from './useSolve';

/** Why a plan did not solve, in the player's words; shared by the calculator and the comparison. */
export function useErrorMessage(data: GameData, error: SolveErrorInfo) {
  const t = useT();
  const name = useNames();
  const item = error.item ? name(data.items[error.item]?.nameKey ?? error.item) : '';
  if (error.requiredTech?.length) return t('error.needsTech', { item });
  if (error.code === 'invalidInput' && isSteamLike(data.items[error.item ?? ''])) return t('error.steamBoiler');
  if (error.code === 'infeasible' && error.item) return t('error.infeasibleItem', { item });
  if (error.code === 'unreachable' && !error.item) return t('error.infeasible');
  return t(`error.${error.code}`, { item });
}
