import type { GameData } from '@/shared/data/types';
import type { PlanSummary } from '@/features/solver';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { useUpgradeAdvice } from './model/useUpgradeAdvice';

/** A saving reads green with a minus; a cost (more of something) stays muted. */
function Delta({ value, format }: { value: number; format: (abs: number) => string }) {
  if (Math.abs(value) < 1e-6) return <span className="text-faint">0</span>;
  return <span className={value < 0 ? 'text-verdant' : 'text-muted'}>{`${value < 0 ? '−' : '+'}${format(Math.abs(value))}`}</span>;
}

/** «Что качать дальше»: each track's next level, best first (the solver sorts by machines saved). */
export function UpgradeAdvice({ data }: { data: GameData }) {
  const t = useT();
  const { hasWork, state } = useUpgradeAdvice(data);
  if (!hasWork) return null;
  const n = (v: number, d = 1) => formatNumber(t.lang, v, d);
  const cols = (d: PlanSummary) => [
    { label: t('advice.machines'), el: <Delta value={d.machinesExact} format={(v) => n(v)} /> },
    { label: t('advice.raw'), el: <Delta value={d.rawPerMin} format={(v) => t.rate(v)} /> },
    { label: t('advice.fuel'), el: <Delta value={d.fuelPerMin} format={(v) => t.rate(v)} /> },
    { label: t('advice.belts'), el: <Delta value={d.belts} format={(v) => n(v, 0)} /> },
  ];
  return (
    <section className="mt-5 border-t border-line pt-4" aria-labelledby="advice-title">
      <h3 id="advice-title" className="mb-1 font-display text-lg text-ink">
        {t('advice.title')}
      </h3>
      <p className="mb-3 text-xs text-muted">{t('advice.subtitle')}</p>
      {state.status === 'loading' && (
        <div className="relative h-24 overflow-hidden rounded-xl border border-line bg-void/40" aria-hidden="true">
          <div className="shimmer" />
        </div>
      )}
      {state.status === 'error' && <p className="text-sm text-muted">{t('advice.unavailable')}</p>}
      {state.status === 'ready' &&
        (state.data.impacts.length === 0 ? (
          <p className="text-sm text-muted">{t('advice.maxed')}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {state.data.impacts.map((imp, i) => (
              <li
                key={imp.track}
                className={cx(
                  'rounded-xl border p-2.5',
                  i === 0 ? 'border-verdant/45 bg-verdant/[0.06] shadow-[0_0_18px_-10px_var(--color-verdant)]' : 'border-line bg-void/30',
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink">{t(`upgrades.track.${imp.track}`)}</span>
                  <span className="flex items-center gap-2">
                    {i === 0 && <GlowBadge tone="verdant">{t('advice.best')}</GlowBadge>}
                    <span className="num text-xs text-faint">
                      {imp.from} → {imp.to}
                    </span>
                  </span>
                </div>
                <dl className="num grid grid-cols-4 gap-1 text-[11px]">
                  {cols(imp.delta).map((c) => (
                    <div key={c.label} className="min-w-0">
                      <dt className="truncate text-faint">{c.label}</dt>
                      <dd className="text-xs">{c.el}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        ))}
    </section>
  );
}
