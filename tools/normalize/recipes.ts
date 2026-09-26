import type { OutputStack, Recipe, RecipeCatalyst, RecipeSpecial, Stack } from '../../src/shared/data/types';
import type { RawCount, RawItem, RawPlantSeed, RawRecipe } from './load';

/**
 * Items with a negative MaximumStack are fractional: recipes count them in 1/|MaximumStack| parts
 * (Logs = 200 parts: the Plank row consumes 1 part per 2 s cycle, i.e. 1 Log per 200 cycles).
 */
export const fractionsOf = (item: RawItem | undefined) => (item && item.MaximumStack < 0 ? -item.MaximumStack : 1);

// Output multiplied by the Alchemy Skill track (ExtractorSkill / AlembicSkill attributes).
const YIELD_SKILL_TYPES = new Set(['Extract', 'Distill', 'AdDistill']);
const SPECIAL_TYPES: Record<string, RecipeSpecial> = { Cauldron: 'cauldron', Plant: 'seedPlot' };
// The game only charges catalysts in a facility of this craft type (CraftFacilityComponent checks
// FactoryCraftType == AdAthanor), so Athanor rows' CatalystCost never applies to them.
const CATALYST_TYPE = 'AdAthanor';

export interface RecipeContext {
  items: Record<string, RawItem>;
  buildingsFor: (craftType: string) => string[];
  unlockedBy: (recipeId: string, buildings: string[], row: RawRecipe) => string | null;
}

const craftTypeOf = (row: RawRecipe) => row.CraftType.split('::')[1] ?? row.CraftType;
const isNone = (c: RawCount) => c.IngredientName === 'None' || c.Count <= 0;

/**
 * One batch = FractionNum crafting cycles: every Count is scaled by FractionNum and converted
 * from fractional parts to whole items, time = CraftingTime × FractionNum.
 */
export function normalizeRecipe(id: string, row: RawRecipe, ctx: RecipeContext): Recipe {
  const n = row.FractionNum;
  const whole = (c: RawCount, rate = 1) => (c.Count * n * rate) / fractionsOf(ctx.items[c.IngredientName]);
  const failRate = row.FailRate1 + row.FailRate2;
  // Fail products replace the main product on that cycle (ProductSequence is a deterministic
  // cycle of these rates), so the main output is scaled by 1 − ΣFailRate.
  const mainChance = 1 - failRate;
  const outputs: OutputStack[] = [
    { item: row.ProductInfo.IngredientName, qty: whole(row.ProductInfo, mainChance), chance: mainChance },
  ];
  for (const [product, rate] of [[row.FailProduct1, row.FailRate1], [row.FailProduct2, row.FailRate2]] as const)
    if (rate > 0 && !isNone(product)) outputs.push({ item: product.IngredientName, qty: whole(product, rate), chance: rate });
  if (!isNone(row.SideProduct)) outputs.push({ item: row.SideProduct.IngredientName, qty: whole(row.SideProduct), chance: 1 });

  const craftType = craftTypeOf(row);
  const buildings = ctx.buildingsFor(craftType);
  const catalyst = craftType === CATALYST_TYPE && (row.CatalystCost ?? 0) > 0 ? catalystOf(row, whole) : undefined;
  const unlockedBy = row.bHideInGame ? null : ctx.unlockedBy(id, buildings, row);
  const hidden = row.bHideInGame || unlockedBy === null;
  return {
    id,
    nameKey: ctx.items[row.ProductInfo.IngredientName]?.DisplayName.Key ?? id,
    buildings,
    // zero counts appear only in hidden placeholder rows (GoldDust)
    inputs: row.IngredientList.filter((c) => !isNone(c)).map((c): Stack => ({ item: c.IngredientName, qty: whole(c) })),
    outputs,
    timeSec: row.CraftingTime * n,
    heatPerSec: null,
    nutrientPerBatch: null,
    alternate: row.bAlternate,
    special: SPECIAL_TYPES[craftType] ?? null,
    hidden,
    unlockedBy,
    yieldSkill: YIELD_SKILL_TYPES.has(craftType),
    ...(catalyst ? { catalyst } : {}),
  };
}

/**
 * Unstable: the product mix follows UnstableSequence (share of cycles per product index) instead
 * of ProductSequence. Resonant: every product at full count each cycle (community model, starfi5h).
 */
function catalystOf(row: RawRecipe, whole: (c: RawCount, rate?: number) => number): RecipeCatalyst {
  const products = [row.ProductInfo, row.FailProduct1, row.FailProduct2];
  const side = isNone(row.SideProduct) ? [] : [{ item: row.SideProduct.IngredientName, qty: whole(row.SideProduct), chance: 1 }];
  const seq = row.UnstableSequence ?? [];
  const unstableOutputs: OutputStack[] = products.flatMap((p, k) => {
    const share = seq.filter((i) => i === k).length / Math.max(seq.length, 1);
    return share > 0 && !isNone(p) ? [{ item: p.IngredientName, qty: whole(p, share), chance: share }] : [];
  });
  const resonantOutputs = products.filter((p) => !isNone(p)).map((p) => ({ item: p.IngredientName, qty: whole(p), chance: 1 }));
  return { cost: row.CatalystCost! * row.FractionNum, unstableOutputs: [...unstableOutputs, ...side], resonantOutputs: [...resonantOutputs, ...side] };
}

