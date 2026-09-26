// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RawCount, RawItem, RawRecipe } from './load';
import { normalizeRecipe, nurseryRecipe, paradoxRecipe, type RecipeContext } from './recipes';

const none: RawCount = { IngredientName: 'None', Count: 0 };
const item = (MaximumStack: number, CauldronCost = 1): RawItem => ({
  ID: 1,
  DisplayName: { Key: 'k' },
  DisplayIcon: null,
  IngredientTags: [],
  bHideInGame: false,
  MaximumStack,
  StockCost: { X: 0, Y: 0, Z: 0 },
  CostValue: { X: 0, Y: 0, Z: 0 },
  HeatValue: 0,
  NutrientValue: 0,
  NutrientSpeed: 0,
  CauldronCost,
  IsLiquid: false,
  AllowPortalSupply: false,
});
const row = (r: Partial<RawRecipe>): RawRecipe => ({
  IngredientList: [],
  ProductInfo: none,
  CraftType: 'EBeltTDCraftType::Process',
  CraftingTime: 1,
  FractionNum: 1,
  FailRate1: 0,
  FailRate2: 0,
  FailProduct1: none,
  FailProduct2: none,
  SideProduct: none,
  bHideInGame: false,
  bAlternate: false,
  ...r,
});

// MaximumStack as in DT_Enemies (negative = fractional item with that many parts)
const items: Record<string, RawItem> = {
  Wood: item(-200, 0.8),
  Limestone: item(-150, 3),
  Mors: item(100, 600),
  WoodBoard: item(600),
  Jupiter: item(-300),
  Saturn: item(-100),
  Mars: item(-75),
  StarDust: item(100),
  Flax: item(200),
  LinseedOil: item(100),
  CharcoalPowder: item(100),
  Coke: item(100),
  Charcoal: item(100),
  GentianSeed: item(20),
  Gentian: item(100),
  GentianNectar: item(100),
};
const ctx: RecipeContext = {
  items,
  buildingsFor: (t) => ({ TableSaw: ['TableSaw'], AdProcess: ['ArcaneProcessor'], Extract: ['Extractor', 'ThermalExtractor'] })[t] ?? [t],
  unlockedBy: () => 'Skill',
};

describe('normalizeRecipe — FractionNum batch semantics', () => {
  it('Plank: 1 Logs → 200 Plank in 400 s (Logs is 200 parts)', () => {
    const r = normalizeRecipe('WoodBoard', row({
      IngredientList: [{ IngredientName: 'Wood', Count: 1 }],
      ProductInfo: { IngredientName: 'WoodBoard', Count: 1 },
      CraftType: 'EBeltTDCraftType::TableSaw', CraftingTime: 2, FractionNum: 200,
    }), ctx);
    expect(r.inputs).toEqual([{ item: 'Wood', qty: 1 }]);
    expect(r.outputs).toEqual([{ item: 'WoodBoard', qty: 200, chance: 1 }]);
    expect(r.timeSec).toBe(400);
    expect(r.buildings).toEqual(['TableSaw']);
  });

  it('Star Dust: fractional relic inputs → 1 Jupiter + 1 Saturn + 1 Mars → 5 in 300 s (= starfi5h)', () => {
    const r = normalizeRecipe('StarDust', row({
      IngredientList: [
        { IngredientName: 'Jupiter', Count: 60 },
        { IngredientName: 'Saturn', Count: 20 },
        { IngredientName: 'Mars', Count: 15 },
      ],
      ProductInfo: { IngredientName: 'StarDust', Count: 1 },
      CraftType: 'EBeltTDCraftType::AdProcess', CraftingTime: 60, FractionNum: 5,
    }), ctx);
    expect(r.inputs).toEqual([{ item: 'Jupiter', qty: 1 }, { item: 'Saturn', qty: 1 }, { item: 'Mars', qty: 1 }]);
    expect(r.outputs).toEqual([{ item: 'StarDust', qty: 5, chance: 1 }]);
    expect(r.timeSec).toBe(300);
  });

  it('Linseed Oil: plain row, Extractor first, Alchemy Skill applies', () => {
    const r = normalizeRecipe('LinseedOil', row({
      IngredientList: [{ IngredientName: 'Flax', Count: 1 }],
      ProductInfo: { IngredientName: 'LinseedOil', Count: 20 },
      CraftType: 'EBeltTDCraftType::Extract', CraftingTime: 2,
    }), ctx);
    expect(r.inputs).toEqual([{ item: 'Flax', qty: 1 }]);
    expect(r.outputs).toEqual([{ item: 'LinseedOil', qty: 20, chance: 1 }]);
    expect(r.timeSec).toBe(2);
    expect(r.buildings).toEqual(['Extractor', 'ThermalExtractor']);
    expect(r.yieldSkill).toBe(true);
  });
});

