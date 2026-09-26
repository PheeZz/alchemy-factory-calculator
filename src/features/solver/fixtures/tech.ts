import type { GameData, TechNode } from '@/shared/data/types';
import { chainData } from './chain';

const node = (id: string, stage: number, requires: string[], unlocks: Partial<TechNode['unlocks']>): TechNode => ({
  id,
  nameKey: id,
  icon: null,
  cost: [],
  costMoney: 100 * (stage + 1),
  researchPoints: 10,
  requires,
  unlocks: { recipes: [], buildings: [], items: [], ...unlocks },
  stage,
});

/**
 * chainData with a small tree:  L1 (buys Ore) → Smelting (Smelter, R_Ingot) → Plus (SmelterPlus)
 *                                             ↘ Pressing (Press, R_Gear) → L2 (buys Sand)
 *                               Smelting → GlassAlt (R_GlassAlt). Grinder and R_Glass have no node.
 */
export const techData: GameData = {
  ...chainData,
  tech: [
    node('L1', 0, [], { items: ['Ore'] }),
    node('Smelting', 1, ['L1'], { buildings: ['Smelter'], recipes: ['R_Ingot'] }),
    node('Pressing', 1, ['L1'], { buildings: ['Press'], recipes: ['R_Gear'] }),
    node('Plus', 2, ['Smelting'], { buildings: ['SmelterPlus'] }),
    node('GlassAlt', 2, ['Smelting'], { recipes: ['R_GlassAlt'] }),
    node('L2', 2, ['Pressing'], { items: ['Sand'] }),
  ],
};
