import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import { byproductOptions } from '@/features/solver';
import type { SolveResult } from '@/features/solver/types';
import { sanitizeUnlocked } from '@/features/factory/stale';
import { useFactoryStore } from '@/features/factory/store';
import { useItemCard } from '@/features/item-card/model/useItemCard';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Coins } from '@/shared/ui/Coins';
import { ItemIcon } from '@/shared/ui/ItemIcon';

/** Each surplus: sell it (value per unit of time), burn it (heat), or feed it to a recipe (click → card). */
export function ByproductOptions({ data, result }: { data: GameData; result: SolveResult }) {
  const t = useT();
  const name = useNames();
  const levels = useFactoryStore((s) => s.levels);
  const unlocked = useFactoryStore((s) => s.unlocked);
  const options = useMemo(
    () => byproductOptions(data, result, { levels, unlocked: sanitizeUnlocked(data, unlocked), limit: 3 }),
    [data, result, levels, unlocked],
  );
  if (options.length === 0) return <p className="text-sm text-faint">{t('summary.none')}</p>;
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  return (
    <ul className="flex flex-col gap-2.5">
      {options.map((o) => (
        <li key={o.item} className="rounded-lg border border-line bg-void/30 p-2">
          <div className="flex items-center gap-2 text-sm">
            <ItemIcon icon={data.items[o.item]?.icon ?? null} name={itemName(o.item)} seed={o.item} size={20} decorative />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{itemName(o.item)}</span>
            <span className="num text-muted">{t.rate(o.perMin)}</span>
          </div>
          <div className="num mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {o.saleValuePerMin !== null && (
              <span className="inline-flex items-center gap-1.5">
                {t('byproduct.sell')} <Coins copper={t.fromPerMin(o.saleValuePerMin)} />
              </span>
            )}
            {o.heatPerSec !== null && <span className="text-ember">{t('byproduct.burn', { heat: formatNumber(t.lang, o.heatPerSec, 1) })}</span>}
          </div>
          {o.consumers.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-faint">{t('byproduct.feed')}</span>
              {o.consumers.map((c) => (
                <button
                  key={c.recipe}
                  type="button"
                  onClick={() => useItemCard.getState().open(c.product)}
                  title={itemName(c.product)}
                  className="num inline-flex items-center gap-1 rounded-lg border border-line px-1.5 py-0.5 text-xs text-muted hover:border-flow/50 hover:text-ink"
                >
                  <ItemIcon icon={data.items[c.product]?.icon ?? null} name={itemName(c.product)} seed={c.product} size={16} decorative />
                  {itemName(c.product)}
                  <span className="text-faint">{t('byproduct.machines', { n: formatNumber(t.lang, c.machinesExact, 1) })}</span>
                </button>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
