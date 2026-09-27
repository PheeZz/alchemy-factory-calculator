import { create } from 'zustand';
import { useFactoryStore, type FactoryState } from './store';

/** What undo restores: plans (all factories), upgrade levels and learned tech. Not the active tab or UI state. */
type Snapshot = Pick<FactoryState, 'factories' | 'levels' | 'unlocked'>;

const LIMIT = 100;
// Changes closer together than this are one step: typing "120" must undo in one press, not three.
const COALESCE_MS = 600;

export const useHistory = create<{ past: Snapshot[]; future: Snapshot[] }>(() => ({ past: [], future: [] }));

let applying = false;
let lastChange = 0;

const snapshot = (s: FactoryState): Snapshot => ({ factories: s.factories, levels: s.levels, unlocked: s.unlocked });
const changed = (a: Snapshot, b: Snapshot) => a.factories !== b.factories || a.levels !== b.levels || a.unlocked !== b.unlocked;

useFactoryStore.subscribe((state, prev) => {
  // Our own restores, and rehydrates from another tab, are not user edits in this tab.
  if (applying || !useFactoryStore.persist.hasHydrated() || !changed(snapshot(state), snapshot(prev))) return;
  const now = Date.now();
  if (now - lastChange > COALESCE_MS) {
    useHistory.setState((h) => ({ past: [...h.past, snapshot(prev)].slice(-LIMIT), future: [] }));
  } else {
    useHistory.setState({ future: [] });
  }
  lastChange = now;
});

function restore(to: Snapshot) {
  applying = true;
  useFactoryStore.setState((s) => ({
    ...to,
    activeId: to.factories.some((f) => f.id === s.activeId) ? s.activeId : to.factories[0]!.id,
  }));
  applying = false;
  lastChange = 0;
}

export function undo() {
  const { past, future } = useHistory.getState();
  const prev = past.at(-1);
  // The app always needs a factory; a snapshot from before the first one was created is skipped.
  if (!prev || prev.factories.length === 0) return;
  const current = snapshot(useFactoryStore.getState());
  restore(prev);
  useHistory.setState({ past: past.slice(0, -1), future: [current, ...future] });
}

export function redo() {
  const { past, future } = useHistory.getState();
  const next = future[0];
  if (!next) return;
  const current = snapshot(useFactoryStore.getState());
  restore(next);
  useHistory.setState({ past: [...past, current], future: future.slice(1) });
}

export const canUndo = () => (useHistory.getState().past.at(-1)?.factories.length ?? 0) > 0;
export const canRedo = () => useHistory.getState().future.length > 0;
/** Called after bootstrap: creating the first factory is not something to undo. */
export const resetHistory = () => {
  useHistory.setState({ past: [], future: [] });
  lastChange = 0;
};
