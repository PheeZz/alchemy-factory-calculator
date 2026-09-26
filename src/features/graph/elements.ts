import type { Edge, Node } from '@xyflow/react';
import type { GameData, ItemId } from '@/shared/data/types';
import type { SolveEdge, SolveNode, SolveResult } from '@/features/solver/types';

export type EndpointKind = 'import' | 'target' | 'surplus';
export type FlowKind = 'item' | 'liquid' | 'fuel' | 'fertilizer';

export type RecipeNodeData = { node: SolveNode; loops: SolveEdge[] };
export type ItemNodeData = { item: ItemId; perMin: number; raw: boolean };
export type FlowEdgeData = { edge: SolveEdge; kind: FlowKind; durationSec: number };

export type RecipeFlowNode = Node<RecipeNodeData, 'recipe'>;
export type ItemFlowNode = Node<ItemNodeData, EndpointKind>;
export type GraphNode = RecipeFlowNode | ItemFlowNode;
export type GraphEdge = Edge<FlowEdgeData, 'flow'>;

export const NODE_SIZE = {
  recipe: { width: 200, height: 108 },
  endpoint: { width: 184, height: 56 },
} as const;

export function parseEndpoint(id: string): { kind: EndpointKind; item: ItemId } | null {
  const m = /^(import|target|surplus):(.+)$/.exec(id);
  return m ? { kind: m[1] as EndpointKind, item: m[2]! } : null;
}

/** Log-scaled so a 1/min trickle and a 1000/min trunk both read as "moving", just at different paces. */
export function flowDurationSec(perMin: number) {
  return Math.min(6, Math.max(0.8, 6 - 1.6 * Math.log10(1 + perMin)));
}

function flowKind(data: GameData, edge: SolveEdge, consumer: SolveNode | undefined): FlowKind {
  if (consumer?.fuel?.item === edge.item) return 'fuel';
  if (consumer?.fertilizer?.item === edge.item) return 'fertilizer';
  return data.items[edge.item]?.liquid ? 'liquid' : 'item';
}

/**
 * SolveResult → React Flow elements without positions. Endpoint nodes are derived from edge ids;
 * self-loops (seed return, self-fuel) are folded into the node as chips because a looping bezier
 * onto the same node is unreadable.
 */
export function toElements(data: GameData, result: SolveResult): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const byId = new Map(result.nodes.map((n) => [n.id, n]));
  const loops = new Map<string, SolveEdge[]>();
  const endpoints = new Map<string, ItemFlowNode>();
  const edges: GraphEdge[] = [];

  result.edges.forEach((e, i) => {
    if (e.from === e.to) {
      loops.set(e.from, [...(loops.get(e.from) ?? []), e]);
      return;
    }
    for (const id of [e.from, e.to]) {
      const ep = parseEndpoint(id);
      if (!ep) continue;
      const existing = endpoints.get(id);
      if (existing) existing.data.perMin += e.perMin;
      else
        endpoints.set(id, {
          id,
          type: ep.kind,
          position: { x: 0, y: 0 },
          ...NODE_SIZE.endpoint,
          selectable: ep.kind === 'import',
          data: { item: ep.item, perMin: e.perMin, raw: !!data.items[ep.item]?.raw },
        });
    }
    edges.push({
      id: `e${i}`,
      type: 'flow',
      source: e.from,
      target: e.to,
      selectable: false,
      focusable: false,
      data: { edge: e, kind: flowKind(data, e, byId.get(e.to)), durationSec: flowDurationSec(e.perMin) },
    });
  });

  const recipeNodes: RecipeFlowNode[] = result.nodes.map((n) => ({
    id: n.id,
    type: 'recipe',
    position: { x: 0, y: 0 },
    ...NODE_SIZE.recipe,
    data: { node: n, loops: loops.get(n.id) ?? [] },
  }));

  return { nodes: [...recipeNodes, ...endpoints.values()], edges };
}
