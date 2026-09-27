import { useEffect, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { collapseBranches, collapsibleNodes } from './collapse';
import { labelWidth, toElements, type GraphEdge, type GraphNode } from './elements';
import { groupByBuilding } from './group';
import { layoutForView } from './layout';
import { translate, useLangStore } from '@/shared/i18n';
import { toast } from '@/shared/ui/Toast';

export interface GraphOptions {
  /** Nodes whose feeding branch is folded into them. */
  collapsed: ReadonlySet<string>;
  /** Frame recipes that share a building. */
  grouped: boolean;
}

type Laid = { nodes: GraphNode[]; edges: GraphEdge[]; for: GraphOptions & { result: SolveResult } };

/** Positioned elements for a result; stale layouts are dropped when a newer request arrives. */
export function useGraphLayout(
  data: GameData,
  result: SolveResult | null,
  getView: () => { width: number; height: number },
  { collapsed, grouped }: GraphOptions,
) {
  const [graph, setGraph] = useState<Laid | null>(null);

  useEffect(() => {
    if (!result) return setGraph(null);
    let alive = true;
    const folded = collapseBranches(result, collapsed);
    const collapsible = collapsibleNodes(folded.result);
    const elements = toElements(data, folded.result);
    const nodes = elements.nodes.map((n) =>
      n.type === 'recipe' ? { ...n, data: { ...n.data, branch: { hidden: folded.hidden.get(n.id), collapsible: collapsible.has(n.id) } } } : n,
    );
    const { edges } = elements;
    layoutForView(grouped ? groupByBuilding(nodes) : nodes, edges, labelWidth, getView()).then(({ nodes: laid, routes, fallback }) => {
      if (!alive) return;
      if (fallback) toast(translate(useLangStore.getState().lang, 'graph.layoutFallback'), 'error');
      setGraph({
        nodes: laid,
        edges: edges.map((e) => ({ ...e, data: { ...e.data!, route: routes.get(e.id) } })),
        for: { result, collapsed, grouped },
      });
    });
    return () => {
      alive = false;
    };
    // getView is read at layout time only; a resize does not re-run a layout.
  }, [data, result, collapsed, grouped]);

  // The previous layout stays on screen until the new one lands; `pending` tells the view to show progress.
  const current = graph?.for.result === result && graph.for.collapsed === collapsed && graph.for.grouped === grouped;
  return { graph, pending: !!result && !current };
}
