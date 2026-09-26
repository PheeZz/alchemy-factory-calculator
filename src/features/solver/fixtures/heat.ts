import { building, gameData, item, recipe } from './builders';

/** Heated, farmed and yield-skill production: fuel loops, seed loops, fertilizer. */
export const heatData = gameData(
  [
    item('Log', { raw: true }),
    item('Plank', { heatValue: 10 }),
    item('Coal', { raw: true, heatValue: 40, buyPrice: 5 }),
    item('Ore', { raw: true }),
    item('Ingot'),
    item('Seed'),
    item('Wheat'),
    item('Water', { raw: true, liquid: true }),
    item('FlowerSeed', { raw: true }),
    item('Flower'),
    // nutrientSpeed 4: 24 nutrients per batch / 4 per s = 6 s per batch at speed 1.
    item('Compost', { raw: true, nutrientValue: 12, nutrientSpeed: 4 }),
    item('Herb', { raw: true }),
    item('Essence'),
  ],
  [
    recipe('R_Plank', {
      buildings: ['Sawmill'],
      inputs: [{ item: 'Log', qty: 1 }],
      outputs: [{ item: 'Plank', qty: 4, chance: 1 }],
      timeSec: 10,
    }),
    recipe('R_Ingot', {
      buildings: ['Furnace'],
      inputs: [{ item: 'Ore', qty: 2 }],
      outputs: [{ item: 'Ingot', qty: 1, chance: 1 }],
      timeSec: 4,
    }),
    recipe('R_Wheat', {
      buildings: ['Farm'],
      inputs: [
        { item: 'Seed', qty: 1 },
        { item: 'Water', qty: 2 },
      ],
      outputs: [
        { item: 'Wheat', qty: 3, chance: 1 },
        { item: 'Seed', qty: 1.5, chance: 1 },
      ],
      timeSec: 12,
    }),
    recipe('R_Flower', {
      buildings: ['Nursery'],
      inputs: [{ item: 'FlowerSeed', qty: 1 }],
      outputs: [{ item: 'Flower', qty: 2, chance: 1 }],
      // GrowthSeconds placeholder, used only when no fertilizer is chosen.
      timeSec: 10,
      nutrientPerBatch: 24,
    }),
    recipe('R_Essence', {
      buildings: ['Extractor'],
      inputs: [{ item: 'Herb', qty: 1 }],
      outputs: [{ item: 'Essence', qty: 2, chance: 1 }],
      timeSec: 5,
      yieldSkill: true,
    }),
  ],
  [
    building('Sawmill', { heatCost: 2 }),
    building('Furnace', { heatCost: 5 }),
    building('Farm', { category: 'farming' }),
    building('Nursery', { category: 'farming' }),
    building('Extractor'),
  ],
);
