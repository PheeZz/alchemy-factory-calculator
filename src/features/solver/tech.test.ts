// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { requiredTechFor, solve, SolverError, techClosure, techGate } from './index';
import { level0, plan } from './fixtures/builders';
import { loadRealData } from './fixtures/real';
import { techData } from './fixtures/tech';
import type { FactoryPlan } from './types';

async function solveError(p: FactoryPlan, data = techData): Promise<SolverError> {
  try {
    await solve(data, p, level0);
  } catch (e) {
    if (e instanceof SolverError) return e;
    throw e;
  }
  throw new Error('expected SolverError');
}

const ids = (res: { nodes: { id: string }[] }) => res.nodes.map((n) => n.id).sort();

describe('tech tree in the solver (fixture)', () => {
  it('closure pulls in prerequisites; the gate opens what the closure unlocks', () => {
    expect([...techClosure(techData, ['Plus'])].sort()).toEqual(['L1', 'Plus', 'Smelting']);
    const gate = techGate(techData, ['Pressing']);
    expect(gate.building('Press')).toBe(true);
    expect(gate.building('Smelter')).toBe(false);
    expect(gate.building('Grinder')).toBe(true); // no node → always open
    expect(gate.item('Ore')).toBe(true); // L1 via Pressing
    expect(gate.recipe('R_Ingot')).toBe(false);
    expect(techGate(techData, null).recipe('R_Ingot')).toBe(true);
  });

  it('a target blocked by the tree is unreachable and names the techs to learn', async () => {
    const gears = plan({ targets: [{ item: 'Gear', rate: 50 }], unlocked: ['Pressing'] });
    const err = await solveError(gears);
    expect(err).toMatchObject({ code: 'unreachable', item: 'Ingot', requiredTech: ['Smelting'] });
    expect(await requiredTechFor(techData, gears)).toEqual(['Smelting']);
    expect(ids(await solve(techData, { ...gears, unlocked: ['Pressing', 'Smelting'] }, level0))).toEqual(['R_Gear', 'R_Ingot']);
    // Nothing set = everything open.
    expect(ids(await solve(techData, { ...gears, unlocked: null }, level0))).toEqual(['R_Gear', 'R_Ingot']);
  });

  it('locked raw items cannot be bought; the hint includes the prerequisite chain', async () => {
    // Glass via R_Glass (Smelter) needs Sand, sold after L2, which needs Pressing.
    const glass = plan({ targets: [{ item: 'Glass', rate: 10 }], unlocked: ['Smelting'] });
    expect(await solveError(glass)).toMatchObject({ code: 'unreachable', item: 'Sand', requiredTech: ['Pressing', 'L2'] });
    expect(ids(await solve(techData, { ...glass, unlocked: ['Smelting', 'L2'] }, level0))).toEqual(['R_Glass']);
  });

  it('locked recipes and buildings are skipped automatically; a manual recipe choice still counts', async () => {
    const base = plan({ targets: [{ item: 'Glass', rate: 10 }], optimize: 'raw', unlocked: ['Smelting', 'L2'] });
    // Optimize would pick R_GlassAlt (20 raw vs 40), but it is locked.
    expect(ids(await solve(techData, base, level0))).toEqual(['R_Glass']);
    expect(ids(await solve(techData, { ...base, unlocked: ['GlassAlt', 'L2'] }, level0))).toEqual(['R_GlassAlt']);
    const hybrid = { ...base, optimize: null, recipeFor: { Glass: 'R_GlassAlt' } };
    expect(ids(await solve(techData, hybrid, level0))).toEqual(['R_GlassAlt']);
    // SmelterPlus needs Plus; without it the recipe falls back to the plain Smelter.
    const ingot = plan({ targets: [{ item: 'Ingot', rate: 60 }], buildingFor: { R_Ingot: 'SmelterPlus' }, unlocked: ['Smelting'] });
    expect((await solve(techData, ingot, level0)).nodes[0]!.building).toBe('Smelter');
    expect((await solve(techData, { ...ingot, unlocked: ['Plus'] }, level0)).nodes[0]!.building).toBe('SmelterPlus');
  });
});

describe('tech tree in the solver (real data)', () => {
  const data = loadRealData();

  it('Iron Ingot at Level 1 needs the smelter branch and Level 3 (Iron Ore)', async () => {
    const p = plan({ targets: [{ item: 'IronIngot', rate: 60 }], fuel: 'Coal', unlocked: ['Level1'] });
    const err = await solveError(p, data);
    expect(err.code).toBe('unreachable');
    // Smelter → Stone Stove → Level 3 (sells Iron Ore) → Mortar → … back to Level 1; Coal adds the crusher and Level 5.
    expect(err.requiredTech).toEqual(expect.arrayContaining(['IronSmelter', 'StoneStove', 'Level3', 'StoneCrusher', 'Level5']));
    const res = await solve(data, { ...p, unlocked: ['Level1', ...err.requiredTech!] }, level0);
    expect(res.nodes.map((n) => n.id).sort()).toEqual(['Coal', 'IronIngot']);
  });

  it('node costs come from DT_SkillPoints (Crucible: 1600 copper, 129 research points, tier 3)', () => {
    expect(data.tech!.find((n) => n.id === 'Crucible')).toMatchObject({ costMoney: 1600, researchPoints: 129, stage: 3, requires: ['Level4'] });
  });
});
