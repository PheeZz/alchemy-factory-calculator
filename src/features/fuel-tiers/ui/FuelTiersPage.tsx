import { useEffect } from 'react';
import { LayoutGroup } from 'motion/react';
import type { GameData } from '@/shared/data/types';
import { sanitizeUnlocked } from '@/features/factory/stale';
import { useActiveFactory, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { toast } from '@/shared/ui/Toast';
import { burstFrom } from '@/shared/ui/burst';
import { groupByTier, variantKey } from '../lib/tiers';
import { applyVariant } from '../model/applyVariant';
import { useFuelVariants } from '../model/useFuelVariants';
import { useTierControls } from '../model/useTierControls';
import { TierBadge } from '@/shared/ui/TierBadge';
import { TierControls } from './TierControls';
import { ROW_GRID, VariantRow } from './VariantRow';

export function FuelTiersPage({ data }: { data: GameData }) {
  const t = useT();
  const name = useNames();
  const factory = useActiveFactory();
  const levels = useFactoryStore((s) => s.levels);
  const unlocked = useFactoryStore((s) => s.unlocked);
  const { metric, heating } = useTierControls();
  const factoryFuel = factory.plan.fuel;
  const state = useFuelVariants(data, levels, {
    fertilizer: factory.plan.fertilizer,
    heating: heating === 'factory' && factoryFuel ? factoryFuel : 'self',
    heater: factory.plan.heater ?? null,
    unlocked: sanitizeUnlocked(data, unlocked),
  });
  const groups = state.status === 'ready' ? groupByTier(state.data, metric) : [];

  // Arriving from the palette or an item card: bring that fuel's best row into view and flash it once.
  const highlight = useTierControls((s) => s.highlight);
  useEffect(() => {
    if (state.status !== 'ready' || !highlight) return;
    const row = document.querySelector<HTMLElement>(`main li[data-fuel="${CSS.escape(highlight)}"]`);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    row?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    // WAAPI, not a class: React re-renders the row right after (highlight is cleared) and would drop it.
    if (!reduce)
      row?.animate(
        [{ boxShadow: '0 0 0 1px #ffb547, 0 0 26px -4px #ffb547' }, { boxShadow: '0 0 0 1px #ffb547, 0 0 26px -4px #ffb547', offset: 0.3 }, { boxShadow: 'none' }],
        { duration: 1800, easing: 'ease-out' },
      );
    useTierControls.getState().setHighlight(null);
  }, [state.status, highlight]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-10 lg:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl text-ink lg:text-3xl">{t('tiers.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('tiers.subtitle', { factory: factory.name })}</p>
        </div>
        <TierControls data={data} factoryFuel={factoryFuel} />

        {state.status === 'loading' && (
          <div role="status" className="flex flex-col gap-2">
            <span className="sr-only">{t('tiers.loading')}</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden="true" className="relative h-[72px] overflow-hidden rounded-xl border border-line bg-abyss/70">
                <div className="shimmer" />
              </div>
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <p role="alert" className="text-sm text-[#ffc2c7]">
            {t('tiers.error')}
          </p>
        )}

        {state.status === 'ready' && (
          <>
            <div aria-hidden="true" className={cx('hidden gap-x-4 border border-transparent pr-3 pl-4 text-[11px] text-faint lg:grid', ROW_GRID)}>
              <span />
              <span>{t('tiers.col.fuel')}</span>
              <span>{t('tiers.col.machines')}</span>
              <span>{t('tiers.col.raw')}</span>
              <span>{t('tiers.col.price', { unit: t.rateSuffix })}</span>
              <span>{t('tiers.col.markup')}</span>
              <span>{t('tiers.col.perRaw')}</span>
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
                      <VariantRow
                        key={variantKey(r.variant)}
                        layoutId={variantKey(r.variant)}
                        data={data}
                        variant={r.variant}
                        tier={r.tier}
                        metric={metric}
                        onUse={(button) => {
                          burstFrom(button);
                          applyVariant(data, r.variant);
                          toast(t('tiers.used', { fuel: name(data.items[r.variant.fuel]?.nameKey ?? r.variant.fuel), factory: factory.name }));
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
