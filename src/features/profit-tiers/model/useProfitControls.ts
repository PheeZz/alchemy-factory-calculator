import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProfitMetric } from '../lib/profit';

interface ProfitControls {
  metric: ProfitMetric;
  /** Shop licence tier per GameData.saleBonuses id: player progress, so it survives reloads (the metric does not). */
  saleLevels: Record<string, number>;
  setMetric: (m: ProfitMetric) => void;
  setSaleLevel: (id: string, level: number) => void;
}

export const useProfitControls = create<ProfitControls>()(
  persist(
    (set) => ({
      metric: 'marginMachine',
      saleLevels: {},
      setMetric: (metric) => set({ metric }),
      setSaleLevel: (id, level) => set((s) => ({ saleLevels: { ...s.saleLevels, [id]: level } })),
    }),
    { name: 'afc:licences', version: 1, partialize: (s) => ({ saleLevels: s.saleLevels }) },
  ),
);
