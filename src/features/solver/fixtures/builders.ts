import type { Building, GameData, Item, Recipe, UpgradeTrack } from '@/shared/data/types';
import type { FactoryPlan, UpgradeLevels } from '../types';

export function item(id: string, patch: Partial<Item> = {}): Item {
  return {
    id,
    nameKey: id,
    icon: null,
    value: 1,
    buyPrice: null,
    heatValue: 0,
    nutrientValue: 0,
    nutrientSpeed: 0,
    liquid: false,
    maxStack: 100,
    tags: [],
    raw: false,
    ...patch,
  };
}

export function recipe(id: string, patch: Partial<Recipe> & Pick<Recipe, 'buildings'>): Recipe {
  return {
    id,
    nameKey: id,
    inputs: [],
    outputs: [],
    timeSec: 1,
    heatPerSec: null,
    nutrientPerBatch: null,
    alternate: false,
    special: null,
    hidden: false,
    unlockedBy: null,
    yieldSkill: false,
    ...patch,
  };
}

const cell = { x: 0, y: 0, z: 0 };

/** One solid input port and one solid output port unless overridden. */
export function building(id: string, patch: Partial<Building> = {}): Building {
  return {
    id,
    nameKey: id,
    icon: null,
    category: 'production',
    speedMult: 1,
    heatCost: 0,
    heatSlots: null,
    heatSlotsRequired: 0,
    buildCost: [],
    buildCostMoney: 0,
    footprint: { cells: [cell] },
    ports: [
      { cell, side: 'left', dir: 'in', pipe: false },
      { cell, side: 'right', dir: 'out', pipe: false },
    ],
    ...patch,
  };
}

const range = (n: number) => Array.from({ length: n + 1 }, (_, l) => l);
const MAX = 20;

/** Community formulas (skills.json), so fixture numbers match the real tracks. */
export const upgradeTracks: UpgradeTrack[] = [
  {
    id: 'conveyor',
    nameKey: 'conveyor',
    maxLevel: MAX,
    values: range(MAX).map((l) => 60 + 15 * Math.min(l, 12) + 3 * Math.max(l - 12, 0)),
  },
  {
    id: 'factorySpeed',
    nameKey: 'factorySpeed',
    maxLevel: MAX,
    values: range(MAX).map((l) => 1 + 0.25 * Math.min(l, 12) + 0.05 * Math.max(l - 12, 0)),
  },
  {
    id: 'alchemySkill',
    nameKey: 'alchemySkill',
    maxLevel: MAX,
    values: range(MAX).map((l) => {
      let pct = 0;
      for (let i = 1; i <= l; i++) pct += i <= 2 ? 6 : i <= 8 ? 8 : 10;
      return 1 + pct / 100;
    }),
  },
  { id: 'fuelEfficiency', nameKey: 'fuel', maxLevel: MAX, values: range(MAX).map((l) => 1 + 0.1 * l) },
  { id: 'fertilizerEfficiency', nameKey: 'fert', maxLevel: MAX, values: range(MAX).map((l) => 1 + 0.1 * l) },
];

export function gameData(items: Item[], recipes: Recipe[], buildings: Building[]): GameData {
  return {
    build: { id: 'test', version: '0' },
    items: Object.fromEntries(items.map((i) => [i.id, i])),
    recipes: Object.fromEntries(recipes.map((r) => [r.id, r])),
    buildings: Object.fromEntries(buildings.map((b) => [b.id, b])),
    upgrades: upgradeTracks,
    constants: { baseBeltSpeed: 60 },
  };
}

export function plan(patch: Partial<FactoryPlan> = {}): FactoryPlan {
  return {
    targets: [],
    mode: 'targets',
    supplies: [],
    maximize: null,
    recipeFor: {},
    buildingFor: {},
    imports: [],
    fuel: null,
    fuelFor: {},
    fertilizer: null,
    fertilizerFor: {},
    optimize: null,
    ...patch,
  };
}

export const level0: UpgradeLevels = {
  conveyor: 0,
  factorySpeed: 0,
  alchemySkill: 0,
  fuelEfficiency: 0,
  fertilizerEfficiency: 0,
};

export const levels = (patch: Partial<UpgradeLevels>): UpgradeLevels => ({ ...level0, ...patch });
