import { VisitBadge } from '@/features/visits/VisitBadge';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { GameData } from '@/shared/data/types';
import { FactoryList } from '@/features/factory/FactoryList';
import { FactorySettings } from '@/features/factory/FactorySettings';
import { useActiveFactory, useFactoryStore } from '@/features/factory/store';
import { useSolve } from '@/features/factory/useSolve';
import { useSolvePlan } from '@/features/factory/useSolvePlan';
import { NodeInspector } from '@/features/node-inspector/NodeInspector';
import { SummaryContent } from '@/features/summary/SummaryContent';
import { SummaryPanel } from '@/features/summary/SummaryPanel';
import { TargetPicker } from '@/features/target-picker/TargetPicker';
import { UpgradesPanel } from '@/features/upgrades/UpgradesPanel';
import { useT } from '@/shared/i18n';
import { Sheet } from '@/shared/ui/Sheet';
import { GraphStage } from './GraphStage';
import { MobileNav, type SheetId } from './MobileNav';


const MOBILE_QUERY = '(max-width: 1023.98px)';
const isMobile = () => matchMedia(MOBILE_QUERY).matches;

export function CalculatorPage({ data }: { data: GameData }) {
  const t = useT();
  const factory = useActiveFactory();
  const levels = useFactoryStore((s) => s.levels);
  const solvePlan = useSolvePlan(data);
  const { result, status, error } = useSolve(data, solvePlan, levels);
  // forItem survives the graph re-selecting the same node after a re-solve; a different node clears it.
  const [selection, setSelection] = useState<{ id: string | null; forItem?: string }>({ id: null });
  const selectedId = selection.id;
  const forItem = selection.forItem;
  const followRecipe = useCallback((id: string, item: string) => setSelection({ id, forItem: item }), []);
  const [sheet, setSheet] = useState<SheetId | null>(null);

  const onSelectNode = useCallback((id: string | null) => {
    setSelection((prev) => (prev.id === id ? prev : { id }));
    // On phones the inspector lives in a sheet, so a tap on a node should open it right away.
    if (id && isMobile()) setSheet('inspector');
  }, []);
  const closeInspector = () => setSelection({ id: null });

  // Sheets are modal dialogs: one left open while the window grows past the breakpoint (tablet
  // rotation) would keep the desktop layout inert behind an invisible backdrop.
  useEffect(() => {
    const mq = matchMedia(MOBILE_QUERY);
    const onChange = () => !mq.matches && setSheet(null);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const controls = (
    <>
      <TargetPicker data={data} />
      <FactorySettings data={data} />
    </>
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[clamp(340px,28vw,420px)_minmax(0,1fr)_auto] lg:gap-3 lg:p-3">
        <aside aria-label={t('aside.controls')} className="hidden min-h-0 flex-col gap-3 overflow-y-auto pr-1 lg:flex">
          <FactoryList data={data} />
          {controls}
          <UpgradesPanel data={data} />
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
            <p className="text-[11px] text-faint">{t('game.version', { version: data.build.version, build: data.build.id })}</p>
            <VisitBadge />
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <GraphStage
            data={data}
            result={result}
            status={status}
            error={error}
            mode={factory.plan.mode}
            onOpenTargets={() => setSheet('targets')}
            selectedId={selectedId}
            onSelectNode={onSelectNode}
          />
          {result && <SummaryPanel data={data} result={result} className="hidden lg:block" />}
        </main>

        <AnimatePresence initial={false}>
          {selectedId && (
            <motion.aside
              key="inspector"
              aria-label={t('inspector.title')}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="glass hidden min-h-0 w-[360px] overflow-y-auto rounded-panel p-4 lg:block"
            >
              <NodeInspector data={data} result={result} selectedId={selectedId} forItem={forItem} onClose={closeInspector} onSelect={followRecipe} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <MobileNav open={sheet} onOpen={setSheet} hasSelection={!!selectedId} />

      <Sheet open={sheet === 'targets'} onClose={() => setSheet(null)} title={t('nav.targets')}>
        <div className="flex flex-col gap-3">
          <FactoryList data={data} />
          {controls}
        </div>
      </Sheet>
      <Sheet open={sheet === 'upgrades'} onClose={() => setSheet(null)} title={t('nav.upgrades')}>
        <UpgradesPanel data={data} />
      </Sheet>
      <Sheet open={sheet === 'inspector'} onClose={() => setSheet(null)} title={t('nav.inspector')}>
        <NodeInspector data={data} result={result} selectedId={selectedId} forItem={forItem} onSelect={followRecipe} />
      </Sheet>
      <Sheet open={sheet === 'summary'} onClose={() => setSheet(null)} title={t('nav.summary')}>
        {result ? <SummaryContent data={data} result={result} /> : <p className="text-sm text-muted">{t('summary.none')}</p>}
      </Sheet>
    </>
  );
}
