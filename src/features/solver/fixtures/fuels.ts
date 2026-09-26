import { building, gameData, item, recipe } from './builders';

/**
 * Fuel F has two paths — R_F (cheap raw, many machines) and R_F_Alt (few machines, pricey raw) —
 * and a heated derived fuel P ("powder") made from F. Coal is a raw fuel.
 */
export const fuelsData = gameData(
  [
    item('Log', { raw: true, value: 2 }),
    item('Ore', { raw: true, value: 10 }),
    item('Coal', { raw: true, value: 20, heatValue: 50 }),
    item('F', { heatValue: 100, value: 3 }),
    item('P', { heatValue: 150, value: 8 }),
  ],
  [
    recipe('R_F', { buildings: ['Mill'], inputs: [{ item: 'Log', qty: 1 }], outputs: [{ item: 'F', qty: 1, chance: 1 }], timeSec: 30 }),
    recipe('R_F_Alt', {
      buildings: ['Press'],
      alternate: true,
      inputs: [{ item: 'Ore', qty: 1 }],
      outputs: [{ item: 'F', qty: 2, chance: 1 }],
      timeSec: 6,
    }),
    // 3 s · 5 heat/s = 15 heat per batch.
    recipe('R_P', { buildings: ['Kiln'], inputs: [{ item: 'F', qty: 1 }], outputs: [{ item: 'P', qty: 1, chance: 1 }], timeSec: 3 }),
  ],
  [
    building('Mill', { buildCost: [{ item: 'Log', qty: 1 }] }),
    building('Press', { buildCost: [{ item: 'Ore', qty: 2 }] }),
    building('Kiln', { heatCost: 5 }),
  ],
);
