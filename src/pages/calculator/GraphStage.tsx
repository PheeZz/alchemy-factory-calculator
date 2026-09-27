import type { GameData } from '@/shared/data/types';
import type { FactoryPlan, SolveResult } from '@/features/solver/types';
import { ensureBoilerFuel } from '@/features/factory/fuelActions';
import { isSteamLike } from '@/features/factory/steam';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import type { SolveErrorInfo, SolveState } from '@/features/factory/useSolve';
import { useErrorMessage } from '@/features/factory/useErrorMessage';
import { GraphView } from '@/features/graph/GraphView';
import { RequiredTech } from '@/features/tech/ui/RequiredTech';
import { useItemOptions } from '@/features/target-picker/useItemOptions';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { SearchCombobox } from '@/shared/ui/SearchCombobox';
import { burstFrom } from '@/shared/ui/burst';

const DEFAULT_RATE = 60;
const SUPPLY_RATE = 60;

function ErrorCard({ data, error, mode }: { data: GameData; error: SolveErrorInfo; mode: FactoryPlan['mode'] }) {
  const t = useT();
  const steam = error.code === 'invalidInput' && isSteamLike(data.items[error.item ?? '']);
  const message = useErrorMessage(data, error);
  // An item the chain cannot make is fixed by bringing it in: unlimited import in targets mode,
  // a bounded supply in fromInput mode (where only supplies and imports feed the factory).
  const canFix = !!error.item && (error.code === 'unreachable' || error.code === 'infeasible');
  const s = useFactoryStore.getState();
  const plan = useActivePlan();
  // A manual recipe/machine pick is the usual culprit, so undoing all of them is always offered.
  const hasOverrides =
    [plan.recipeFor, plan.buildingFor, plan.heaterFor, plan.catalystFor, plan.machineCaps].some((m) => Object.keys(m ?? {}).length > 0);

  return (
    <div role="alert" className="glass pointer-events-auto max-h-full max-w-md overflow-y-auto rounded-panel border-danger/50 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg text-[#ffc2c7]">
        <Icon name="alert" className="text-danger" />
        {t('error.title')}
      </h2>
      <p className="mt-2 text-sm text-ink/90">{message}</p>
      {error.requiredTech && error.requiredTech.length > 0 && <RequiredTech data={data} ids={error.requiredTech} />}
      <div className="mt-4 flex flex-wrap gap-2">
        {canFix && (
          <Button
            variant="primary"
            onClick={() => (mode === 'fromInput' ? s.setSupply(error.item!, SUPPLY_RATE) : s.toggleImport(error.item!))}
          >
            {t(mode === 'fromInput' ? 'error.addSupply' : 'error.markImport')}
          </Button>
        )}
        {steam && (
          <Button variant="primary" onClick={() => ensureBoilerFuel(data)}>
            {t('error.pickBoilerFuel')}
          </Button>
        )}
        {hasOverrides && <Button onClick={s.clearOverrides}>{t('overrides.resetAll')}</Button>}
      </div>
    </div>
  );
}

/** First-run invitation: picking an item right here is the whole onboarding. */
function EmptyState({ data, mode, onOpenTargets }: { data: GameData; mode: FactoryPlan['mode']; onOpenTargets: () => void }) {
  const t = useT();
  const options = useItemOptions(data);
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <h2 className="font-display text-2xl text-ink">{t(mode === 'targets' ? 'graph.empty.title' : 'graph.emptyInput.title')}</h2>
        <p className="text-sm text-muted">{t(mode === 'targets' ? 'graph.empty.body' : 'graph.emptyInput.body')}</p>
        {mode === 'targets' ? (
          // The one always-running border on screen: this field is the whole first-run task.
          <div className="cta-glow is-live mt-2 w-full rounded-xl text-left">
            <SearchCombobox
              options={options}
              value={null}
              label={t('targets.add')}
              placeholder={t('combobox.placeholder')}
              onChange={(item) => {
                burstFrom(document.activeElement);
                useFactoryStore.getState().addTarget({ item, rate: DEFAULT_RATE });
              }}
            />
          </div>
        ) : (
          <Button className="mt-2 lg:hidden" onClick={onOpenTargets}>
            {t('nav.targets')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function GraphStage({
  data,
  result,
  status,
  error,
  mode,
  onOpenTargets,
  selectedId,
  onSelectNode,
}: {
  data: GameData;
  result: SolveResult | null;
  status: SolveState['status'];
  error?: SolveErrorInfo;
  mode: FactoryPlan['mode'];
  onOpenTargets: () => void;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t('graph.label')} className="relative min-h-0 flex-1 overflow-hidden lg:glass lg:rounded-panel">
      {result && <GraphView data={data} result={result} selectedId={selectedId} onSelectNode={onSelectNode} />}

      {!result && status === 'idle' && <EmptyState data={data} mode={mode} onOpenTargets={onOpenTargets} />}

      {status === 'solving' && <div className="shimmer" aria-hidden="true" />}
      {status === 'solving' && (
        <p role="status" className="glass absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted">
          <span className="size-2 animate-pulse rounded-full bg-flow" aria-hidden="true" />
          {t('graph.solving')}
        </p>
      )}

      {status === 'error' && error && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-void/55 p-4 backdrop-blur-[2px]">
          <ErrorCard data={data} error={error} mode={mode} />
        </div>
      )}
    </section>
  );
}