/**
 * Nursery crops come from DT_PlantSeedConfig, not DT_EnemyCrafting: the seed stays in the machine
 * (starfi5h treats it as a build cost) and every plant costs GrowthNutrientValue nutrients.
 */
export function nurseryRecipe(
  seedRow: string,
  seed: RawPlantSeed,
  buildings: string[],
  items: Record<string, RawItem>,
  unlockedBy: string | null,
): Recipe {
  const outputs: OutputStack[] = [{ item: seed.PlantName, qty: seed.GrowthNum, chance: 1 }];
  if (seed.SideProductName !== 'None' && seed.SideGrowthNum > 0)
    outputs.push({ item: seed.SideProductName, qty: seed.SideGrowthNum, chance: 1 });
  return {
    id: `Nursery_${seedRow}`,
    nameKey: items[seed.PlantName]?.DisplayName.Key ?? seedRow,
    buildings,
    inputs: [],
    outputs,
    // real time = nutrientPerBatch / fertilizer nutrientSpeed / speed (solver); GrowthSeconds is only the Seed Plot cycle
    timeSec: seed.GrowthSeconds,
    heatPerSec: null,
    nutrientPerBatch: seed.GrowthNutrientValue * (seed.GrowthNum + seed.SideGrowthNum),
    alternate: false,
    special: null,
    hidden: unlockedBy === null,
    unlockedBy,
    yieldSkill: false,
  };
}

/**
 * The Paradox Crucible (ParadoxFacilityComponent, C++) turns any single item into Oblivion
 * Essence (Mors); no DT row describes it, only the Vitae ↔ Mors special cases. Time per item =
 * PARADOX_VALUE / whole-item CauldronCost: reproduces starfi5h's in-game paradoxTime for all 28
 * items it lists (Limestone 3.333 s, Logs 9.375 s, Flax 750 s, Silver Coin 1.661 s).
 */
const PARADOX_VALUE = 1500;
const PARADOX_OUTPUT = 'Mors';
// ponytail: default Mors source = Limestone (starfi5h's first row; its value equals one Oblivion Essence); the rest are alternates
const PARADOX_DEFAULT_INPUT = 'Limestone';

export function paradoxRecipe(input: string, items: Record<string, RawItem>, buildings: string[], unlockedBy: string | null): Recipe {
  const raw = items[input]!;
  return {
    id: `Paradox_${input}`,
    nameKey: items[PARADOX_OUTPUT]?.DisplayName.Key ?? PARADOX_OUTPUT,
    buildings,
    inputs: [{ item: input, qty: 1 }],
    outputs: [{ item: PARADOX_OUTPUT, qty: 1, chance: 1 }],
    timeSec: PARADOX_VALUE / (raw.CauldronCost * fractionsOf(raw)),
    heatPerSec: null,
    nutrientPerBatch: null,
    alternate: input !== PARADOX_DEFAULT_INPUT,
    special: null,
    hidden: unlockedBy === null,
    unlockedBy,
    yieldSkill: false,
  };
}

/**
 * Steam Boiler power settings, from SteamBoilerComponent in the game binary (no DT data):
 * SetBoilingPower writes ProcessingSteamCount / BoilingTotalTime = 30/6 s (0, default),
 * 100/4 s (1), 300/2 s (2); GetBoilerHeatConsumeSpeed = count / time × 20. The boiler sits on a
 * heater, so its draw is the recipe's heatPerSec. See research/06-steam.md.
 */
const BOILER_HEAT_PER_STEAM = 20;
const BOILER_POWERS = [
  ['Low', 30, 6],
  ['Mid', 100, 4],
  ['High', 300, 2],
] as const;
// ponytail: High is the default (same heat per Steam at every setting, fewest boilers); the game's default is Low
const BOILER_DEFAULT = 'High';

export function steamBoilerRecipes(buildings: string[], steamNameKey: string, unlockedBy: string | null): Recipe[] {
  return BOILER_POWERS.map(([power, steam, seconds]) => ({
    id: `SteamBoiler_${power}`,
    nameKey: steamNameKey,
    buildings,
    inputs: [],
    outputs: [{ item: 'Steam', qty: steam, chance: 1 }],
    timeSec: seconds,
    heatPerSec: (steam / seconds) * BOILER_HEAT_PER_STEAM,
    nutrientPerBatch: null,
    alternate: power !== BOILER_DEFAULT,
    special: null,
    hidden: unlockedBy === null,
    unlockedBy,
    yieldSkill: false,
  }));
}
