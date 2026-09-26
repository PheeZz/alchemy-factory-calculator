import { useEffect, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { labelWidth, toElements, type GraphEdge, type GraphNode } from './elements';
import { layoutGraph } from './layout';

/** Positioned elements for a result; stale layouts are dropped when a newer result arrives. */
export function useGraphLayout(data: GameData, result: SolveResult | null) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  useEffect(() => {
    if (!result) return setGraph(null);
    let alive = true;
    const { nodes, edges } = toElements(data, result);
    layoutGraph(nodes, edges, labelWidth).then(({ nodes: laid, routes }) => {
      if (!alive) return;
      setGraph({ nodes: laid, edges: edges.map((e) => ({ ...e, data: { ...e.data!, route: routes.get(e.id) } })) });
    });
    return () => {
      alive = false;
    };
  }, [data, result]);

  return graph;
}
