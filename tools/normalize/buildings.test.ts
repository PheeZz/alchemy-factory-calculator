// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildingRole, normalizeBuilding, ports } from './buildings';
import type { RawBuilding, RawInOut } from './load';

describe('buildingRole (blueprint CDO components)', () => {
  it('reads craft type and GrindingSpeed (Enhanced Grinder = 2×)', () => {
    expect(buildingRole([{ type: 'GrindFacilityComponent', props: { GrindingSpeed: 2.0, FactoryType: 'EBeltTDCraftType::Grind' } }]))
      .toEqual({ craftType: 'Grind', speedMult: 2, heater: false });
  });
  it('unset enum property = first enumerator (Table Saw)', () => {
    expect(buildingRole([{ type: 'BuildingProduceComponent', props: {} }]).craftType).toBe('TableSaw');
  });
  it('components with a C++-implied type', () => {
    expect(buildingRole([{ type: 'ExtractFacilityComponent', props: { bThermal: true } }]).craftType).toBe('Extract');
    expect(buildingRole([{ type: "Super:Class'SeedPlotActor'", props: {} }]).craftType).toBe('Plant');
  });
  it('heaters own a BuildingConsumeComponent', () => {
    expect(buildingRole([{ type: 'BuildingConsumeComponent', props: { ContainerCapacity: 2 } }])).toEqual({ craftType: null, speedMult: 1, heater: true });
  });
});

const side = (IsInput: boolean, IsOutput: boolean) => ({ IsInput, IsOutput });
const io = (r: Partial<RawInOut>): RawInOut => ({
  IsPipeGrid: false,
  PipeOverrideType: 'EPipeOverrideType::InputAndOutput',
  position: { X: 0, Y: 0, Z: 0 },
  Left: side(false, false),
  Right: side(false, false),
  Up: side(false, false),
  Bottom: side(false, false),
  Vertical: { base: false, Top: false },
  ...r,
});

describe('ports (InOutList)', () => {
  it('Alembic: belt input, pipe sides take the override direction', () => {
    expect(ports([
      io({ Left: side(true, false) }),
      io({ IsPipeGrid: true, PipeOverrideType: 'EPipeOverrideType::OnlyInput', position: { X: 0, Y: 0, Z: 1 }, Left: side(true, true) }),
      io({ IsPipeGrid: true, PipeOverrideType: 'EPipeOverrideType::OnlyOutput', position: { X: 1, Y: 0, Z: 1 }, Right: side(true, true) }),
    ])).toEqual([
      { cell: { x: 0, y: 0, z: 0 }, side: 'left', dir: 'in', pipe: false },
      { cell: { x: 0, y: 0, z: 1 }, side: 'left', dir: 'in', pipe: true },
      { cell: { x: 1, y: 0, z: 1 }, side: 'right', dir: 'out', pipe: true },
    ]);
  });
  it('Extractor: vertical pipe outlet on top', () => {
    expect(ports([io({ IsPipeGrid: true, PipeOverrideType: 'EPipeOverrideType::OnlyOutput', Vertical: { base: false, Top: true } })]))
      .toEqual([{ cell: { x: 0, y: 0, z: 0 }, side: 'top', dir: 'out', pipe: true }]);
  });
});

const building = (b: Partial<RawBuilding>): RawBuilding => ({
  ID: 1,
  DisplayName: { Key: 'Name' },
  DisplayIcon: null,
  bHideInGame: false,
  HeatCost: 0,
  ScriptClass: null,
  GridConfigList: [],
  VolumeList: [],
  InOutList: [],
  CostList: [],
  BuildingTags: [],
  ...b,
});

describe('normalizeBuilding', () => {
  it('Stone Furnace: 3×3×3 volume → 27 cells, 9 heat slots', () => {
    const b = normalizeBuilding('StoneStove', building({
      VolumeList: [{ min: { X: 0, Y: 0, Z: 0 }, max: { X: 2, Y: 2, Z: 2 }, GridConfig: { position: { X: 0, Y: 0, Z: 0 }, IsFoundationGrid: true } }],
      CostList: [{ IngredientName: 'Stone', Count: 20 }],
    }), { craftType: null, speedMult: 1, heater: true }, null);
    expect(b.footprint.cells).toHaveLength(27);
    expect(b.heatSlots).toBe(9);
    expect(b.category).toBe('heating');
    expect(b.buildCost).toEqual([{ item: 'Stone', qty: 20 }]);
  });
  it('Crucible: heated machine occupies its foundation cells', () => {
    const cell = (X: number) => ({ position: { X, Y: 0, Z: 0 }, IsFoundationGrid: true });
    const b = normalizeBuilding('Crucible', building({ HeatCost: 4, GridConfigList: [cell(0), cell(1)] }), { craftType: 'Calcinate', speedMult: 1, heater: false }, null);
    expect(b).toMatchObject({ heatCost: 4, heatSlots: null, heatSlotsRequired: 2, category: 'production' });
  });
});
