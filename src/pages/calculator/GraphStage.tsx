import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { useFactoryStore } from '@/features/factory/store';
import { GraphView } from '@/features/graph/GraphView';
import { useNames, useT, type DictKey } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import type { CalculatorStatus, SolveErrorInfo } from './CalculatorPage';

function ErrorCard({ data, error }: { data: GameData; error: SolveErrorInfo }) {
  const t = useT();
  const name = useNames();
  const item = error.item ? name(data.items[error.item]?.nameKey ?? error.item) : '';
  const known = ['unreachable', 'infeasible', 'unbounded', 'timeout'].includes(error.code);
  const message = known ? t(`error.${error.code}` as DictKey, { item }) : t('error.unknown', { code: error.code });

  return (
    <div role="alert" className="glass pointer-events-auto max-w-md rounded-panel border-danger/50 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg text-[#ffc2c7]">
        <Icon name="alert" className="text-danger" />
        {t('error.title')}
      </h2>
      <p className="mt-2 text-sm text-ink/90">{message}</p>
      {error.item && (
        <Button variant="primary" className="mt-4" onClick={() => useFactoryStore.getState().toggleImport(error.item!)}>
          {t('error.markImport')}
        </Button>
      )}
    </div>
  );
}

export function GraphStage({
  data,
  result,
  status,
  error,
  selectedId,
  onSelectNode,
}: {
  data: GameData;
  result: SolveResult | null;
  status: CalculatorStatus;
  error?: SolveErrorInfo;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t('graph.label')} className="relative min-h-0 flex-1 overflow-hidden lg:glass lg:rounded-panel">
      {result && <GraphView data={data} result={result} selectedId={selectedId} onSelectNode={onSelectNode} />}

      {!result && status !== 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-xs">
            <h2 className="font-display text-2xl text-ink">{t('graph.empty.title')}</h2>
            <p className="mt-2 text-sm text-muted">{t('graph.empty.body')}</p>
          </div>
        </div>
      )}

      {status === 'solving' && (
        <p role="status" className="glass absolute top-3 left-3 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted">
          <span className="size-2 animate-pulse rounded-full bg-flow" aria-hidden="true" />
          {t('graph.solving')}
        </p>
      )}

      {status === 'error' && error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-void/55 p-4 backdrop-blur-[2px]">
          <ErrorCard data={data} error={error} />
        </div>
      )}
    </section>
  );
}
