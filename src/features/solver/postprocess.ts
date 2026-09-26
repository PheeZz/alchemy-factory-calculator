import type { Building, BuildingId, GameData, ItemId, Port, Stack } from '@/shared/data/types';
import type { Multipliers } from '@/features/upgrades/multipliers';
import type { Model, ModelRecipe } from './model';
import { clean, type LpValues } from './build-lp';
import type { PortWarning, SolveEdge, SolveNode, SolveResult } from './types';

const EPS = 1e-9;

/** ceil that forgives float noise: 3.0000000001 machines are 3. */
const ceil = (v: number) => Math.ceil(v * (1 - EPS) - EPS);

function sumInto(map: Map<string, number>, key: string, v: number) {
  if (v > 0) map.set(key, (map.get(key) ?? 0) + v);
}

const toStacks = (map: Map<ItemId, number>): Stack[] => [...map].map(([item, qty]) => ({ item, qty }));

/** Liquids travel through pipes (no belt cap), so only solid ports count. */
function solidPorts(building: Building, dir: Port['dir']): number {
  return building.ports.filter((p) => !p.pipe && (p.dir === dir || p.dir === 'both')).length || 1;
}

/** Items on one side share the side's solid ports; the warning names the heaviest item. */
function portWarnings(data: GameData, m: ModelRecipe, x: number, machines: number, beltSpeed: number): PortWarning[] {
  const warnings: PortWarning[] = [];
  const check = (stacks: Stack[], dir: Port['dir']) => {
    const perItem = new Map<ItemId, number>();
    for (const s of stacks) if (!data.items[s.item]?.liquid) sumInto(perItem, s.item, s.qty * x);
    let total = 0;
    let heaviest: ItemId | undefined;
    for (const [item, rate] of perItem) {
      total += rate;
      if (heaviest === undefined || rate > perItem.get(heaviest)!) heaviest = item;
    }
    const perMachine = total / machines / solidPorts(m.building, dir);
    if (heaviest !== undefined && perMachine > beltSpeed + EPS) warnings.push({ item: heaviest, perMachine, beltSpeed });
  };
  check(m.inputs, 'in');
  check(m.outputs, 'out');
  return warnings;
}

export function postprocess(data: GameData, model: Model, v: LpValues, mult: Multipliers): SolveResult {
  const beltSpeed = mult.beltSpeed;
  const nodes: SolveNode[] = [];
  const active: [ModelRecipe, number][] = [];
  const buildCost = new Map<ItemId, number>();
  const machinesBy = new Map<BuildingId, number>();
  let buildCostMoney = 0;
  let heatPerSec = 0;

  model.recipes.forEach((m, r) => {
    const x = v.x[r]!;
    if (x <= 0) return;
    active.push([m, x]);
    const machinesExact = x * m.machinesPerBatch;
    const machines = Math.max(1, ceil(machinesExact));
    const node: SolveNode = {
      id: m.recipe.id,
      recipe: m.recipe.id,
      building: m.building.id,
      batchesPerMin: x,
      machinesExact,
      machines,
      utilization: machinesExact / machines,
      portWarnings: portWarnings(data, m, x, machines, beltSpeed),
    };
    if (m.fuel) node.fuel = { item: m.fuel.item, rate: clean(m.fuel.qty * x) };
    if (m.fertilizer) node.fertilizer = { item: m.fertilizer.item, rate: clean(m.fertilizer.qty * x) };
    if (m.catalyst) node.catalyst = { item: m.catalyst.item, rate: clean(m.catalyst.qty * x) };
    nodes.push(node);

    heatPerSec += (x * m.heatPerBatch) / 60;
    buildCostMoney += m.building.buildCostMoney * machines;
    sumInto(machinesBy, m.building.id, machines);
    for (const s of m.building.buildCost) sumInto(buildCost, s.item, s.qty * machines);

    if (m.heater) {
      const heatSlots = m.heater.heatSlots ?? 0;
      const perHeater = Math.floor(heatSlots / Math.max(m.building.heatSlotsRequired, 1));
      if (perHeater > 0) {
        const count = Math.ceil(machines / perHeater);
        node.heater = { building: m.heater.id, countExact: machinesExact / perHeater, count };
        sumInto(machinesBy, m.heater.id, count);
        buildCostMoney += m.heater.buildCostMoney * count;
        for (const s of m.heater.buildCost) sumInto(buildCost, s.item, s.qty * count);
      } else {
        node.heaterWarning = { building: m.heater.id, slotsRequired: m.building.heatSlotsRequired, heatSlots };
      }
    }
  });

  const edges: SolveEdge[] = [];
  for (const item of model.items) {
    const producers = new Map<string, number>();
    const consumers = new Map<string, number>();
    for (const [m, x] of active) {
      const id = m.recipe.id;
      for (const o of m.outputs) if (o.item === item) sumInto(producers, id, o.qty * x);
      for (const s of m.inputs) if (s.item === item) sumInto(consumers, id, s.qty * x);
      if (m.fuel?.item === item) sumInto(consumers, id, m.fuel.qty * x);
      if (m.fertilizer?.item === item) sumInto(consumers, id, m.fertilizer.qty * x);
    }
    sumInto(producers, `import:${item}`, v.imp.get(item) ?? 0);
    sumInto(consumers, `target:${item}`, (model.targets.get(item) ?? 0) + (item === model.maximize ? v.out : 0));
    sumInto(consumers, `surplus:${item}`, v.sur.get(item) ?? 0);

    const liquid = data.items[item]?.liquid === true;
    // Proportional split: each consumer draws from every producer by that producer's share.
    let total = 0;
    for (const p of producers.values()) total += p;
    if (total <= 0) continue;
    for (const [from, p] of producers) {
      for (const [to, c] of consumers) {
        const perMin = clean((p * c) / total);
        if (perMin > 0) edges.push({ from, to, item, perMin, belts: liquid ? 0 : Math.max(1, ceil(perMin / beltSpeed)) });
      }
    }
  }

  const raw = new Map<ItemId, number>();
  const imports = new Map<ItemId, number>();
  let rawMoneyPerMin = 0;
  for (const [item, qty] of v.imp) {
    const it = data.items[item]!;
    if (it.raw) {
      raw.set(item, qty);
      rawMoneyPerMin += qty * (it.buyPrice ?? it.value);
    } else imports.set(item, qty);
  }
  const sideOutputs = new Set(active.flatMap(([m]) => m.recipe.outputs.slice(1).map((o) => o.item)));
  const surplus = toStacks(v.sur);

  return {
    nodes,
    edges,
    totals: {
      raw: toStacks(raw),
      imports: toStacks(imports),
      surplus,
      byproducts: surplus.filter((s) => sideOutputs.has(s.item)),
      buildCost: toStacks(buildCost),
      buildCostMoney,
      rawMoneyPerMin,
      machines: [...machinesBy].map(([building, count]) => ({ building, count })),
      heatPerSec: clean(heatPerSec),
    },
    beltSpeed,
  };
}
