import { create } from 'zustand';
import type { ItemId } from '@/shared/data/types';

/** Item card with its own history: clicking an item inside the card pushes, «Назад» pops. */
export const useItemCard = create<{
  stack: ItemId[];
  open: (item: ItemId) => void;
  push: (item: ItemId) => void;
  back: () => void;
  close: () => void;
}>((set) => ({
  stack: [],
  open: (item) => set({ stack: [item] }),
  push: (item) => set((s) => (s.stack.at(-1) === item ? s : { stack: [...s.stack, item] })),
  back: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  close: () => set({ stack: [] }),
}));
