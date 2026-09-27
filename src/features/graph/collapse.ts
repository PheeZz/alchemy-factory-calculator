import type { SolveEdge, SolveResult } from '@/features/solver/types';

export type CollapseSummary = { nodes: number; machines: number };

/**
 * Recipe nodes whose every downstream path ends at `root`: the branch that exists only to feed it.
 * Greatest fixpoint over root's recipe ancestors, so a loop that stays inside the branch is hidden
 * with it. Byproducts dumped to surplus do not count as escaping; imports are never hidden (they are
 * re-attached to the collapsed node instead, so its raw needs stay visible).
 */
export function branchOf(result: Pick<SolveResult, 'nodes' | 'edges'>, root: string): Set<string> {
  const recipe = new Set(result.nodes.map((n) => n.id));
  const ins = new Map<string, string[]>();
  const outs = new Map<string, string[]>();
  for (const e of result.edges) {
    if (e.from === e.to) continue;
    ins.set(e.to, [...(ins.get(e.to) ?? []), e.from]);
    outs.set(e.from, [...(outs.get(e.from) ?? []), e.to]);
  }

  const branch = new Set<string>();
  const queue = [root];
  while (queue.length) {
    for (const from of ins.get(queue.pop()!) ?? []) {
      if (from === root || branch.has(from) || !recipe.has(from)) continue;
      branch.add(from);
      queue.push(from);
    }
  }

  const stays = (to: string) => to === root || branch.has(to) || to.startsWith('surplus:');
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of branch)
      if (!(outs.get(id) ?? []).every(stays)) {
        branch.delete(id);
        changed = true;
      }
  }
  return branch;
}

/**
 * Folds each root's branch into the root. Edges crossing the branch boundary are re-attached to the
 * root and summed per (from, to, item); flows inside the branch disappear. Roots are applied in order,
 * so a root hidden by an earlier one keeps its fold and its summary rolls up into the outer root.
 */
export function collapseBranches(
  result: SolveResult,
  roots: Iterable<string>,
): { result: SolveResult; hidden: Map<string, CollapseSummary> } {
  const hidden = new Map<string, CollapseSummary>();
  let cur = result;
  for (const root of roots) {
    if (!cur.nodes.some((n) => n.id === root)) continue;
    const branch = branchOf(cur, root);
    if (!branch.size) continue;

    const summary = { nodes: 0, machines: 0 };
    for (const n of cur.nodes) {
      if (!branch.has(n.id)) continue;
      const inner = hidden.get(n.id);
      summary.nodes += 1 + (inner?.nodes ?? 0);
      summary.machines += n.machines + (inner?.machines ?? 0);
      hidden.delete(n.id);
    }
    hidden.set(root, summary);

    const merged = new Map<string, SolveEdge>();
    for (const e of cur.edges) {
      const from = branch.has(e.from) ? root : e.from;
      const to = branch.has(e.to) ? root : e.to;
      const rerouted = from !== e.from || to !== e.to;
      if (rerouted && from === root && to === root) continue;
      const key = `${from}>${to}>${e.item}`;
      const same = merged.get(key);
      if (!same) merged.set(key, { ...e, from, to });
      else {
        same.perMin += e.perMin;
        same.belts = Math.ceil(same.perMin / cur.beltSpeed - 1e-9);
      }
    }
    cur = { ...cur, nodes: cur.nodes.filter((n) => !branch.has(n.id)), edges: [...merged.values()] };
  }
  return { result: cur, hidden };
}

/** Nodes that currently have a branch to fold (drives whether the node offers the control). */
export function collapsibleNodes(result: Pick<SolveResult, 'nodes' | 'edges'>): Set<string> {
  return new Set(result.nodes.filter((n) => branchOf(result, n.id).size > 0).map((n) => n.id));
}
