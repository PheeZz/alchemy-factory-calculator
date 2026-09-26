import { create } from 'zustand';
import type { TierMetric } from '../lib/tiers';

/** 'factory' = every heated machine burns the active factory's fuel instead of the variant's own. */
export type HeatingMode = 'self' | 'factory';

export const useTierControls = create<{
  metric: TierMetric;
  heating: HeatingMode;
  /** Fuel to scroll to and flash once the list renders (set by the palette / item card). */
  highlight: string | null;
  setHighlight: (item: string | null) => void;
  setMetric: (m: TierMetric) => void;
  setHeating: (h: HeatingMode) => void;
}>((set) => ({
  metric: 'machines',
  heating: 'self',
  highlight: null,
  setHighlight: (highlight) => set({ highlight }),
  setMetric: (metric) => set({ metric }),
  setHeating: (heating) => set({ heating }),
}));
