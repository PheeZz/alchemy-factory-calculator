import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey';
import type { GameData, ItemId } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { flowKind, parseEndpoint, type EndpointKind, type FlowKind } from '../elements';

export type FlowNode = { id: string; kind: 'recipe' | EndpointKind };
export type FlowLink = { source: string; target: string; value: number; item: ItemId; kind: FlowKind };
export type Flows = { nodes: FlowNode[]; links: FlowLink[] };

/**
 * Links that close a cycle, found by DFS from `order` (sources first, so the recycled flow is the one
 * cut). Sankey layouts need a DAG; d3-sankey throws on a circular link.
 */
function backLinks(order: string[], links: FlowLink[]): Set<number> {
  const outs = new Map<string, number[]>();
  links.forEach((l, i) => outs.set(l.source, [...(outs.get(l.source) ?? []), i]));
  const state = new Map<string, 'open' | 'done'>();
  const back = new Set<number>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const i of outs.get(id) ?? []) {
      const next = links[i]!.target;
      if (state.get(next) === 'open') back.add(i);
      else if (!state.has(next)) visit(next);
    }
    state.set(id, 'done');
  };
  for (const id of order) if (!state.has(id)) visit(id);
  return back;
}

/**
 * SolveResult → sankey input: recipes and endpoints as nodes, every positive flow as a link
 * (fuel and fertilizer included, unlike the graph, where they are chips).
 * ponytail: loop flows (self-loops, cycle back-links) are left out; draw them as arcs if players miss them.
 */
export function toFlows(data: GameData, result: SolveResult): Flows {
  const byId = new Map(result.nodes.map((n) => [n.id, n]));
  const nodes = new Map<string, FlowNode>(result.nodes.map((n) => [n.id, { id: n.id, kind: 'recipe' }]));
  const links: FlowLink[] = [];
  for (const e of result.edges) {
    if (e.from === e.to || !(e.perMin > 0)) continue;
    for (const id of [e.from, e.to]) {
      const ep = parseEndpoint(id);
      if (ep && !nodes.has(id)) nodes.set(id, { id, kind: ep.kind });
    }
    links.push({ source: e.from, target: e.to, value: e.perMin, item: e.item, kind: flowKind(data, e, byId.get(e.to)) });
  }
  const list = [...nodes.values()];
  const order = [...list.filter((n) => n.kind === 'import'), ...list.filter((n) => n.kind !== 'import')].map((n) => n.id);
  const back = backLinks(order, links);
  return { nodes: list, links: links.filter((_, i) => !back.has(i)) };
}

/** Indices of every link upstream and downstream of `index`: the path a hovered flow belongs to. */
export function linkPath(links: Pick<FlowLink, 'source' | 'target'>[], index: number): Set<number> {
  const lit = new Set([index]);
  const walk = (start: string, forward: boolean) => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.pop()!;
      links.forEach((l, i) => {
        const [from, to] = forward ? [l.source, l.target] : [l.target, l.source];
        if (from !== id) return;
        lit.add(i);
        if (!seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      });
    }
  };
  walk(links[index]!.target, true);
  walk(links[index]!.source, false);
  return lit;
}

export type LaidNode = SankeyNode<FlowNode, FlowLink>;
export type LaidLink = SankeyLink<FlowNode, FlowLink>;

const NODE_WIDTH = 12;
const MARGIN = 16;
/** Horizontal room per column for the node labels that sit between columns. */
const COLUMN_WIDTH = 190;
/** Vertical room per node so labels of thin neighbours do not collide. */
const ROW_HEIGHT = 26;

const run = (flows: Flows, width: number, height: number) =>
  sankey<FlowNode, FlowLink>()
    .nodeId((n) => n.id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(14)
    .extent([
      [MARGIN, MARGIN],
      [width - MARGIN, height - MARGIN],
    ])({
    // d3-sankey mutates its input (ids become node objects); callers keep the id-based flows.
    nodes: flows.nodes.map((n) => ({ ...n })),
    links: flows.links.map((l) => ({ ...l })),
  });

/**
 * Lays the flows out in at least the given box, growing it (the view scrolls) when columns or
 * stacked nodes would not leave room for labels. Link order matches `flows.links`.
 */
export function layoutFlows(flows: Flows, width: number, height: number) {
  const first = run(flows, width, height);
  const columns = new Map<number, number>();
  for (const n of first.nodes) columns.set(n.x0!, (columns.get(n.x0!) ?? 0) + 1);
  const w = Math.max(width, columns.size * COLUMN_WIDTH);
  const h = Math.max(height, Math.max(0, ...columns.values()) * ROW_HEIGHT + 2 * MARGIN);
  const laid = w === width && h === height ? first : run(flows, w, h);
  return { nodes: laid.nodes, links: laid.links, width: w, height: h, path: sankeyLinkHorizontal<FlowNode, FlowLink>() };
}
