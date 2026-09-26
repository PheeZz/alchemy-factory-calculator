import type { Building, GameData, GameLocale, Item, Recipe, UpgradeTrack } from '@/shared/data/types';

// Hand-made slice of the game so the UI renders before the normalizer and solver land.
// Icons are null on purpose: exercises the fallback glyph path.

const item = (id: string, p: Partial<Item> = {}): Item => ({
  id,
  nameKey: `item.${id}`,
  icon: null,
  value: 10,
  buyPrice: null,
  heatValue: 0,
  nutrientValue: 0,
  liquid: false,
  maxStack: 100,
  tags: [],
  raw: false,
  ...p,
});

const port = (side: 'left' | 'right', dir: 'in' | 'out') => ({ cell: { x: 0, y: 0, z: 0 }, side, dir, pipe: false });

const building = (id: string, p: Partial<Building> = {}): Building => ({
  id,
  nameKey: `building.${id}`,
  icon: null,
  category: 'production',
  speedMult: 1,
  heatCost: 0,
  heatSlots: null,
  heatSlotsRequired: 0,
  buildCost: [{ item: 'Plank', qty: 10 }],
  buildCostMoney: 5_000,
  footprint: { cells: [{ x: 0, y: 0, z: 0 }] },
  ports: [port('left', 'in'), port('right', 'out')],
  ...p,
});

const recipe = (id: string, p: Partial<Recipe>): Recipe => ({
  id,
  nameKey: `recipe.${id}`,
  buildings: [],
  inputs: [],
  outputs: [],
  timeSec: 1,
  heatPerSec: null,
  nutrientPerBatch: null,
  alternate: false,
  special: null,
  unlockedBy: null,
  yieldSkill: false,
  ...p,
});

const items = [
  item('Log', { raw: true, buyPrice: 5, heatValue: 40 }),
  item('Plank', { heatValue: 20, value: 3 }),
  item('Sawdust', { value: 1 }),
  item('Charcoal', { heatValue: 120, value: 12 }),
  item('IronOre', { raw: true, buyPrice: 20 }),
  item('IronIngot', { value: 60 }),
  item('FlaxSeed', { value: 4 }),
  item('Flax', { value: 8 }),
  item('Water', { raw: true, liquid: true, buyPrice: 0 }),
  item('LinseedOil', { liquid: true, value: 45 }),
  item('SaltRock', { raw: true, buyPrice: 8 }),
  item('Salt', { value: 15 }),
  item('PlantAsh', { raw: true, buyPrice: 15, nutrientValue: 8 }),
  item('Elixir', { value: 900 }),
];

const buildings = [
  building('Sawmill', { buildCost: [{ item: 'Log', qty: 20 }], buildCostMoney: 2_000 }),
  building('Kiln', { heatCost: 8, heatSlotsRequired: 1, buildCost: [{ item: 'Plank', qty: 30 }] }),
  building('Crucible', { heatCost: 12, heatSlotsRequired: 1, buildCost: [{ item: 'Plank', qty: 20 }, { item: 'IronIngot', qty: 5 }], buildCostMoney: 12_000 }),
  building('CrucibleEnhanced', { speedMult: 2, heatCost: 12, heatSlotsRequired: 1, buildCost: [{ item: 'IronIngot', qty: 40 }], buildCostMoney: 80_000 }),
  building('Nursery', { category: 'farming', buildCost: [{ item: 'Plank', qty: 8 }], buildCostMoney: 1_500 }),
  building('Extractor', { buildCost: [{ item: 'IronIngot', qty: 10 }], buildCostMoney: 9_000 }),
  building('Grinder', { buildCost: [{ item: 'Plank', qty: 12 }] }),
  building('Alembic', { heatCost: 4, heatSlotsRequired: 1, buildCost: [{ item: 'IronIngot', qty: 12 }, { item: 'Plank', qty: 6 }], buildCostMoney: 25_000 }),
];

