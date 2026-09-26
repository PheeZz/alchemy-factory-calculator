import { create } from 'zustand';
import type { TierMetric } from '../lib/tiers';

/** 'factory' = every heated machine burns the active factory's fuel instead of the variant's own. */
export type HeatingMode = 'self' | 'factory';

export const useTierControls = create<{
  metric: TierMetric;
  heating: HeatingMode;
  setMetric: (m: TierMetric) => void;
  setHeating: (h: HeatingMode) => void;
}>((set) => ({
  metric: 'machines',
  heating: 'self',
  setMetric: (metric) => set({ metric }),
  setHeating: (heating) => set({ heating }),
}));
