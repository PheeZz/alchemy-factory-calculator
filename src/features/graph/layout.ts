import type { ELK, ElkExtendedEdge, ElkNode, ElkPoint, LayoutOptions } from 'elkjs/lib/elk-api';
import type { GraphEdge, GraphNode } from './elements';
import { boundsOf, fitFloor, fitZoom } from './viewport';

export interface EdgeRoute {
  points: ElkPoint[];
  /** Center of the space ELK reserved for the edge label. */
  label: ElkPoint | null;
}

let elk: Promise<ELK> | null = null;

// Lazy and off the main thread: elkjs is ~1.4 MB and a 60-node layout takes long enough to drop frames.
// jsdom/Node has no Worker, so tests fall back to the bundled in-thread build.
const getElk = () =>
  (elk ??=
    typeof Worker === 'undefined'
      ? import('elkjs/lib/elk.bundled.js').then(({ default: ELKBundled }) => new ELKBundled())
      : Promise.all([import('elkjs/lib/elk-api.js'), import('elkjs/lib/elk-worker.min.js?url')]).then(
          ([{ default: ELKApi }, { default: workerUrl }]) => new ELKApi({ workerUrl }),
        ));

// Chosen by comparing real chains (see Task 4 report): network-simplex layering pulls raw inputs next
// to their first consumer instead of pinning them to layer 0, which is what made long cross-graph edges.
const GRAPH_OPTIONS: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.separateConnectedComponents': 'false',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'elk.layered.spacing.edgeNodeBetweenLayers': '20',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'elk.spacing.nodeNode': '28',
  'elk.spacing.edgeNode': '18',
  'elk.spacing.edgeEdge': '10',
  'elk.spacing.edgeLabel': '4',
  'elk.padding': '[top=24,left=24,bottom=24,right=24]',
};

const LABEL_HEIGHT = 22;

/**
 * y of the horizontal route segment passing under x. ELK reserves the label's x-slot in the layer
 * but ignores `inline` and parks the box below the line; the pill design sits on the line itself.
 */
function yOnRoute(points: ElkPoint[], x: number): number | undefined {
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1]!, points[i]!];
    if (Math.abs(a.y - b.y) < 0.5 && x >= Math.min(a.x, b.x) - 0.5 && x <= Math.max(a.x, b.x) + 0.5) return a.y;
  }
  return undefined;
}

/** Layered left→right; ELK also routes edges and reserves room for their labels. */
export async function layoutGraph<N extends GraphNode>(
  nodes: N[],
  edges: GraphEdge[],
  labelWidth: (e: GraphEdge) => number,
  /** Snake the chain into rows of about this width/height ratio (only used for chains too long to fit). */
  wrapAspect?: number,
): Promise<{ nodes: N[]; routes: Map<string, EdgeRoute>; fallback: boolean }> {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: wrapAspect
      ? { ...GRAPH_OPTIONS, 'elk.layered.wrapping.strategy': 'MULTI_EDGE', 'elk.aspectRatio': String(wrapAspect) }
      : GRAPH_OPTIONS,
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
      // Targets close the chain on the right edge; sources are left free (see GRAPH_OPTIONS).
      layoutOptions: (n.type === 'target' ? { 'elk.layered.layering.layerConstraint': 'LAST' } : {}) as LayoutOptions,
    })),
    edges: edges.map(
      (e): ElkExtendedEdge => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        labels: [
          {
            id: `${e.id}-label`,
            // ELK's JSON importer drops labels without text: no space gets reserved and x/y stay 0.
            text: e.data!.edge.item,
            width: labelWidth(e),
            height: LABEL_HEIGHT,
            layoutOptions: { 'elk.edgeLabels.placement': 'CENTER' },
          },
        ],
      }),
    ),
  };

  let laid: ElkNode;
  try {
    laid = await (await getElk()).layout(graph);
  } catch {
    // A failed import or a crashed worker would otherwise stay cached and freeze every later layout.
    const dead = elk;
    elk = null;
    void dead?.then((e) => e.terminateWorker(), () => undefined);
    return { nodes: fallbackLayout(nodes, edges), routes: new Map(), fallback: true };
  }
  const pos = new Map(laid.children?.map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  const routes = new Map<string, EdgeRoute>();
  for (const e of (laid.edges ?? []) as ElkExtendedEdge[]) {
    const s = e.sections?.[0];
    if (!s) continue;
    const points = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
    const l = e.labels?.[0];
    const x = l?.x !== undefined ? l.x + (l.width ?? 0) / 2 : undefined;
    routes.set(e.id, { points, label: x === undefined ? null : { x, y: yOnRoute(points, x) ?? l!.y! + (l!.height ?? 0) / 2 } });
  }
  return { nodes: nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })), routes, fallback: false };
}

/**
 * Plain longest-path layers when ELK is unavailable: readable enough to keep working, edges then
 * fall back to beziers. Cycles are cut by capping relaxation at one pass per node.
 */
export function fallbackLayout<N extends GraphNode>(nodes: N[], edges: GraphEdge[]): N[] {
  const layer = new Map(nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const e of edges) {
      const next = (layer.get(e.source) ?? 0) + 1;
      if (next > (layer.get(e.target) ?? 0) && next < nodes.length) {
        layer.set(e.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const last = Math.max(0, ...layer.values());
  for (const n of nodes) if (n.type === 'target') layer.set(n.id, last + 1);

  const colWidth = Math.max(...nodes.map((n) => n.width ?? 0)) + 120;
  const rowHeight = Math.max(...nodes.map((n) => n.height ?? 0)) + 32;
  const rows = new Map<number, number>();
  return nodes.map((n) => {
    const l = layer.get(n.id)!;
    const row = rows.get(l) ?? 0;
    rows.set(l, row + 1);
    return { ...n, position: { x: 24 + l * colWidth, y: 24 + row * rowHeight } };
  });
}

/**
 * A chain too long to fit the view is re-laid out wrapped into rows; the wrapped layout is kept only
 * if it then fits, because wrap-back edges on big graphs read worse than panning (measured on Crown:
 * 58 nodes turned into crossing bundles, while Steel Ingot went from fit zoom 0.28 to 0.63).
 */
export async function layoutForView<N extends GraphNode>(
  nodes: N[],
  edges: GraphEdge[],
  labelWidth: (e: GraphEdge) => number,
  view: { width: number; height: number },
) {
  const flat = { ...(await layoutGraph(nodes, edges, labelWidth)), wrapped: false };
  if (flat.fallback || fitZoom(boundsOf(flat.nodes), view) >= fitFloor(view)) return flat;
  const wrapped = { ...(await layoutGraph(nodes, edges, labelWidth, view.width / view.height)), wrapped: true };
  return !wrapped.fallback && fitZoom(boundsOf(wrapped.nodes), view) >= fitFloor(view) ? wrapped : flat;
}
