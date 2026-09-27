// Reads the CUE4Parse exports (research/extracted, gitignored) into typed raw rows.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const EXTRACTED = join(ROOT, 'research/extracted');
const DT = join(EXTRACTED, 'dt/AlchemyFactory/Content/DataTables');
const BP = join(EXTRACTED, 'bp');

export interface RawText {
  TableId?: string;
  Key?: string;
}
export interface RawAsset {
  ObjectPath: string;
}
export interface RawCount {
  IngredientName: string;
  Count: number;
}
export interface RawVec {
  X: number;
  Y: number;
  Z: number;
}

export interface RawItem {
  ID: number;
  DisplayName: RawText;
  DisplayIcon: RawAsset | null;
  IngredientTags: string[];
  bHideInGame: boolean;
  MaximumStack: number;
  StockCost: RawVec;
  CostValue: RawVec;
  HeatValue: number;
  NutrientValue: number;
  NutrientSpeed: number;
  CauldronCost: number;
  IsLiquid: boolean;
  AllowPortalSupply: boolean;
  /** EEnemySellType::…; absent in hand-written test rows. */
  SellType?: string;
}

export interface RawRecipe {
  IngredientList: RawCount[];
  ProductInfo: RawCount;
  CraftType: string;
  CraftingTime: number;
  FractionNum: number;
  FailRate1: number;
  FailRate2: number;
  FailProduct1: RawCount;
  FailProduct2: RawCount;
  SideProduct: RawCount;
  bHideInGame: boolean;
  bAlternate: boolean;
  /** Product index per cycle: 0 = main, 1/2 = fail products (absent in hand-written rows). */
  ProductSequence?: number[];
  UnstableSequence?: number[];
  CatalystCost?: number;
}

export interface RawGridConfig {
  position: RawVec;
  IsFoundationGrid: boolean;
}
export interface RawSide {
  IsInput: boolean;
  IsOutput: boolean;
}
export interface RawInOut {
  IsPipeGrid: boolean;
  PipeOverrideType: string;
  position: RawVec;
  Left: RawSide;
  Right: RawSide;
  Up: RawSide;
  Bottom: RawSide;
  Vertical: { base: boolean; Top: boolean };
}
export interface RawBuilding {
  ID: number;
  DisplayName: RawText;
  DisplayIcon: RawAsset | null;
  bHideInGame: boolean;
  HeatCost: number;
  ScriptClass: RawAsset | null;
  GridConfigList: RawGridConfig[];
  VolumeList: { min: RawVec; max: RawVec; GridConfig: RawGridConfig }[];
  InOutList: RawInOut[];
  CostList: RawCount[];
  BuildingTags: string[];
}

export interface RawUnlock {
  ConfigName: string;
  ConfigType: string;
}
export interface RawSkill {
  Tier: number;
  UnlockItem: RawUnlock;
  LevelUnlockItems: string[];
  ExtraUnlockConstructions: string[];
  Deprecated: boolean;
  /** Absent in hand-written test rows. */
  Predecessors?: string[];
  /** Money vector: X gold, Y silver, Z copper. */
  UnlockCost?: RawVec;
  UnlockResearchPoints?: number;
}
export interface RawWorkbench {
  UnlockSkillName: string;
  UnlockBuilding: string;
  ExtraUnlockBuildings: string[];
}
export interface RawImprovement {
  DisplayName: RawText;
  Effects: { AttributeName: string; ModificationType: string; ModValue: number }[];
}
export interface RawPlantSeed {
  PlantName: string;
  SideProductName: string;
  GrowthSeconds: number;
  GrowthNutrientValue: number;
  GrowthNum: number;
  SideGrowthNum: number;
}
export interface RawLicense {
  LicenseType: string;
  LicenseTier: number;
  LicenseText: RawText;
  /** Improvement row applied while the licence is held; 'None' for recipe-only licences. */
  UnlockBuff: string;
}
export interface RawAttribute {
  BaseValue: number;
}

/** Blueprint components that define what a building does (from its CDO subobjects). */
export interface RawComponent {
  type: string;
  props: Record<string, unknown>;
}

export interface Raw {
  items: Record<string, RawItem>;
  recipes: Record<string, RawRecipe>;
  buildings: Record<string, RawBuilding>;
  skills: Record<string, RawSkill>;
  upgradePoints: Record<string, RawSkill>;
  workbench: Record<string, RawWorkbench>;
  improvements: Record<string, RawImprovement>;
  licenses: Record<string, RawLicense>;
  plantSeeds: Record<string, RawPlantSeed>;
  attributes: Record<string, RawAttribute>;
  /** StringTable asset path → locres namespace. */
  stringTableNamespaces: Record<string, string>;
  /** culture → namespace → key → text. */
  locres: Record<string, Record<string, Record<string, string>>>;
  /** ScriptClass object path → components of its CDO. */
  components: Record<string, RawComponent[]>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function rows<T>(table: string): Record<string, T> {
  return readJson<[{ Rows: Record<string, T> }]>(join(DT, `${table}.json`))[0].Rows;
}

/** "/Game/Blueprints/Buildings/BP_Kiln.0" → exported package file. */
export function packageFile(root: string, objectPath: string, ext: string): string {
  return join(root, 'AlchemyFactory/Content', objectPath.replace(/^\/Game\//, '').replace(/\.\d+$/, '') + ext);
}

function loadComponents(buildings: Record<string, RawBuilding>): Record<string, RawComponent[]> {
  const out: Record<string, RawComponent[]> = {};
  for (const b of Object.values(buildings)) {
    const path = b.ScriptClass?.ObjectPath;
    if (!path || out[path]) continue;
    const file = packageFile(BP, path, '.json');
    if (!existsSync(file)) continue;
    const exports = readJson<{ Type: string; Name: string; Properties?: Record<string, unknown>; SuperStruct?: { ObjectName: string } }[]>(file);
    out[path] = exports
      .filter((e) => e.Name.endsWith('_GEN_VARIABLE') || e.Type === 'BlueprintGeneratedClass')
      .map((e) => ({
        // the generated class carries the native parent (e.g. SeedPlotActor) instead of components
        type: e.Type === 'BlueprintGeneratedClass' ? `Super:${e.SuperStruct?.ObjectName ?? ''}` : e.Type,
        props: e.Properties ?? {},
      }));
  }
  return out;
}

export function loadRaw(): Raw {
  const buildings = rows<RawBuilding>('DT_Buildings');
  const stringTableNamespaces: Record<string, string> = {};
  for (const name of ['ST_Localization_Names', 'ST_Localization_Desc', 'ST_Localization_UI']) {
    const st = readJson<[{ Package: string; StringTable: { TableNamespace: string } }]>(join(DT, `${name}.json`))[0];
    stringTableNamespaces[`${st.Package}.${name}`] = st.StringTable.TableNamespace;
  }
  const locres: Raw['locres'] = {};
  for (const culture of ['en', 'ru']) locres[culture] = readJson(join(EXTRACTED, 'locres', `${culture}.json`));
  return {
    items: rows('DT_Enemies'),
    recipes: rows('DT_EnemyCrafting'),
    buildings,
    skills: rows('DT_SkillPoints'),
    upgradePoints: rows('DT_UpgradePoints'),
    workbench: rows('DT_Workbench'),
    improvements: rows('DT_Improvements'),
    licenses: rows('DT_License'),
    plantSeeds: rows('DT_PlantSeedConfig'),
    attributes: rows('DT_Attributes'),
    stringTableNamespaces,
    locres,
    components: loadComponents(buildings),
  };
}
