import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import { comparePlans, type Delta } from '@/features/solver';
import type { SolveResult } from '@/features/solver/types';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { useComparePair } from '../model/useComparePair';
import { duplicateForCompare } from '../model/useCompareStore';
import { DiffTable, type DiffRow } from './DiffTable';
import { PairPicker } from './PairPicker';
import { SettingsDiff } from './SettingsDiff';
import { TotalsCards } from './TotalsCards';

function Results({ data, a, b }: { data: GameData; a: SolveResult; b: SolveResult }) {
  const t = useT();
  const name = useNames();
  const diff = useMemo(() => comparePlans(a, b), [a, b]);
  const items = (rows: ({ item: string } & Delta)[]): DiffRow[] =>
    rows.map((r) => ({ ...r, id: r.item, name: name(data.items[r.item]?.nameKey ?? r.item), icon: data.items[r.item]?.icon ?? null }));
  const buildings: DiffRow[] = diff.machinesByBuilding.map((r) => ({
    ...r,
    id: r.building,
    name: name(data.buildings[r.building]?.nameKey ?? r.building),
    icon: data.buildings[r.building]?.icon ?? null,
  }));
  const int = (n: number) => formatNumber(t.lang, n, 0);
  return (
    <>
      <TotalsCards diff={diff} />
      <div className="grid gap-3 lg:grid-cols-2">
        <DiffTable caption={t('compare.byBuilding')} rows={buildings} format={int} />
        <DiffTable caption={t('compare.raw', { unit: t.rateSuffix })} rows={items(diff.raw)} format={t.rateValue} />
        <DiffTable caption={t('compare.fuel', { unit: t.rateSuffix })} rows={items(diff.fuel)} format={t.rateValue} />
        <DiffTable caption={t('compare.buildCost')} rows={items(diff.buildCost)} format={int} />
      </div>
    </>
  );
}

export function ComparePage({ data }: { data: GameData }) {
  const t = useT();
  const { a, b } = useComparePair(data);
  const loading = a.state.status === 'loading' || b.state.status === 'loading';

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-10 lg:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl text-ink lg:text-3xl">{t('compare.title')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">{t('compare.subtitle')}</p>
        </div>

        {!b.factory ? (
          <div className="glass flex flex-col items-start gap-3 rounded-panel p-4">
            <p className="text-sm text-ink/90">{t('compare.onlyOne')}</p>
            <Button variant="primary" icon="copy" onClick={duplicateForCompare}>
              {t('compare.duplicate')}
            </Button>
          </div>
        ) : (
          <>
            <PairPicker data={data} a={a} b={b} />
            {a.plan && b.plan && <SettingsDiff data={data} a={a.plan} b={b.plan} />}
            {a.state.status === 'ready' && b.state.status === 'ready' ? (
              <Results data={data} a={a.state.result} b={b.state.result} />
            ) : (
              loading && (
                <div className="relative h-40 overflow-hidden rounded-panel border border-line bg-abyss/70" aria-hidden="true">
                  <div className="shimmer" />
                </div>
              )
            )}
          </>
        )}
      </div>
    </main>
  );
}
