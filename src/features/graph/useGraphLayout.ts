import { useEffect, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { toElements, type GraphEdge, type GraphNode } from './elements';
import { layoutGraph } from './layout';

/** Positioned elements for a result; stale layouts are dropped when a newer result arrives. */
export function useGraphLayout(data: GameData, result: SolveResult | null) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  useEffect(() => {
    if (!result) return setGraph(null);
    let alive = true;
    const { nodes, edges } = toElements(data, result);
    layoutGraph(nodes, edges).then((laid) => alive && setGraph({ nodes: laid, edges }));
    return () => {
      alive = false;
    };
  }, [data, result]);

  return graph;
}
