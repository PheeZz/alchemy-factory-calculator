import type { Item, Recipe } from '@/shared/data/types';
import { building, gameData, item, recipe } from './builders';

const N = 100;

/**
 * 200 recipes over 102 items: every I<k> has a default and an alternate recipe,
 * half of them heated, so the LP has real choices (performance fixture).
 */
function build() {
  const items: Item[] = [item('I0', { raw: true }), item('Raw2', { raw: true }), item('Fuel', { raw: true, heatValue: 50 })];
  const recipes: Recipe[] = [];
  for (let k = 1; k <= N; k++) {
    items.push(item(`I${k}`));
    const half = Math.floor(k / 2);
    recipes.push(
      recipe(`R${k}`, {
        buildings: [k % 2 ? 'Hot' : 'Cold'],
        inputs: [{ item: `I${k - 1}`, qty: 1 }, ...(half !== k - 1 ? [{ item: `I${half}`, qty: 1 }] : [])],
        outputs: [{ item: `I${k}`, qty: 2, chance: 1 }],
        timeSec: 1 + (k % 7),
      }),
      recipe(`R${k}alt`, {
        buildings: ['Cold'],
        alternate: true,
        inputs: [
          { item: `I${k - 1}`, qty: 1 },
          { item: 'Raw2', qty: 1 + (k % 3) },
        ],
        outputs: [{ item: `I${k}`, qty: 2, chance: 1 }],
        timeSec: 2,
      }),
    );
  }
  return gameData(items, recipes, [building('Hot', { heatCost: 3 }), building('Cold')]);
}

export const largeData = build();
export const largeTarget = `I${N}`;
