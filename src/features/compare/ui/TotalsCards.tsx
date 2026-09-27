import type { ReactNode } from 'react';
import type { Delta, PlanDiff } from '@/features/solver';
import { useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Coins } from '@/shared/ui/Coins';
import { DeltaValue } from './DeltaValue';

function Card({ title, value, show, exact }: { title: string; value: Delta; show: (n: number) => ReactNode; exact?: Delta }) {
  const t = useT();
  const side = (label: string, tone: string, n: number, exactN?: number) => (
    <>
      <dt className={`text-xs font-semibold ${tone}`}>{label}</dt>
      <dd className="num text-right text-ink">
        {show(n)}
        {exactN !== undefined && <span className="block text-[11px] font-normal text-faint">{t('compare.exact', { n: formatNumber(t.lang, exactN, 1) })}</span>}
      </dd>
    </>
  );
  return (
    <article className="glass flex min-w-0 flex-col gap-2 rounded-panel p-4">
      <h4 className="text-xs font-medium text-faint">{title}</h4>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
        {side('A', 'text-flow', value.a, exact?.a)}
        {side('B', 'text-arcane', value.b, exact?.b)}
        <dt className="text-xs font-semibold text-muted">Δ</dt>
        <dd className="text-right">
          <DeltaValue delta={value.delta}>{show(Math.abs(value.delta))}</DeltaValue>
        </dd>
      </dl>
    </article>
  );
}

/** Headline numbers of both plans; all are costs, so a drop is the good direction. */
export function TotalsCards({ diff }: { diff: PlanDiff }) {
  const t = useT();
  const int = (n: number) => formatNumber(t.lang, n, 0);
  return (
    <section aria-labelledby="cmp-totals">
      <h3 id="cmp-totals" className="mb-2 font-display text-lg text-ink">
        {t('compare.totals')}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card
          title={t('compare.machines')}
          value={diff.machines}
          show={int}
          // Exact counts show how much each plan loses to rounding up to whole machines.
          exact={diff.machinesExact}
        />
        <Card title={t('summary.rawMoney', { unit: t.rateSuffix })} value={diff.rawMoneyPerMin} show={(n) => <Coins copper={t.fromPerMin(n)} />} />
        <Card title={t('compare.heat')} value={diff.heatPerSec} show={(n) => formatNumber(t.lang, n, 1)} />
        <Card title={t('compare.belts')} value={diff.belts} show={int} />
        <Card title={t('compare.area')} value={diff.area.floor} show={int} />
      </div>
    </section>
  );
}
