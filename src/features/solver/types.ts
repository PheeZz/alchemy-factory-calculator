import type { BuildingId, ItemId, RecipeId, Stack, UpgradeTrackId } from '@/shared/data/types';

export interface Rate {
  item: ItemId;
  /** Items per minute. */
  rate: number;
}

export type OptimizeGoal = 'raw' | 'machines' | 'money';

export interface FactoryPlan {
  targets: Rate[];
  mode: 'targets' | 'fromInput';
  /** fromInput: available inputs, items/min (upper bounds on import). */
  supplies: Rate[];
  /** fromInput: item to maximize. */
  maximize: ItemId | null;
  /** Manual recipe choice per item; absent → the item's default recipe. */
  recipeFor: Record<ItemId, RecipeId>;
  /** Manual building choice per recipe; absent → recipe.buildings[0]. */
  buildingFor: Record<RecipeId, BuildingId>;
  /** Items supplied from outside (their subtree is hidden). */
  imports: ItemId[];
  fuel: ItemId | null;
  fuelFor: Record<RecipeId, ItemId>;
  fertilizer: ItemId | null;
  fertilizerFor: Record<RecipeId, ItemId>;
  /** null = hybrid mode: manual choices, LP only balances flows. */
  optimize: OptimizeGoal | null;
  /** Heater building for heated machines; absent/null → defaultHeater(data). */
  heater?: BuildingId | null;
  heaterFor?: Record<RecipeId, BuildingId>;
  /** Learned tech nodes (prerequisites implied); absent/null → everything unlocked. */
  unlocked?: string[] | null;
  /** Catalyst item per catalyst-capable recipe (Recipe.catalyst). */
  catalystFor?: Record<RecipeId, ItemId>;
}

export type UpgradeLevels = Record<UpgradeTrackId, number>;

export interface PortWarning {
  item: ItemId;
  /** Required items/min through one port of one machine. */
  perMachine: number;
  beltSpeed: number;
}

export interface SolveNode {
  id: string;
  recipe: RecipeId;
  building: BuildingId;
  batchesPerMin: number;
  machinesExact: number;
  /** ceil(machinesExact). */
  machines: number;
  /** machinesExact / machines, 0..1. */
  utilization: number;
  fuel?: Rate;
  fertilizer?: Rate;
  /** Catalyst items consumed (also an input edge). */
  catalyst?: Rate;
  portWarnings: PortWarning[];
  /** Heated nodes only: machines are never split across heaters. */
  heater?: { building: BuildingId; countExact: number; count: number };
  /** The machine needs more slots than the heater has; no heaters counted. */
  heaterWarning?: { building: BuildingId; slotsRequired: number; heatSlots: number };
}

/** Edge endpoints: a node id, or `import:<item>`, `target:<item>`, `surplus:<item>`. */
export interface SolveEdge {
  from: string;
  to: string;
  item: ItemId;
  perMin: number;
  /** ceil(perMin / beltSpeed). */
  belts: number;
}

export interface SolveTotals {
  raw: Stack[];
  imports: Stack[];
  surplus: Stack[];
  byproducts: Stack[];
  buildCost: Stack[];
  buildCostMoney: number;
  rawMoneyPerMin: number;
  machines: { building: BuildingId; count: number }[];
  heatPerSec: number;
}

export interface SolveResult {
  nodes: SolveNode[];
  edges: SolveEdge[];
  totals: SolveTotals;
  beltSpeed: number;
}

export type SolverErrorCode = 'unreachable' | 'infeasible' | 'unbounded' | 'timeout' | 'invalidInput' | 'internal';

export class SolverError extends Error {
  constructor(
    readonly code: SolverErrorCode,
    readonly item?: ItemId,
    message?: string,
    /** unreachable under FactoryPlan.unlocked: the tech nodes to learn (prerequisites included). */
    readonly requiredTech?: string[],
  ) {
    super(message ?? `${code}${item ? `: ${item}` : ''}`);
    this.name = 'SolverError';
  }
}
