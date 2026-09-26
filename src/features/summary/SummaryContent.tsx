import type { ReactNode } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { useT } from '@/shared/i18n';
import { formatNumber, formatRate } from '@/shared/lib/format';
import { NumberFlip } from '@/shared/ui/NumberFlip';
import { Coins } from './Coins';
import { itemRow, StackList, type SummaryRow } from './StackList';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-xs font-medium text-faint">{title}</h3>
      {children}
    </section>
  );
}

export function SummaryContent({ data, result }: { data: GameData; result: SolveResult }) {
  const t = useT();
  const { totals } = result;
  const perMin = (v: number) => t('unit.perMin', { value: formatRate(t.lang, v) });

  const inputs = [
    ...totals.raw.map((s) => itemRow(data, s.item, perMin(s.qty))),
    ...totals.imports.map((s) => itemRow(data, s.item, perMin(s.qty), t('summary.importTag'))),
  ];
  const byproductIds = new Set(totals.byproducts.map((s) => s.item));
  const outputs = [
    ...totals.surplus.map((s) =>
      itemRow(data, s.item, perMin(s.qty), byproductIds.has(s.item) ? t('summary.byproductTag') : undefined),
    ),
    // Byproducts fully consumed downstream have no surplus row but are still worth seeing.
    ...totals.byproducts
      .filter((b) => !totals.surplus.some((s) => s.item === b.item))
      .map((s) => itemRow(data, s.item, perMin(s.qty), t('summary.byproductTag'))),
  ];
  const machines: SummaryRow[] = totals.machines.map((m) => ({
    id: m.building,
    icon: data.buildings[m.building]?.icon ?? null,
    nameKey: data.buildings[m.building]?.nameKey ?? m.building,
    value: `${formatNumber(t.lang, m.count, 0)}×`,
  }));
  const buildCost = totals.buildCost.map((s) => itemRow(data, s.item, formatNumber(t.lang, s.qty, 0)));

  return (
    <div className="@container">
    <div className="grid gap-x-8 gap-y-5 @lg:grid-cols-2 @4xl:grid-cols-4">
      <Block title={t('summary.inputs')}>
        <StackList rows={inputs} />
      </Block>
      <Block title={t('summary.outputs')}>
        <StackList rows={outputs} />
      </Block>
      <Block title={t('summary.machines')}>
        <StackList rows={machines} />
      </Block>
      <Block title={t('summary.cost')}>
        <dl className="mb-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">{t('summary.buildCost')}</dt>
          <dd className="justify-self-end">
            <Coins copper={totals.buildCostMoney} />
          </dd>
          <dt className="text-muted">{t('summary.rawMoney')}</dt>
          <dd className="justify-self-end">
            <Coins copper={totals.rawMoneyPerMin} />
          </dd>
          <dt className="text-muted">{t('summary.heat')}</dt>
          <dd className="justify-self-end text-ember">
            <NumberFlip value={t('unit.heat', { value: formatNumber(t.lang, totals.heatPerSec, 1) })} />
          </dd>
        </dl>
        <StackList rows={buildCost} />
      </Block>
    </div>
    </div>
  );
}
