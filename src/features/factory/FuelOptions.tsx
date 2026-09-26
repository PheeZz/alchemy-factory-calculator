import type { GameData } from '@/shared/data/types';
import { fuelItems } from '@/entities/game';
import { defaultFuel } from '@/features/solver';
import { useNames, useT } from '@/shared/i18n';
import { orderFuels } from './fuelOrder';
import { useFuelRanks } from './solverClient';
import { isSteamLike } from './steam';

/** <option>s for a fuel select: best-ranked first, the recommended one marked in its label. */
export function FuelOptions({ data, excludeSteam = false }: { data: GameData; excludeSteam?: boolean }) {
  const t = useT();
  const name = useNames();
  const ranks = useFuelRanks(data);
  const best = ranks ? defaultFuel(ranks, data) : null;
  return (
    <>
      {orderFuels(fuelItems(data).filter((i) => !(excludeSteam && isSteamLike(i))), ranks, name).map((i) => (
        <option key={i.id} value={i.id}>
          {i.id === best ? `${name(i.nameKey)} · ${t('settings.recommended')}` : name(i.nameKey)}
        </option>
      ))}
    </>
  );
}
