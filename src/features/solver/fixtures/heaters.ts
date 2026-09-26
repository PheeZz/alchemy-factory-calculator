import { building, gameData, item, recipe } from './builders';

const cell = { x: 0, y: 0, z: 0 };

/** Heated machines of different slot needs and three heaters (solid stove/furnace, steam pad). */
export const heatersData = gameData(
  [
    item('Ore', { raw: true }),
    item('Coal', { raw: true, heatValue: 40 }),
    item('Stone', { raw: true, value: 1 }),
    item('Brick', { raw: true, value: 25 }),
    item('Ingot'),
    item('Bar'),
  ],
  [
    // Crucible: 6 s per Ingot, 2 heater slots.
    recipe('R_Ingot', { buildings: ['Crucible'], inputs: [{ item: 'Ore', qty: 1 }], outputs: [{ item: 'Ingot', qty: 1, chance: 1 }], timeSec: 6 }),
    // Big machine needs 12 slots: fits a 42-slot furnace (3 per furnace), not a 9-slot stove.
    recipe('R_Bar', { buildings: ['Big'], inputs: [{ item: 'Ore', qty: 1 }], outputs: [{ item: 'Bar', qty: 1, chance: 1 }], timeSec: 6 }),
  ],
  [
    building('Crucible', { heatCost: 4, heatSlotsRequired: 2 }),
    building('Big', { heatCost: 10, heatSlotsRequired: 12 }),
    // Build value: Stove 20·1 = 20, Furnace 30·25 = 750; the steam pad is cheapest (1 Stone) but pipe-fed.
    building('Stove', { category: 'heating', heatSlots: 9, buildCost: [{ item: 'Stone', qty: 20 }], ports: [{ cell, side: 'base', dir: 'in', pipe: false }] }),
    building('Furnace', { category: 'heating', heatSlots: 42, buildCost: [{ item: 'Brick', qty: 30 }], ports: [{ cell, side: 'base', dir: 'in', pipe: false }] }),
    building('Pad', { category: 'heating', heatSlots: 9, buildCost: [{ item: 'Stone', qty: 1 }], ports: [{ cell, side: 'base', dir: 'both', pipe: true }] }),
  ],
);
