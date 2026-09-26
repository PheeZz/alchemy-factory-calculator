export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PADDING = 0.06;
const MAX_ZOOM = 1.1;
const EDGE_GAP = 24;

export const fitFloor = (view: { width: number }) => (view.width < 640 ? 0.45 : 0.55);

export const fitZoom = (graph: Box, view: { width: number; height: number }) =>
  Math.min((view.width * (1 - 2 * PADDING)) / graph.width, (view.height * (1 - 2 * PADDING)) / graph.height, MAX_ZOOM);

export function boundsOf(nodes: { position: { x: number; y: number }; width?: number; height?: number }[]): Box {
  const x = Math.min(...nodes.map((n) => n.position.x));
  const y = Math.min(...nodes.map((n) => n.position.y));
  const r = Math.max(...nodes.map((n) => n.position.x + (n.width ?? 0)));
  const b = Math.max(...nodes.map((n) => n.position.y + (n.height ?? 0)));
  return { x, y, width: r - x, height: b - y };
}

/**
 * Opening view. Fit the whole graph when it still reads at the fit zoom (≥ 0.55 desktop, 0.45 phone).
 * Otherwise open at a legible zoom on the target side, centered on the targets: the result and its last
 * steps answer "how do I make X", and raw inputs are listed in the summary anyway.
 */
export function openingViewport(graph: Box, targets: Box | null, view: { width: number; height: number }) {
  const legible = view.width < 640 ? 0.6 : 0.75;
  const fit = fitZoom(graph, view);
  if (fit >= fitFloor(view)) {
    return {
      zoom: fit,
      x: (view.width - graph.width * fit) / 2 - graph.x * fit,
      y: (view.height - graph.height * fit) / 2 - graph.y * fit,
    };
  }
  const anchor = targets ?? graph;
  return {
    zoom: legible,
    x: view.width - EDGE_GAP - (graph.x + graph.width) * legible,
    y: view.height / 2 - (anchor.y + anchor.height / 2) * legible,
  };
}
