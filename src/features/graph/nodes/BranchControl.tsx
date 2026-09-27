import { useContext, type KeyboardEvent, type MouseEvent } from 'react';
import { useT } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';
import { GraphActionsContext } from '../context';
import type { Branch } from '../elements';

// The node wrapper selects on click and on Enter/Space; the control must not also open the inspector.
const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

/** Fold/unfold the branch that feeds only this node: a corner button, or the «+N hidden» badge once folded. */
export function BranchControl({ id, branch }: { id: string; branch?: Branch }) {
  const t = useT();
  const actions = useContext(GraphActionsContext);
  if (!actions || !branch || (!branch.hidden && !branch.collapsible)) return null;
  const toggle = (e: MouseEvent) => {
    stop(e);
    actions.toggleBranch(id);
  };

  if (branch.hidden) {
    const machines = t.plural('machines', branch.hidden.machines);
    const label = t('graph.expand', { n: branch.hidden.nodes, machines });
    return (
      <button
        type="button"
        onClick={toggle}
        onKeyDown={stop}
        aria-label={label}
        title={label}
        className="nodrag nopan num absolute -top-3 left-3 z-10 flex items-center gap-1 rounded-full border border-arcane/55 bg-abyss px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-[#d7b8ff] transition-colors hover:border-arcane hover:bg-[#1d1740]"
      >
        <Icon name="plus" size={11} />
        {t('graph.hidden', { n: branch.hidden.nodes })}
        <span className="text-muted">· {machines}</span>
      </button>
    );
  }

  const label = t('graph.collapse');
  return (
    <button
      type="button"
      onClick={toggle}
      onKeyDown={stop}
      aria-label={label}
      title={label}
      data-export-skip
      className="nodrag nopan absolute -top-3 -left-3 z-10 grid size-6 place-items-center rounded-full border border-line bg-abyss text-muted transition-colors hover:border-arcane/60 hover:text-ink"
    >
      <Icon name="minus" size={12} />
    </button>
  );
}
