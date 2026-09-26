import { building, gameData, item, recipe } from './builders';

/** Unheated production: linear chain, byproduct, alternates, port limits, an unreachable input. */
export const chainData = gameData(
  [
    item('Ore', { raw: true, buyPrice: 5, value: 1 }),
    item('Stone', { raw: true }),
    item('Sand', { raw: true, value: 1 }),
    item('Ingot', { value: 10 }),
    item('Gear', { value: 40 }),
    item('Slag'),
    item('Brick'),
    item('Dust'),
    item('Glass'),
    item('Mystery'),
    item('Alloy'),
  ],
  [
    recipe('R_Ingot', {
      buildings: ['Smelter', 'SmelterPlus'],
      inputs: [{ item: 'Ore', qty: 2 }],
      outputs: [
        { item: 'Ingot', qty: 1, chance: 1 },
        { item: 'Slag', qty: 0.5, chance: 0.5 },
      ],
      timeSec: 3,
    }),
    recipe('R_Gear', {
      buildings: ['Press'],
      inputs: [{ item: 'Ingot', qty: 3 }],
      outputs: [{ item: 'Gear', qty: 2, chance: 1 }],
      timeSec: 6,
    }),
    recipe('R_Slag', {
      buildings: ['Grinder'],
      inputs: [{ item: 'Ore', qty: 1 }],
      outputs: [{ item: 'Slag', qty: 1, chance: 1 }],
      timeSec: 2,
    }),
    recipe('R_Brick', {
      buildings: ['Press'],
      inputs: [
        { item: 'Slag', qty: 1 },
        { item: 'Ingot', qty: 1 },
      ],
      outputs: [{ item: 'Brick', qty: 1, chance: 1 }],
      timeSec: 4,
    }),
    recipe('R_Dust', {
      buildings: ['Grinder'],
      inputs: [{ item: 'Ore', qty: 10 }],
      outputs: [{ item: 'Dust', qty: 1, chance: 1 }],
      timeSec: 1,
    }),
    recipe('R_Glass', {
      buildings: ['Smelter'],
      inputs: [{ item: 'Sand', qty: 4 }],
      outputs: [{ item: 'Glass', qty: 1, chance: 1 }],
      timeSec: 2,
    }),
    recipe('R_GlassAlt', {
      buildings: ['Smelter'],
      alternate: true,
      inputs: [
        { item: 'Ore', qty: 1 },
        { item: 'Sand', qty: 1 },
      ],
      outputs: [{ item: 'Glass', qty: 1, chance: 1 }],
      timeSec: 2,
    }),
    recipe('R_Alloy', {
      buildings: ['Press'],
      inputs: [
        { item: 'Ingot', qty: 1 },
        { item: 'Mystery', qty: 1 },
      ],
      outputs: [{ item: 'Alloy', qty: 1, chance: 1 }],
      timeSec: 2,
    }),
    // The only producer of Mystery is special, so the solver must not use it on its own.
    recipe('R_Mystery', {
      buildings: ['Press'],
      special: 'cauldron',
      inputs: [{ item: 'Ore', qty: 1 }],
      outputs: [{ item: 'Mystery', qty: 1, chance: 1 }],
      timeSec: 2,
    }),
  ],
  [
    building('Smelter', { buildCost: [{ item: 'Stone', qty: 5 }], buildCostMoney: 100 }),
    building('SmelterPlus', { speedMult: 2, buildCost: [{ item: 'Stone', qty: 20 }] }),
    building('Press', { buildCost: [{ item: 'Stone', qty: 3 }], buildCostMoney: 50 }),
    building('Grinder', {
      ports: [
        { cell: { x: 0, y: 0, z: 0 }, side: 'left', dir: 'in', pipe: false },
        { cell: { x: 0, y: 0, z: 0 }, side: 'up', dir: 'both', pipe: false },
        { cell: { x: 0, y: 0, z: 0 }, side: 'right', dir: 'out', pipe: false },
        // Pipe ports carry liquids only and must not count towards belt capacity.
        { cell: { x: 0, y: 0, z: 0 }, side: 'bottom', dir: 'in', pipe: true },
      ],
    }),
  ],
);
