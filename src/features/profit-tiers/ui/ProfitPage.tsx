import { LayoutGroup } from 'motion/react';
import type { GameData } from '@/shared/data/types';
import { sanitizeUnlocked } from '@/features/factory/stale';
import { useActiveFactory, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Segmented } from '@/shared/ui/Segmented';
import { TierBadge } from '@/shared/ui/TierBadge';
import { toast } from '@/shared/ui/Toast';
import { burstFrom } from '@/shared/ui/burst';
import { groupProfit, profitKey, type ProfitMetric } from '../lib/profit';
import { applyProfit } from '../model/applyProfit';
import { useProfitControls } from '../model/useProfitControls';
import { useProfitVariants } from '../model/useProfitVariants';
import { LicenceControls } from './LicenceControls';
import { PROFIT_GRID, ProfitRow } from './ProfitRow';

const METRICS: ProfitMetric[] = ['marginMachine', 'marginItem', 'multiplier'];

export function ProfitPage({ data }: { data: GameData }) {
  const t = useT();
  const name = useNames();
  const factory = useActiveFactory();
  const levels = useFactoryStore((s) => s.levels);
  const unlocked = useFactoryStore((s) => s.unlocked);
  const { metric, setMetric, saleLevels } = useProfitControls();
  const plan = factory.plan;
  const state = useProfitVariants(data, levels, {
    fuel: plan.fuel,
    fuelFor: plan.fuelFor,
    fertilizer: plan.fertilizer,
    heater: plan.heater ?? null,
    unlocked: sanitizeUnlocked(data, unlocked),
    saleLevels,
  });
  const groups = state.status === 'ready' ? groupProfit(state.data, metric) : [];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-10 lg:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl text-ink lg:text-3xl">{t('profit.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('profit.subtitle', { factory: factory.name })}</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
          <Segmented
            className="lg:w-[32rem]"
            label={t('tiers.metric')}
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({ value: m, label: t(`profit.metric.${m}`) }))}
          />
          <p className="text-xs text-muted lg:max-w-sm lg:pb-1.5">{t(`profit.hint.${metric}`)}</p>
        </div>
        <LicenceControls bonuses={data.saleBonuses ?? []} />

        {state.status === 'loading' && (
          <div role="status" className="flex flex-col gap-2">
            <span className="sr-only">{t('profit.loading')}</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden="true" className="relative h-[72px] overflow-hidden rounded-xl border border-line bg-abyss/70">
                <div className="shimmer" />
              </div>
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <p role="alert" className="text-sm text-[#ffc2c7]">
            {t('profit.error')}
          </p>
        )}
        {state.status === 'ready' && (
          <>
            <div aria-hidden="true" className={cx('hidden gap-x-4 border border-transparent pr-3 pl-4 text-[11px] text-faint lg:grid', PROFIT_GRID)}>
              <span />
              <span>{t('profit.col.item')}</span>
              <span>{t('profit.col.marginMachine', { unit: t.rateSuffix })}</span>
              <span>{t('profit.col.marginItem')}</span>
              <span>{t('profit.col.sale')}</span>
              <span>{t('profit.col.multiplier')}</span>
              <span>{t('profit.col.raw')}</span>
              <span />
            </div>
            <LayoutGroup>
              {groups.map((g) => (
                <section key={g.tier ?? 'none'} aria-label={g.tier ? t('tiers.tier', { tier: g.tier }) : t('tiers.untiered')}>
                  <h3 className="mb-2 flex items-center gap-3 font-display text-lg text-ink">
                    <TierBadge tier={g.tier} size="lg" label="" />
                    <span>{g.tier ? t('tiers.tier', { tier: g.tier }) : t('tiers.untiered')}</span>
                    <span className="num text-sm font-normal text-faint">{g.rows.length}</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {g.rows.map((r) => (
                      <ProfitRow
                        key={profitKey(r.item)}
                        layoutId={profitKey(r.item)}
                        data={data}
                        variant={r.item}
                        tier={r.tier}
                        metric={metric}
                        onUse={(button) => {
                          burstFrom(button);
                          applyProfit(r.item);
                          toast(t('card.added', { item: name(data.items[r.item.item]?.nameKey ?? r.item.item) }));
                        }}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </LayoutGroup>
          </>
        )}
      </div>
    </main>
  );
}
