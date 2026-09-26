// Normalized game data contract: produced by tools/normalize, consumed by solver and UI.
// Ids are the game's own DataTable RowNames so presets survive re-extraction.

export type ItemId = string;
export type RecipeId = string;
export type BuildingId = string;

export interface Stack {
  item: ItemId;
  qty: number;
}

export interface OutputStack extends Stack {
  /** Share of batches yielding it (main product: 1 − total fail rate); qty is already the expected amount. */
  chance: number;
}

export interface Item {
  id: ItemId;
  nameKey: string;
  icon: string | null;
  /** Copper coins; 1 silver = 1000, 1 gold = 100000. */
  value: number;
  /** Copper per item when purchasable, else null. */
  buyPrice: number | null;
  /** > 0 means the item is a fuel. */
  heatValue: number;
  /** > 0 means the item is a fertilizer. */
  nutrientValue: number;
  /** Fertilizer delivery rate, nutrients/s: nursery batch time = nutrientPerBatch / nutrientSpeed / speed. */
  nutrientSpeed: number;
  liquid: boolean;
  maxStack: number;
  tags: string[];
  /** Not produced by any non-special recipe. */
  raw: boolean;
}

export type RecipeSpecial = 'cauldron' | 'catalyst' | 'seedPlot' | 'steam' | 'portal';

export interface Recipe {
  id: RecipeId;
  nameKey: string;
  /** Buildings able to run it; the first one is the default. */
  buildings: BuildingId[];
  /** Per batch (FractionNum already applied). */
  inputs: Stack[];
  /** Per batch, expected values (fail/side products included). */
  outputs: OutputStack[];
  /** Seconds per batch at speedMult = 1. */
  timeSec: number;
  /** Heat per second override when the recipe, not the building, defines the draw. */
  heatPerSec: number | null;
  nutrientPerBatch: number | null;
  alternate: boolean;
  special: RecipeSpecial | null;
  /** Hidden or cut from the game (bHideInGame / never unlocked): never chosen automatically. */
  hidden: boolean;
  unlockedBy: string | null;
  /** Output multiplied by the Alchemy Skill track (Extractor/Alembic family). */
  yieldSkill: boolean;
  /** Advanced Athanor rows that accept catalysts (see GameData.catalysts). */
  catalyst?: RecipeCatalyst;
}

export interface RecipeCatalyst {
  /** Catalyst charge consumed per batch (DT CatalystCost × FractionNum). */
  cost: number;
  /** Per-batch outputs under an Unstable catalyst (DT UnstableSequence instead of ProductSequence). */
  unstableOutputs: OutputStack[];
  /** Per-batch outputs under a Resonant catalyst: the main and every fail product at full count. */
  resonantOutputs: OutputStack[];
}

export type CatalystEffect = 'unstable' | 'fertile' | 'resonant' | 'eternal';

export interface Catalyst {
  item: ItemId;
  /** Charges one catalyst item holds (game binary). */
  charges: number;
  effect: CatalystEffect;
}

/** A skill-tree node (DT_SkillPoints). Ids equal Recipe.unlockedBy values. */
export interface TechNode {
  id: string;
  /** Locale key of the unlocked entity; null for level nodes (use `stage`). */
  nameKey: string | null;
  icon: string | null;
  /** Item cost (none in 1.0: nodes cost money and research points). */
  cost: Stack[];
  /** Copper. */
  costMoney: number;
  researchPoints: number;
  /** Prerequisite node ids (deprecated nodes are skipped through). */
  requires: string[];
  unlocks: { recipes: RecipeId[]; buildings: BuildingId[]; items: ItemId[] };
  /** Game tier 0..9 (Level1..Level10). */
  stage: number;
}

export interface Cell {
  x: number;
  y: number;
  z: number;
}

export interface Port {
  cell: Cell;
  side: 'left' | 'right' | 'up' | 'bottom' | 'top' | 'base';
  dir: 'in' | 'out' | 'both';
  pipe: boolean;
}

export type BuildingCategory = 'production' | 'heating' | 'logistics' | 'farming' | 'other';

export interface Building {
  id: BuildingId;
  nameKey: string;
  icon: string | null;
  category: BuildingCategory;
  speedMult: number;
  /** Heat per second while running at speedMult = 1; 0 = not heated. */
  heatCost: number;
  /** For heaters: heat slots provided. */
  heatSlots: number | null;
  /** Heater slots this machine occupies. */
  heatSlotsRequired: number;
  buildCost: Stack[];
  /** Copper. */
  buildCostMoney: number;
  footprint: { cells: Cell[] };
  ports: Port[];
}

export type UpgradeTrackId =
  | 'conveyor'
  | 'factorySpeed'
  | 'alchemySkill'
  | 'fuelEfficiency'
  | 'fertilizerEfficiency';

export interface UpgradeTrack {
  id: UpgradeTrackId;
  nameKey: string;
  maxLevel: number;
  /** Effective value per level 0..maxLevel: belt items/min for conveyor, multiplier otherwise. */
  values: number[];
}

export interface GameData {
  build: { id: string; version: string };
  items: Record<ItemId, Item>;
  recipes: Record<RecipeId, Recipe>;
  buildings: Record<BuildingId, Building>;
  upgrades: UpgradeTrack[];
  constants: { baseBeltSpeed: number };
  tech?: TechNode[];
  catalysts?: Catalyst[];
}

/** nameKey → display string, one file per language. */
export type GameLocale = Record<string, string>;
