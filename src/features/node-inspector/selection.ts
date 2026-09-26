import type { GameData } from '@/shared/data/types';
import type { SolveNode, SolveResult } from '@/features/solver/types';
import { parseEndpoint } from '@/features/graph/elements';

export type Selection =
  | { kind: 'recipe'; recipeId: string; node: SolveNode | undefined }
  | { kind: 'import'; id: string }
  | null;

/**
 * Recipe node ids are recipe ids, so a selection survives a result that no longer (or not yet)
 * contains the node: the inspector keeps the recipe choices available for undo.
 */
export function resolveSelection(data: GameData, result: SolveResult | null, id: string | null): Selection {
  if (!id) return null;
  const node = result?.nodes.find((n) => n.id === id);
  if (node) return { kind: 'recipe', recipeId: node.recipe, node };
  if (parseEndpoint(id)?.kind === 'import') return result ? { kind: 'import', id } : null;
  return Object.hasOwn(data.recipes, id) ? { kind: 'recipe', recipeId: id, node: undefined } : null;
}
