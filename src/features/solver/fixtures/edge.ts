import { building, gameData, item, recipe } from './builders';

/** Infeasible loops, a shared input port, liquids and a hidden recipe. */
export const edgeData = gameData(
  [
    item('X'),
    item('Y'),
    item('Z', { raw: true }),
    item('T'),
    item('A'),
    item('B'),
    item('C'),
    item('PA', { raw: true }),
    item('PB', { raw: true }),
    item('Mixed'),
    item('Juice', { liquid: true }),
    item('Q'),
    item('Cheap', { raw: true, value: 1 }),
    item('Pricey', { raw: true, value: 100 }),
    item('Metal'),
    item('Side'),
  ],
  [
    // X ← 2Y, Y ← X: every X needs two X back, so no positive target is reachable.
    recipe('R_X', { buildings: ['Box'], inputs: [{ item: 'Y', qty: 2 }], outputs: [{ item: 'X', qty: 1, chance: 1 }] }),
    recipe('R_Y', { buildings: ['Box'], inputs: [{ item: 'X', qty: 1 }], outputs: [{ item: 'Y', qty: 1, chance: 1 }] }),
    recipe('R_Z', { buildings: ['Box'], inputs: [{ item: 'Z', qty: 1 }], outputs: [{ item: 'PB', qty: 1, chance: 1 }] }),
    // T ← A ← B with B ↔ C a closed loop: nothing ever enters it.
    recipe('R_T', { buildings: ['Box'], inputs: [{ item: 'A', qty: 1 }], outputs: [{ item: 'T', qty: 1, chance: 1 }] }),
    recipe('R_A', { buildings: ['Box'], inputs: [{ item: 'B', qty: 1 }], outputs: [{ item: 'A', qty: 1, chance: 1 }] }),
    recipe('R_B', { buildings: ['Box'], inputs: [{ item: 'C', qty: 1 }], outputs: [{ item: 'B', qty: 1, chance: 1 }] }),
    recipe('R_C', { buildings: ['Box'], inputs: [{ item: 'B', qty: 1 }], outputs: [{ item: 'C', qty: 1, chance: 1 }] }),
    recipe('R_Mixed', {
      buildings: ['Box'],
      inputs: [
        { item: 'PA', qty: 1 },
        { item: 'PB', qty: 1 },
      ],
      outputs: [{ item: 'Mixed', qty: 1, chance: 1 }],
    }),
    recipe('R_Juice', { buildings: ['Box'], inputs: [{ item: 'PA', qty: 1 }], outputs: [{ item: 'Juice', qty: 100, chance: 1 }] }),
    // Cheaper, sorts first by id, but cut from the game.
    recipe('R_AQ', { buildings: ['Box'], hidden: true, inputs: [{ item: 'PA', qty: 1 }], outputs: [{ item: 'Q', qty: 1, chance: 1 }] }),
    recipe('R_Q', { buildings: ['Box'], inputs: [{ item: 'PA', qty: 2 }], outputs: [{ item: 'Q', qty: 1, chance: 1 }] }),
    recipe('R_Metal', { buildings: ['Box'], inputs: [{ item: 'Cheap', qty: 1 }], outputs: [{ item: 'Metal', qty: 1, chance: 1 }] }),
    // Needed for Side, and also yields 2 Metal per Pricey: fewer raw items, far more value.
    recipe('R_Side', {
      buildings: ['Box'],
      inputs: [{ item: 'Pricey', qty: 1 }],
      outputs: [
        { item: 'Side', qty: 2, chance: 1 },
        { item: 'Metal', qty: 2, chance: 1 },
      ],
    }),
  ],
  // One solid input port, one solid output port (builder default).
  [building('Box')],
);
