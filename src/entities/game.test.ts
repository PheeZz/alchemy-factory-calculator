import type { Building, GameData } from '@/shared/data/types';
import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { heatersFor } from './game';

const heater = (id: string, pipe: boolean): Building => ({
  ...demoGameData.buildings.Kiln!,
  id,
  category: 'heating',
  heatSlots: 9,
  ports: [{ cell: { x: 0, y: 0, z: 0 }, side: 'left', dir: pipe ? 'both' : 'in', pipe }],
});
const data: GameData = {
  ...demoGameData,
  items: { ...demoGameData.items, Steam: { ...demoGameData.items.Water!, id: 'Steam', liquid: true, heatValue: 20 } },
  buildings: { ...demoGameData.buildings, Stove: heater('Stove', false), SteamPad: heater('SteamPad', true) },
};

test('heaters offered for a node follow its fuel: steam → pipe-fed pad, solid → belt-fed stove', () => {
  expect(heatersFor(data, 'Steam').map((b) => b.id)).toEqual(['SteamPad']);
  expect(heatersFor(data, 'Charcoal').map((b) => b.id)).toEqual(['Stove']);
  expect(heatersFor(data, null).map((b) => b.id).sort()).toEqual(['SteamPad', 'Stove']);
});
