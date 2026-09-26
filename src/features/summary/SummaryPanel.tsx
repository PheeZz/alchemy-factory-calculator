import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon';
import { NumberFlip } from '@/shared/ui/NumberFlip';
import { Coins } from './Coins';
import { SummaryContent } from './SummaryContent';

/** Desktop bottom drawer on native <details>: the collapsed bar still shows the three headline totals. */
export function SummaryPanel({ data, result, className }: { data: GameData; result: SolveResult; className?: string }) {
  const t = useT();
  const machineCount = result.totals.machines.reduce((a, m) => a + m.count, 0);

  return (
    <details open className={cx('group glass rounded-panel', className)}>
      <summary className="flex cursor-pointer list-none items-center gap-5 rounded-panel px-4 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="font-display text-[1.15rem]">{t('summary.title')}</h2>
        <span className="num flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <NumberFlip value={t.plural('machines', machineCount, { n: formatNumber(t.lang, machineCount, 0) })} className="text-ink" />
          <span className="text-ember">{t('unit.heat', { value: formatNumber(t.lang, result.totals.heatPerSec, 1) })}</span>
          <Coins copper={result.totals.rawMoneyPerMin} />
        </span>
        <Icon name="chevron" className="ml-auto text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="max-h-[26vh] overflow-y-auto border-t border-line px-4 pt-3 pb-4">
        <SummaryContent data={data} result={result} />
      </div>
    </details>
  );
}
