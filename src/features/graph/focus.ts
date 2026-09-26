import type { GraphEdge } from './elements';

/** Hovered node plus its direct inputs and outputs (and the edges between them); null when nothing is hovered. */
export function chainFocus(edges: GraphEdge[], hovered: string | null) {
  if (!hovered) return null;
  const nodes = new Set([hovered]);
  const lit = new Set<string>();
  for (const e of edges) {
    if (e.source === hovered || e.target === hovered) {
      lit.add(e.id);
      nodes.add(e.source);
      nodes.add(e.target);
    }
  }
  return { nodes, edges: lit };
}
