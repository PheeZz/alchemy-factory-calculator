import { create } from 'zustand';
import { useFactoryStore } from '@/features/factory/store';
import { useViewStore } from '@/shared/lib/view';

interface Pick {
  /** null → default (see resolvePair). */
  a: string | null;
  b: string | null;
}

// ponytail: session-only; the pair falls back to active + newest after a reload. Add ?a=&b= if links to a comparison are wanted.
export const useCompareStore = create<Pick & { pick: (p: Partial<Pick>) => void }>((set) => ({
  a: null,
  b: null,
  pick: (p) => set(p),
}));

/** Opens the comparison of the active factory (A) against `b`. */
export function openCompare(b: string) {
  useCompareStore.getState().pick({ a: useFactoryStore.getState().activeId, b });
  useViewStore.getState().setView('compare');
}

/** Duplicates the active factory and compares the original (A) with the copy (B), which becomes active for editing. */
export function duplicateForCompare() {
  const { activeId, duplicateFactory } = useFactoryStore.getState();
  const copy = duplicateFactory(activeId);
  if (copy) useCompareStore.getState().pick({ a: activeId, b: copy });
}
