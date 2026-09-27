import type { ReactNode } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { CountUp } from '@/shared/ui/CountUp';
import { Coins } from '@/shared/ui/Coins';
import { ExportButtons } from '@/features/export/ui/ExportButtons';
import { BuildChecklist } from './BuildChecklist';
import { ByproductOptions } from './ByproductOptions';
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

  const inputs = [
    ...totals.raw.map((s) => itemRow(data, s.item, t.rate(s.qty))),
    ...totals.imports.map((s) => itemRow(data, s.item, t.rate(s.qty), t('summary.importTag'))),
  ];
  const byproductIds = new Set(totals.byproducts.map((s) => s.item));
  const outputs = [
    ...totals.surplus.map((s) =>
      itemRow(data, s.item, t.rate(s.qty), byproductIds.has(s.item) ? t('summary.byproductTag') : undefined),
    ),
    // Byproducts fully consumed downstream have no surplus row but are still worth seeing.
    ...totals.byproducts
      .filter((b) => !totals.surplus.some((s) => s.item === b.item))
      .map((s) => itemRow(data, s.item, t.rate(s.qty), t('summary.byproductTag'))),
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
          <dt className="text-muted">{t('summary.rawMoney', { unit: t.rateSuffix })}</dt>
          <dd className="justify-self-end">
            <Coins copper={t.fromPerMin(totals.rawMoneyPerMin)} />
          </dd>
          {totals.area && (
            <>
              <dt className="text-muted">{t('summary.area')}</dt>
              <dd className="num justify-self-end text-right">
                {t('summary.areaValue', { floor: formatNumber(t.lang, totals.area.floor, 0), cells: formatNumber(t.lang, totals.area.cells, 0) })}
              </dd>
            </>
          )}
          <dt className="text-muted">{t('summary.heat')}</dt>
          <dd className="justify-self-end text-ember">
            <CountUp value={totals.heatPerSec} format={(n) => t('unit.heat', { value: formatNumber(t.lang, n, 1) })} />
          </dd>
        </dl>
        <StackList rows={buildCost} />
      </Block>
    </div>
    <div className="mt-5 grid gap-x-8 gap-y-5 border-t border-line pt-4 @3xl:grid-cols-2">
      <Block title={t('build.title')}>
        <BuildChecklist data={data} result={result} />
        <div className="mt-3">
          <ExportButtons data={data} result={result} />
        </div>
      </Block>
      <Block title={t('byproduct.title')}>
        <ByproductOptions data={data} result={result} />
      </Block>
    </div>
    </div>
  );
}
