import type { Building, BuildingCategory, Cell, Port, Stack } from '../../src/shared/data/types';
import type { RawBuilding, RawComponent, RawGridConfig, RawInOut } from './load';

/** What a building can run, read from its blueprint components. */
export interface BuildingRole {
  craftType: string | null;
  speedMult: number;
  heater: boolean;
}

// These native components hard-code their craft type in C++ (no FactoryType property on the CDO).
const IMPLIED_CRAFT_TYPE: Record<string, string> = {
  ExtractFacilityComponent: 'Extract',
  ParadoxFacilityComponent: 'Paradox',
  CauldronFacilityComponent: 'Cauldron',
  NurseryFacilityComponent: 'Nursery',
  TreeNurseryFacilityComponent: 'TreeNursery',
  'Super:Class\'SeedPlotActor\'': 'Plant',
};
const ENUM_CRAFT_TYPE: Record<string, string> = {
  BuildingProduceComponent: 'FactoryType',
  GrindFacilityComponent: 'FactoryType',
  CraftFacilityComponent: 'FactoryCraftType',
};

const enumTail = (v: unknown) => String(v).split('::')[1] ?? String(v);

export function buildingRole(components: RawComponent[]): BuildingRole {
  let craftType: string | null = null;
  let speedMult = 1;
  let heater = false;
  for (const c of components) {
    const enumProp = ENUM_CRAFT_TYPE[c.type];
    // an unset enum property is serialized away: UE default is the first enumerator (TableSaw)
    if (enumProp) craftType = c.props[enumProp] === undefined ? 'TableSaw' : enumTail(c.props[enumProp]);
    craftType ??= IMPLIED_CRAFT_TYPE[c.type] ?? null;
    if (typeof c.props.GrindingSpeed === 'number') speedMult = c.props.GrindingSpeed;
    if (c.type === 'BuildingConsumeComponent') heater = true;
  }
  return { craftType, speedMult, heater };
}

type Key = `${number},${number},${number}`;

/** GridConfigList cells plus VolumeList boxes (inclusive min..max). */
function gridCells(b: Pick<RawBuilding, 'GridConfigList' | 'VolumeList'>): Map<Key, RawGridConfig & { cell: Cell }> {
  const out = new Map<Key, RawGridConfig & { cell: Cell }>();
  const put = (x: number, y: number, z: number, g: RawGridConfig) => out.set(`${x},${y},${z}`, { ...g, cell: { x, y, z } });
  for (const g of b.GridConfigList) put(g.position.X, g.position.Y, g.position.Z, g);
  for (const v of b.VolumeList)
    for (let x = v.min.X; x <= v.max.X; x++)
      for (let y = v.min.Y; y <= v.max.Y; y++)
        for (let z = v.min.Z; z <= v.max.Z; z++) put(x, y, z, v.GridConfig);
  return out;
}

function portDir(io: RawInOut, side: { IsInput: boolean; IsOutput: boolean } | null): Port['dir'] {
  if (io.PipeOverrideType.endsWith('OnlyInput')) return 'in';
  if (io.PipeOverrideType.endsWith('OnlyOutput')) return 'out';
  if (!side || (side.IsInput && side.IsOutput)) return 'both';
  return side.IsInput ? 'in' : 'out';
}

export function ports(list: RawInOut[]): Port[] {
  const out: Port[] = [];
  for (const io of list) {
    const cell = { x: io.position.X, y: io.position.Y, z: io.position.Z };
    const pipe = io.IsPipeGrid;
    for (const [key, side] of [['Left', 'left'], ['Right', 'right'], ['Up', 'up'], ['Bottom', 'bottom']] as const) {
      const s = io[key];
      if (s.IsInput || s.IsOutput) out.push({ cell, side, dir: portDir(io, s), pipe });
    }
    if (io.Vertical.Top) out.push({ cell, side: 'top', dir: portDir(io, null), pipe });
    if (io.Vertical.base) out.push({ cell, side: 'base', dir: portDir(io, null), pipe });
  }
  return out;
}

function category(b: RawBuilding, role: BuildingRole): BuildingCategory {
  if (role.heater) return 'heating';
  if (role.craftType === 'Plant' || role.craftType === 'Nursery' || role.craftType === 'TreeNursery') return 'farming';
  if (role.craftType) return 'production';
  return b.BuildingTags.some((t) => t.startsWith('Building.Logistics')) ? 'logistics' : 'other';
}

export function normalizeBuilding(id: string, b: RawBuilding, role: BuildingRole, icon: string | null): Building {
  const cells = [...gridCells(b).values()];
  const bottomZ = Math.min(...cells.map((c) => c.cell.z));
  const base = cells.filter((c) => c.cell.z === bottomZ);
  const heated = b.HeatCost > 0;
  return {
    id,
    nameKey: b.DisplayName.Key ?? id,
    icon,
    category: category(b, role),
    speedMult: role.speedMult,
    heatCost: b.HeatCost,
    // heater slots = its top surface; starfi5h's 9/42/9 for Stone/Blast furnace/Steam pad match this
    heatSlots: role.heater ? base.length : null,
    // ponytail: foundation cells on the heater; the game's real packing rule is C++ (see report), revisit if furnace counts matter
    heatSlotsRequired: heated ? base.filter((c) => c.IsFoundationGrid).length : 0,
    buildCost: b.CostList.map((c): Stack => ({ item: c.IngredientName, qty: c.Count })),
    // CostList holds only items in this build; coins are items too (GoldCoin), so no separate currency
    buildCostMoney: 0,
    footprint: { cells: cells.map((c) => c.cell).sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x) },
    ports: ports(b.InOutList),
  };
}
