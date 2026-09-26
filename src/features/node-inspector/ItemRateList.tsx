import type { GameData } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { formatRate } from '@/shared/lib/format';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import type { ItemRate } from './rates';

export function ItemRateList({ data, title, rates }: { data: GameData; title: string; rates: ItemRate[] }) {
  const t = useT();
  const name = useNames();
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium text-faint">{title}</h3>
      <ul className="flex flex-col gap-1">
        {rates.map((r) => {
          const item = data.items[r.item];
          const label = item ? name(item.nameKey) : r.item;
          return (
            <li key={r.item} className="flex items-center gap-2 text-sm">
              <ItemIcon icon={item?.icon ?? null} name={label} seed={r.item} size={22} decorative />
              <span className="line-clamp-2 min-w-0 flex-1 leading-snug" title={label}>
                {label}
              </span>
              <span className="num text-muted">{t('unit.perMin', { value: formatRate(t.lang, r.perMin) })}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
