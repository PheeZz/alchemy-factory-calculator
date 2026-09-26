import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncAcrossTabs } from './syncAcrossTabs';

export type RateUnit = 'sec' | 'min' | 'hour';
export const RATE_UNITS: RateUnit[] = ['sec', 'min', 'hour'];

const PER_MIN: Record<RateUnit, number> = { sec: 1 / 60, min: 1, hour: 60 };

/** Plans and solver results are always items/min; only display and input convert. */
export const fromPerMin = (perMin: number, unit: RateUnit) => perMin * PER_MIN[unit];
export const toPerMin = (value: number, unit: RateUnit) => value / PER_MIN[unit];

export const useUnitStore = create<{ rateUnit: RateUnit; setRateUnit: (u: RateUnit) => void }>()(
  persist(
    (set) => ({
      rateUnit: 'min',
      setRateUnit: (rateUnit) => set({ rateUnit }),
    }),
    { name: 'afc:units', version: 1, partialize: (s) => ({ rateUnit: s.rateUnit }) },
  ),
);

syncAcrossTabs('afc:units', () => useUnitStore.persist.rehydrate());
