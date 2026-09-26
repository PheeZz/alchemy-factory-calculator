import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import type { GameData } from '@/shared/data/types';
import { boilerFuelPatch, boilerRecipes } from './steam';
import { emptyPlan } from './store';

const data: GameData = {
  ...demoGameData,
  items: { ...demoGameData.items, Steam: { ...demoGameData.items.Water!, id: 'Steam', liquid: true, heatValue: 20 } },
  recipes: {
    ...demoGameData.recipes,
    SteamBoiler_Low: { ...demoGameData.recipes.Salt!, id: 'SteamBoiler_Low', inputs: [], outputs: [{ item: 'Steam', qty: 30, chance: 1 }] },
    SteamBoiler_High: { ...demoGameData.recipes.Salt!, id: 'SteamBoiler_High', inputs: [], outputs: [{ item: 'Steam', qty: 300, chance: 1 }] },
  },
};

test('boilers are the recipes making a steam-like liquid fuel', () => {
  expect(boilerRecipes(data).sort()).toEqual(['SteamBoiler_High', 'SteamBoiler_Low']);
});

test('steam as factory fuel gives every boiler the recommended solid fuel, keeping explicit picks', () => {
  const plan = { ...emptyPlan(), fuel: 'Steam', fuelFor: { SteamBoiler_High: 'Log' } };
  expect(boilerFuelPatch(data, plan, 'Charcoal')).toEqual({ SteamBoiler_Low: 'Charcoal' });
});

test('a boiler set to burn steam is corrected; nothing happens without steam or without a solid recommendation', () => {
  const selfBurn = { ...emptyPlan(), fuel: 'Charcoal', fuelFor: { IronIngot: 'Steam', SteamBoiler_Low: 'Steam' } };
  expect(boilerFuelPatch(data, selfBurn, 'Charcoal')).toEqual({ SteamBoiler_Low: 'Charcoal', SteamBoiler_High: 'Charcoal' });
  expect(boilerFuelPatch(data, { ...emptyPlan(), fuel: 'Charcoal' }, 'Charcoal')).toEqual({});
  expect(boilerFuelPatch(data, { ...emptyPlan(), fuel: 'Steam' }, 'Steam')).toEqual({});
});
