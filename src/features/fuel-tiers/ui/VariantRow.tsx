import { forwardRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { GameData } from '@/shared/data/types';
import type { FuelVariant } from '@/features/solver';
import { Coins } from '@/features/summary/Coins';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber, formatRate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import type { Tier, TierMetric } from '../lib/tiers';
import { FuelPath } from './FuelPath';
import { TierBadge } from './TierBadge';
import { TIER_STYLE } from './tierStyle';

/** Desktop columns; on phones the same cells stack into a card (labels become visible). */
export const ROW_GRID =
  'lg:grid-cols-[2.5rem_minmax(15rem,1.7fr)_7rem_minmax(9rem,1fr)_9.5rem_6.5rem_6.5rem_8.5rem]';

function Cell({ label, active, className, children }: { label: string; active?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cx('min-w-0', className)}>
      <div className="text-[11px] text-faint lg:sr-only">{label}</div>
      <div className={cx('num text-sm', active ? 'font-semibold text-ink' : 'text-ink/85')}>{children}</div>
    </div>
  );
}

export const VariantRow = forwardRef<
  HTMLLIElement,
  { data: GameData; variant: FuelVariant; tier: Tier | null; metric: TierMetric; onUse: (button: HTMLElement) => void; layoutId: string }
>(function VariantRow({ data, variant: v, tier, metric, onUse, layoutId }, ref) {
  const t = useT();
  const name = useNames();
  const fuel = data.items[v.fuel];
  const fuelName = fuel ? name(fuel.nameKey) : v.fuel;
  const markup = v.rawValuePer1k > 0 ? v.fuelValuePer1k / v.rawValuePer1k : null;
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);

  return (
    <motion.li
      ref={ref}
      layoutId={layoutId}
      layout="position"
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      className={cx(
        'relative grid grid-cols-2 gap-x-4 gap-y-3 overflow-hidden rounded-xl border border-line bg-abyss/85 p-3 pl-4 transition-[border-color,box-shadow] duration-200 hover:border-white/20 hover:shadow-[0_0_24px_-12px_var(--color-flow)] lg:items-center lg:gap-y-0',
        ROW_GRID,
      )}
    >
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', tier ? TIER_STYLE[tier].bar : 'bg-white/10')} />
      <div className="col-span-2 flex items-center gap-3 lg:contents">
        <TierBadge tier={tier} label={tier ? t('tiers.tier', { tier }) : t('tiers.untiered')} />
        <div className="flex min-w-0 items-center gap-2.5">
          <ItemIcon icon={fuel?.icon ?? null} name={fuelName} seed={v.fuel} size={32} decorative />
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm leading-snug font-semibold text-ink" title={fuelName}>
              {fuelName}
            </div>
            <FuelPath data={data} path={v.path} />
          </div>
        </div>
      </div>

      <Cell label={t('tiers.col.machines')} active={metric === 'machines'}>
        {formatNumber(t.lang, v.machinesPer1k, 1)} <span className="text-xs font-normal text-faint">{t('tiers.ceil', { n: formatNumber(t.lang, v.machinesCeilPer1k, 0) })}</span>
      </Cell>

      <Cell label={t('tiers.col.raw')}>
        {v.raw.length === 0 ? (
          <span className="text-faint">—</span>
        ) : (
          <span className="flex flex-wrap gap-x-2.5 gap-y-1">
            {v.raw.map((s) => (
              <span key={s.item} className="inline-flex items-center gap-1" title={itemName(s.item)}>
                <ItemIcon icon={data.items[s.item]?.icon ?? null} name={itemName(s.item)} seed={s.item} size={16} />
                {t('unit.perMin', { value: formatRate(t.lang, s.qty) })}
              </span>
            ))}
          </span>
        )}
      </Cell>

      <Cell label={t('tiers.col.price')} active={metric === 'price'}>
        <span className="flex flex-col gap-0.5 text-xs">
          <span className="flex items-center justify-between gap-2">
            <span className="text-faint">{t('tiers.rawCost')}</span>
            <Coins copper={v.rawValuePer1k} />
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="text-faint">{t('tiers.saleValue')}</span>
            <Coins copper={v.fuelValuePer1k} />
          </span>
        </span>
      </Cell>

      <Cell label={t('tiers.col.markup')}>
        {markup === null ? (
          <span className="text-faint">—</span>
        ) : (
          <span className={cx('inline-flex flex-col', markup > 1 && 'text-ember')}>
            ×{formatNumber(t.lang, markup, 2)}
            {markup > 1 && <span className="text-[11px] font-normal">{t('tiers.betterSell')}</span>}
          </span>
        )}
      </Cell>

      <Cell label={t('tiers.col.perRaw')} active={metric === 'perRaw'}>
        {v.heatPerRawItem === null ? <span className="text-faint">—</span> : formatNumber(t.lang, v.heatPerRawItem, 0)}
      </Cell>

      <div className="col-span-2 flex items-center justify-between gap-3 lg:col-span-1 lg:justify-end">
        <details className="group lg:hidden">
          <summary className="cursor-pointer text-xs text-flow">{t('tiers.build')}</summary>
          <BuildList data={data} stacks={v.buildCostPer1k} />
        </details>
        <Button size="sm" variant="primary" onClick={(e) => onUse(e.currentTarget)}>
          {t('tiers.use')}
        </Button>
      </div>

      <details className="col-span-full mt-2 hidden lg:block">
        <summary className="cursor-pointer text-xs text-faint hover:text-flow">{t('tiers.build')}</summary>
        <BuildList data={data} stacks={v.buildCostPer1k} />
      </details>
    </motion.li>
  );
});

function BuildList({ data, stacks }: { data: GameData; stacks: FuelVariant['buildCostPer1k'] }) {
  const t = useT();
  const name = useNames();
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {stacks.map((s) => {
        const label = name(data.items[s.item]?.nameKey ?? s.item);
        return (
          <li key={s.item} className="inline-flex items-center gap-1.5">
            <ItemIcon icon={data.items[s.item]?.icon ?? null} name={label} seed={s.item} size={16} decorative />
            {label} <span className="num text-ink/80">{formatNumber(t.lang, s.qty, 0)}</span>
          </li>
        );
      })}
    </ul>
  );
}
