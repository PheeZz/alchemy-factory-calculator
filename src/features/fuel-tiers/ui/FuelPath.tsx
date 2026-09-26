import { Fragment } from 'react';
import type { GameData } from '@/shared/data/types';
import { mainOutput } from '@/entities/game';
import { useNames, useT } from '@/shared/i18n';
import { ItemIcon } from '@/shared/ui/ItemIcon';

/** The chosen chain, fuel's own recipe first: "Кокс ← Угольный порошок ← …"; raw fuels say so. */
export function FuelPath({ data, path }: { data: GameData; path: string[] }) {
  const t = useT();
  const name = useNames();
  if (path.length === 0) return <span className="text-xs text-faint">{t('tiers.raw')}</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
      {path.map((id, i) => {
        const r = data.recipes[id];
        const out = r && mainOutput(r);
        const item = out ? data.items[out.item] : undefined;
        const label = item ? name(item.nameKey) : id;
        return (
          <Fragment key={id}>
            {i > 0 && <span aria-hidden="true">←</span>}
            <span className="inline-flex items-center gap-1">
              <ItemIcon icon={item?.icon ?? null} name={label} seed={out?.item ?? id} size={16} decorative />
              {label}
              {r?.alternate && <span className="text-faint">({t('tiers.alt')})</span>}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}
