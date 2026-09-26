import { createContext, useContext } from 'react';
import type { GameData } from '@/shared/data/types';

// React Flow node/edge components only receive their own data; GameData reaches them via context.
export const GraphDataContext = createContext<GameData | null>(null);

export function useGraphData() {
  const data = useContext(GraphDataContext);
  if (!data) throw new Error('GraphDataContext is missing');
  return data;
}
