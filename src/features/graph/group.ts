import type { BuildingGroupNode, GraphNode } from './elements';

/**
 * Wraps recipe nodes that share a building into one parent node; ELK then lays each group out as a
 * compound block. A building used once gets no frame: a box around a single node is only noise.
 * Parents come first, as React Flow requires.
 */
export function groupByBuilding(nodes: GraphNode[]): GraphNode[] {
  const count = new Map<string, number>();
  for (const n of nodes) if (n.type === 'recipe') count.set(n.data.node.building, (count.get(n.data.node.building) ?? 0) + 1);

  const groups: BuildingGroupNode[] = [];
  for (const [building, n] of count)
    if (n > 1)
      groups.push({
        id: `group:${building}`,
        type: 'building',
        position: { x: 0, y: 0 },
        selectable: false,
        focusable: false,
        // Clicks and hover fall through to the pane: a frame must not select, focus or dim the chain.
        style: { pointerEvents: 'none' },
        // React Flow lifts edges of child nodes to the child's z (parent z + 1), which puts the lines
        // above the edge-label layer and strikes through every label; at -1 the children land on 0.
        zIndex: -1,
        data: { building, count: n },
      });

  const grouped = nodes.map((n) =>
    n.type === 'recipe' && count.get(n.data.node.building)! > 1 ? { ...n, parentId: `group:${n.data.node.building}` } : n,
  );
  return [...groups, ...grouped];
}
