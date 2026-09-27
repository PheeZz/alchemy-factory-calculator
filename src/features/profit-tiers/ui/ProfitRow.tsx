import { forwardRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { GameData } from '@/shared/data/types';
import type { ProfitVariant } from '@/features/solver';
import { RecipePath } from '@/entities/ui/RecipePath';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import type { Tier } from '@/shared/lib/tiers';
import { Button } from '@/shared/ui/Button';
import { Coins } from '@/shared/ui/Coins';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { TierBadge } from '@/shared/ui/TierBadge';
import { TIER_STYLE } from '@/shared/ui/tierStyle';
import type { ProfitMetric } from '../lib/profit';

export const PROFIT_GRID =
  'lg:grid-cols-[2.5rem_minmax(14rem,1.5fr)_8rem_7.5rem_7rem_5.5rem_minmax(8rem,1fr)_8.5rem]';

function Cell({ label, active, children }: { label: string; active?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-faint lg:sr-only">{label}</div>
      <div className={cx('num text-sm', active ? 'font-semibold text-ink' : 'text-ink/85')}>{children}</div>
    </div>
  );
}

export const ProfitRow = forwardRef<
  HTMLLIElement,
  { data: GameData; variant: ProfitVariant; tier: Tier | null; metric: ProfitMetric; layoutId: string; onUse: (b: HTMLElement) => void }
>(function ProfitRow({ data, variant: v, tier, metric, layoutId, onUse }, ref) {
  const t = useT();
  const name = useNames();
  const item = data.items[v.item];
  const label = item ? name(item.nameKey) : v.item;
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  return (
    <motion.li
      ref={ref}
      layoutId={layoutId}
      layout="position"
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className={cx(
        'relative grid grid-cols-2 gap-x-4 gap-y-3 overflow-hidden rounded-xl border border-line bg-abyss/85 p-3 pl-4 transition-[border-color,box-shadow] duration-200 hover:border-white/20 hover:shadow-[0_0_24px_-12px_var(--color-flow)] lg:items-center lg:gap-y-0',
        PROFIT_GRID,
      )}
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', tier ? TIER_STYLE[tier].bar : 'bg-white/10')} />
      <div className="col-span-2 flex items-center gap-3 lg:contents">
        <TierBadge tier={tier} label={tier ? t('tiers.tier', { tier }) : t('tiers.untiered')} />
        <div className="flex min-w-0 items-center gap-2.5">
          <ItemIcon icon={item?.icon ?? null} name={label} seed={v.item} size={32} decorative />
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm leading-snug font-semibold text-ink" title={label}>
              {label}
            </div>
            <RecipePath data={data} path={v.path} />
          </div>
        </div>
      </div>
      <Cell label={t('profit.col.marginMachine', { unit: t.rateSuffix })} active={metric === 'marginMachine'}>
        {v.marginPerMachine === null ? <span className="text-faint">—</span> : <Coins copper={t.fromPerMin(v.marginPerMachine)} />}
      </Cell>
      <Cell label={t('profit.col.marginItem')} active={metric === 'marginItem'}>
        <Coins copper={v.marginPerItem} />
      </Cell>
      <Cell label={t('profit.col.sale')}>
        <Coins copper={v.salePrice} />
      </Cell>
      <Cell label={t('profit.col.multiplier')} active={metric === 'multiplier'}>
        {v.valueMultiplier === null ? <span className="text-faint">—</span> : `×${formatNumber(t.lang, v.valueMultiplier, 2)}`}
      </Cell>
      <Cell label={t('profit.col.raw')}>
        {v.rawPerItem.length === 0 ? (
          <span className="text-faint">—</span>
        ) : (
          <span className="flex flex-wrap gap-x-2 gap-y-1">
            {v.rawPerItem.map((s) => (
              <span key={s.item} className="inline-flex items-center gap-1 text-xs" title={itemName(s.item)}>
                <ItemIcon icon={data.items[s.item]?.icon ?? null} name={itemName(s.item)} seed={s.item} size={16} />
                {formatNumber(t.lang, s.qty, 2)}
              </span>
            ))}
          </span>
        )}
      </Cell>
      <div className="col-span-2 flex justify-end lg:col-span-1">
        <Button size="sm" variant="primary" onClick={(e) => onUse(e.currentTarget)}>
          {t('tiers.use')}
        </Button>
      </div>
    </motion.li>
  );
});