const recipes = [
  recipe('Plank', { buildings: ['Sawmill'], inputs: [{ item: 'Log', qty: 1 }], outputs: [{ item: 'Plank', qty: 8, chance: 1 }, { item: 'Sawdust', qty: 0.5, chance: 0.5 }], timeSec: 6 }),
  recipe('Charcoal', { buildings: ['Kiln'], inputs: [{ item: 'Plank', qty: 2 }], outputs: [{ item: 'Charcoal', qty: 1, chance: 1 }], timeSec: 6 }),
  recipe('CharcoalFromLog', { buildings: ['Kiln'], inputs: [{ item: 'Log', qty: 1 }], outputs: [{ item: 'Charcoal', qty: 1, chance: 1 }], timeSec: 10, alternate: true }),
  recipe('IronIngot', { buildings: ['Crucible', 'CrucibleEnhanced'], inputs: [{ item: 'IronOre', qty: 2 }], outputs: [{ item: 'IronIngot', qty: 1, chance: 1 }], timeSec: 5 }),
  recipe('Flax', { buildings: ['Nursery'], inputs: [{ item: 'FlaxSeed', qty: 1 }], outputs: [{ item: 'Flax', qty: 3, chance: 1 }, { item: 'FlaxSeed', qty: 1.5, chance: 0.75 }], timeSec: 20, nutrientPerBatch: 4 }),
  recipe('LinseedOil', { buildings: ['Extractor'], inputs: [{ item: 'Flax', qty: 2 }, { item: 'Water', qty: 1 }], outputs: [{ item: 'LinseedOil', qty: 1, chance: 1 }], timeSec: 8, yieldSkill: true }),
  recipe('Salt', { buildings: ['Grinder'], inputs: [{ item: 'SaltRock', qty: 1 }], outputs: [{ item: 'Salt', qty: 2, chance: 1 }], timeSec: 3 }),
  recipe('Elixir', { buildings: ['Alembic'], inputs: [{ item: 'LinseedOil', qty: 2 }, { item: 'Salt', qty: 1 }, { item: 'IronIngot', qty: 1 }], outputs: [{ item: 'Elixir', qty: 1, chance: 1 }], timeSec: 13 }),
  recipe('ElixirCauldron', { buildings: ['Alembic'], inputs: [{ item: 'Flax', qty: 6 }], outputs: [{ item: 'Elixir', qty: 1, chance: 1 }], timeSec: 30, special: 'cauldron' }),
];

const track = (id: UpgradeTrack['id'], maxLevel: number, value: (l: number) => number): UpgradeTrack => ({
  id,
  nameKey: `upgrade.${id}`,
  maxLevel,
  values: Array.from({ length: maxLevel + 1 }, (_, l) => value(l)),
});

const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x]));

export const demoGameData: GameData = {
  build: { id: 'demo', version: '1.0-demo' },
  items: byId(items),
  recipes: byId(recipes),
  buildings: byId(buildings),
  upgrades: [
    track('conveyor', 20, (l) => 60 + 15 * Math.min(l, 12) + 3 * Math.max(l - 12, 0)),
    track('factorySpeed', 20, (l) => 1 + 0.25 * Math.min(l, 12) + 0.05 * Math.max(l - 12, 0)),
    track('alchemySkill', 10, (l) => [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2][l]!),
    track('fuelEfficiency', 10, (l) => 1 + 0.1 * l),
    track('fertilizerEfficiency', 10, (l) => 1 + 0.1 * l),
  ],
  constants: { baseBeltSpeed: 60 },
};

const names = (pairs: Record<string, [string, string]>, idx: 0 | 1): GameLocale =>
  Object.fromEntries(Object.entries(pairs).map(([k, v]) => [k, v[idx]]));

const pairs: Record<string, [string, string]> = {
  'item.Log': ['Бревно', 'Log'],
  'item.Plank': ['Доска', 'Plank'],
  'item.Sawdust': ['Опилки', 'Sawdust'],
  'item.Charcoal': ['Древесный уголь', 'Charcoal'],
  'item.IronOre': ['Железная руда', 'Iron Ore'],
  'item.IronIngot': ['Железный слиток', 'Iron Ingot'],
  'item.FlaxSeed': ['Семена льна', 'Flax Seed'],
  'item.Flax': ['Лён', 'Flax'],
  'item.Water': ['Вода', 'Water'],
  'item.LinseedOil': ['Льняное масло', 'Linseed Oil'],
  'item.SaltRock': ['Каменная соль', 'Salt Rock'],
  'item.Salt': ['Соль', 'Salt'],
  'item.PlantAsh': ['Зола', 'Plant Ash'],
  'item.Elixir': ['Эликсир жизни', 'Elixir of Life'],
  'building.Sawmill': ['Лесопилка', 'Sawmill'],
  'building.Kiln': ['Обжиговая печь', 'Kiln'],
  'building.Crucible': ['Тигель', 'Crucible'],
  'building.CrucibleEnhanced': ['Улучшенный тигель', 'Enhanced Crucible'],
  'building.Nursery': ['Питомник', 'Nursery'],
  'building.Extractor': ['Экстрактор', 'Extractor'],
  'building.Grinder': ['Жернова', 'Grinder'],
  'building.Alembic': ['Алембик', 'Alembic'],
  'recipe.Plank': ['Доски', 'Planks'],
  'recipe.Charcoal': ['Уголь из досок', 'Charcoal from planks'],
  'recipe.CharcoalFromLog': ['Уголь из брёвен', 'Charcoal from logs'],
  'recipe.IronIngot': ['Плавка железа', 'Iron smelting'],
  'recipe.Flax': ['Выращивание льна', 'Flax growing'],
  'recipe.LinseedOil': ['Отжим масла', 'Oil pressing'],
  'recipe.Salt': ['Помол соли', 'Salt grinding'],
  'recipe.Elixir': ['Перегонка эликсира', 'Elixir distilling'],
  'recipe.ElixirCauldron': ['Эликсир в котле', 'Cauldron elixir'],
};

export const demoLocales = { ru: names(pairs, 0), en: names(pairs, 1) };
