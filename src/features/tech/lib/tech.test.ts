import type { GameData, TechNode } from '@/shared/data/types';
import { demoGameData } from '@/features/graph/fixtures/demo-gamedata';
import { learn, lockedBy, techCost, techStages, unlearn } from './tech';

const node = (id: string, stage: number, requires: string[], unlocks: Partial<TechNode['unlocks']> = {}): TechNode => ({
  id,
  nameKey: id.startsWith('Level') ? null : `n.${id}`,
  icon: null,
  cost: [],
  costMoney: 100 * (stage + 1),
  researchPoints: 10 * (stage + 1),
  requires,
  unlocks: { recipes: [], buildings: [], items: [], ...unlocks },
  stage,
});

// Level1 → Kiln → Charcoal;  Level1 → Level2 → Crucible
const data: GameData = {
  ...demoGameData,
  tech: [
    node('Level1', 0, []),
    node('KilnNode', 0, ['Level1'], { buildings: ['Kiln'] }),
    node('CharcoalNode', 1, ['KilnNode'], { recipes: ['Charcoal'] }),
    node('Level2', 1, ['Level1']),
    node('CrucibleNode', 1, ['Level2'], { buildings: ['Crucible'] }),
  ],
};

test('stages list level nodes first', () => {
  expect(techStages(data).map((s) => s.map((n) => n.id))).toEqual([
    ['Level1', 'KilnNode'],
    ['Level2', 'CharcoalNode', 'CrucibleNode'],
  ]);
});

test('learning pulls in prerequisites; unlearning drops everything that depends on it', () => {
  expect(learn(data, [], ['CharcoalNode'])).toEqual(['CharcoalNode', 'KilnNode', 'Level1']);
  expect(unlearn(data, ['CharcoalNode', 'KilnNode', 'Level1'], 'KilnNode')).toEqual(['Level1']);
  // From "all open", unlearning a root closes its whole subtree.
  expect(unlearn(data, null, 'Level2')).toEqual(['CharcoalNode', 'KilnNode', 'Level1']);
  expect(learn(data, null, ['Level2'])).toBeNull();
});

test('cost sums money and research points; locked pickers name the cheapest unlocking node', () => {
  expect(techCost(data, ['Level1', 'CharcoalNode'])).toEqual({ money: 300, rp: 30 });
  const lock = lockedBy(data, ['Level1']);
  expect(lock.recipe('Charcoal')?.id).toBe('CharcoalNode');
  expect(lock.building('Kiln')?.id).toBe('KilnNode');
  expect(lock.recipe('IronIngot')).toBeNull(); // not gated by any node
  expect(lockedBy(data, null).building('Crucible')).toBeNull();
});