describe('normalizeRecipe — outputs and flags', () => {
  it('Coke (Athanor): fail product replaces the main one on fail cycles', () => {
    const r = normalizeRecipe('Coke', row({
      IngredientList: [{ IngredientName: 'CharcoalPowder', Count: 6 }],
      ProductInfo: { IngredientName: 'Coke', Count: 1 },
      CraftType: 'EBeltTDCraftType::Athanor', CraftingTime: 3,
      FailRate1: 0.5, FailProduct1: { IngredientName: 'Charcoal', Count: 2 },
    }), ctx);
    expect(r.outputs).toEqual([
      { item: 'Coke', qty: 0.5, chance: 0.5 },
      { item: 'Charcoal', qty: 1, chance: 0.5 },
    ]);
    expect(r.yieldSkill).toBe(false);
  });

  it('Gentian (Plant): Seed Plot row is special, side product always produced', () => {
    const r = normalizeRecipe('Gentian', row({
      IngredientList: [{ IngredientName: 'GentianSeed', Count: 1 }],
      ProductInfo: { IngredientName: 'Gentian', Count: 80 },
      SideProduct: { IngredientName: 'GentianNectar', Count: 80 },
      CraftType: 'EBeltTDCraftType::Plant', CraftingTime: 2160,
    }), ctx);
    expect(r.special).toBe('seedPlot');
    expect(r.outputs[1]).toEqual({ item: 'GentianNectar', qty: 80, chance: 1 });
  });

  it('hidden rows keep their data but are not unlockable; zero-count inputs dropped', () => {
    const r = normalizeRecipe('GoldDust', row({
      IngredientList: [{ IngredientName: 'Jupiter', Count: 0 }, { IngredientName: 'Flax', Count: 11 }],
      ProductInfo: { IngredientName: 'Flax', Count: 1 },
      bHideInGame: true,
    }), ctx);
    expect(r.unlockedBy).toBeNull();
    expect(r.hidden).toBe(true);
    expect(r.inputs).toEqual([{ item: 'Flax', qty: 11 }]);
  });
});

describe('nurseryRecipe', () => {
  it('Gentian: seed kept, nutrients for every produced unit', () => {
    const r = nurseryRecipe('GentianSeed', {
      PlantName: 'Gentian', SideProductName: 'GentianNectar', GrowthSeconds: 2160,
      GrowthNutrientValue: 6000, GrowthNum: 80, SideGrowthNum: 80,
    }, ['AutoNursery'], items, 'Level8');
    expect(r.id).toBe('Nursery_GentianSeed');
    expect(r.inputs).toEqual([]);
    expect(r.outputs).toEqual([{ item: 'Gentian', qty: 80, chance: 1 }, { item: 'GentianNectar', qty: 80, chance: 1 }]);
    expect(r.nutrientPerBatch).toBe(960_000);
  });
});

describe('paradoxRecipe (Paradox Crucible: any item → Oblivion Essence)', () => {
  it('time = 1500 / whole-item CauldronCost, matching starfi5h in-game timings', () => {
    const limestone = paradoxRecipe('Limestone', items, ['ParadoxCrucible'], 'ParadoxCrucible');
    expect(limestone.inputs).toEqual([{ item: 'Limestone', qty: 1 }]);
    expect(limestone.outputs).toEqual([{ item: 'Mors', qty: 1, chance: 1 }]);
    expect(limestone.timeSec).toBeCloseTo(3.333, 3);
    expect(limestone).toMatchObject({ alternate: false, special: null, hidden: false });
    const logs = paradoxRecipe('Wood', items, ['ParadoxCrucible'], 'ParadoxCrucible');
    expect(logs.timeSec).toBeCloseTo(9.375, 6);
    expect(logs.alternate).toBe(true);
  });
});
