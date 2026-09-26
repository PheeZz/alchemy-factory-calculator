import type { ELK, ElkNode, LayoutOptions } from 'elkjs/lib/elk-api';
import type { GraphEdge, GraphNode } from './elements';

let elk: Promise<ELK> | null = null;

// Lazy: elkjs is ~1.4 MB, kept out of the initial bundle.
// ponytail: runs on the main thread; move to elk-worker if layouts of 100+ nodes start to jank.
const getElk = () =>
  (elk ??= import('elkjs/lib/elk.bundled.js').then(({ default: ELK }) => new ELK()));

/** Layered left→right: raw/imports pinned to the first layer, targets to the last. */
export async function layoutGraph<N extends GraphNode>(nodes: N[], edges: GraphEdge[]): Promise<N[]> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '132',
      'elk.spacing.nodeNode': '28',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
      layoutOptions: (n.type === 'import'
          ? { 'elk.layered.layering.layerConstraint': 'FIRST' }
          : n.type === 'target'
            ? { 'elk.layered.layering.layerConstraint': 'LAST' }
            : {}) as LayoutOptions,
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const laid = await (await getElk()).layout(graph);
  const pos = new Map(laid.children?.map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  return nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position }));
}
