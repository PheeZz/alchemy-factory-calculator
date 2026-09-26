import { useEffect, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { labelWidth, toElements, type GraphEdge, type GraphNode } from './elements';
import { layoutForView } from './layout';
import { translate, useLangStore } from '@/shared/i18n';
import { toast } from '@/shared/ui/Toast';

/** Positioned elements for a result; stale layouts are dropped when a newer result arrives. */
export function useGraphLayout(data: GameData, result: SolveResult | null, getView: () => { width: number; height: number }) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

  useEffect(() => {
    if (!result) return setGraph(null);
    let alive = true;
    const { nodes, edges } = toElements(data, result);
    layoutForView(nodes, edges, labelWidth, getView()).then(({ nodes: laid, routes, fallback }) => {
      if (!alive) return;
      if (fallback) toast(translate(useLangStore.getState().lang, 'graph.layoutFallback'), 'error');
      setGraph({ nodes: laid, edges: edges.map((e) => ({ ...e, data: { ...e.data!, route: routes.get(e.id) } })) });
    });
    return () => {
      alive = false;
    };
    // getView is read at layout time only; a resize does not re-run a layout.
  }, [data, result]);

  return graph;
}
