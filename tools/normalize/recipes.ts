import type { OutputStack, Recipe, RecipeSpecial, Stack } from '../../src/shared/data/types';
import type { RawCount, RawItem, RawPlantSeed, RawRecipe } from './load';

/**
 * Items with a negative MaximumStack are fractional: recipes count them in 1/|MaximumStack| parts
 * (Logs = 200 parts: the Plank row consumes 1 part per 2 s cycle, i.e. 1 Log per 200 cycles).
 */
export const fractionsOf = (item: RawItem | undefined) => (item && item.MaximumStack < 0 ? -item.MaximumStack : 1);

// Output multiplied by the Alchemy Skill track (ExtractorSkill / AlembicSkill attributes).
const YIELD_SKILL_TYPES = new Set(['Extract', 'Distill', 'AdDistill']);
const SPECIAL_TYPES: Record<string, RecipeSpecial> = { Cauldron: 'cauldron', Plant: 'seedPlot' };

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
    unlockedBy: row.bHideInGame ? null : ctx.unlockedBy(id, buildings, row),
    yieldSkill: YIELD_SKILL_TYPES.has(craftType),
  };
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
    // ponytail: real nursery time = nutrients / fertilizer NutrientSpeed (not in the contract); GrowthSeconds is the Seed Plot cycle
    timeSec: seed.GrowthSeconds,
    heatPerSec: null,
    nutrientPerBatch: seed.GrowthNutrientValue * (seed.GrowthNum + seed.SideGrowthNum),
    alternate: false,
    special: null,
    unlockedBy,
    yieldSkill: false,
  };
}
