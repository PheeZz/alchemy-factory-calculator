import type { SolveNode } from '@/features/solver/types';
import { useT } from '@/shared/i18n';
import { formatNumber, formatPercent } from '@/shared/lib/format';
import { NumberFlip } from '@/shared/ui/NumberFlip';

export function MachineStats({ node }: { node: SolveNode }) {
  const t = useT();
  const util = formatPercent(node.utilization);
  return (
    <div className="rounded-xl border border-line bg-void/40 p-3">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-4xl leading-none text-ink">
          <NumberFlip value={`${formatNumber(t.lang, node.machines, 0)}×`} />
        </span>
        <span className="text-sm text-muted">{t('inspector.machines')}</span>
        <span className="num ml-auto text-sm text-muted">
          {t('inspector.exact')} <span className="text-ink">{formatNumber(t.lang, node.machinesExact, 2)}</span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-arcane to-flow transition-[width] duration-500"
            style={{ width: util }}
          />
        </div>
        <span className="num text-sm text-ink">
          {util} <span className="text-muted">{t('inspector.utilization')}</span>
        </span>
      </div>
    </div>
  );
}
