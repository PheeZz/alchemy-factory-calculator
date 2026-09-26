// `pnpm data`: research/extracted (CUE4Parse exports) → public/data/<build>, public/icons/<build>, report.
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Building, GameData, Item, Recipe } from '../../src/shared/data/types';
import { buildingRole, normalizeBuilding, type BuildingRole } from './buildings';
import { iconJob, writeIcons, type IconJob } from './icons';
import { markRaw, normalizeItem, reachable } from './items';
import { loadRaw, ROOT, type RawText } from './load';
import { buildLocales, disambiguate } from './locale';
import { normalizeRecipe, nurseryRecipe, paradoxRecipe } from './recipes';
import { writeReport } from './report';
import { latest, unlockIndex } from './unlocks';
import { upgradeTracks } from './upgrades';

const BUILD = { id: '25321648', version: '1.0.4962' };
const MAX_BYTES = 500 * 1024;
// ponytail: stage → building is C++ logic; matches starfi5h (Mini tree = leaves only, Nursery = leaves + core)
const TREE_STAGE_BUILDING: Record<string, string> = { TreeStage2: 'MiniWorldTree', TreeStage3: 'WorldTreeNursery' };

/** Sorted keys + 6 significant digits keep the output byte-stable across runs. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === 'number' && !Number.isInteger(v)) return Number(v.toPrecision(6));
    if (v && typeof v === 'object' && !Array.isArray(v))
      return Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    return v;
  });
}

async function main() {
  const raw = loadRaw();
  const unlocks = unlockIndex(raw.skills, raw.workbench);

  const roles: Record<string, BuildingRole> = {};
  for (const [id, b] of Object.entries(raw.buildings)) roles[id] = buildingRole(raw.components[b.ScriptClass?.ObjectPath ?? ''] ?? []);
  // default (first) building = base machine: slowest speed, then lowest game ID
  const buildingsFor = (craftType: string) =>
    Object.entries(raw.buildings)
      .filter(([id, b]) => !b.bHideInGame && roles[id]!.craftType === craftType)
      .sort(([a, x], [b, y]) => roles[a]!.speedMult - roles[b]!.speedMult || x.ID - y.ID)
      .map(([id]) => id);

  let recipes: Recipe[] = Object.entries(raw.recipes).map(([id, row]) =>
    normalizeRecipe(id, row, {
      items: raw.items,
      buildingsFor,
      unlockedBy: (rid, bs) => unlocks.recipe(rid) ?? (bs[0] ? unlocks.building(bs[0]) : undefined) ?? null,
    }),
  );
  for (const [seedRow, seed] of Object.entries(raw.plantSeeds)) {
    if (seed.PlantName === 'None') continue;
    const tree = TREE_STAGE_BUILDING[seedRow];
    if (seedRow.startsWith('TreeStage') && !tree) continue;
    const bs = tree ? [tree] : buildingsFor('Nursery');
    recipes.push(nurseryRecipe(seedRow, seed, bs, raw.items, latest(unlocks, [unlocks.building(bs[0]!), unlocks.item(seedRow)])));
  }

  // a row pointing at a missing DT_Enemies item cannot be referenced safely (hidden Sulfur_Alt → "Sulfur_Alt")
  const dropped = recipes.filter((r) => [...r.inputs, ...r.outputs].some((s) => !raw.items[s.item])).map((r) => r.id);
  recipes = recipes.filter((r) => !dropped.includes(r.id));

  const usedBuildings = new Set(recipes.flatMap((r) => r.buildings));
  for (const [id, role] of Object.entries(roles)) if (role.heater && !raw.buildings[id]!.bHideInGame) usedBuildings.add(id);
  // bHideInGame on items only hides them from the encyclopedia (Sand2…Sand8 are real), so drop just the unreferenced ones
  const referenced = new Set([
    ...recipes.flatMap((r) => [...r.inputs, ...r.outputs].map((s) => s.item)),
    ...[...usedBuildings].flatMap((id) => raw.buildings[id]!.CostList.map((c) => c.IngredientName)),
  ]);

  const iconJobs: IconJob[] = [];
  const items: Record<string, Item> = {};
  for (const [id, r] of Object.entries(raw.items)) {
    if (r.bHideInGame && !referenced.has(id)) continue;
    const job = iconJob(BUILD.id, 'items', id, r.DisplayIcon);
    if (job) iconJobs.push(job);
    items[id] = normalizeItem(id, r, job?.publicPath ?? null);
  }
  markRaw(items, recipes);

  // Paradox Crucible: any item the factory can already reach melts into Mors, except inputs the
  // DT rows special-case on this machine (Mors → Vitae, Vitae → Mors_Alt)
  const loopLocked = Object.keys(items).filter((id) => !reachable(items, recipes).has(id)).sort();
  const paradox = buildingsFor('Paradox');
  const specialCased = new Set(recipes.filter((r) => r.buildings.includes(paradox[0]!)).flatMap((r) => r.inputs.map((s) => s.item)));
  const paradoxInputs = [...reachable(items, recipes)]
    .filter((id) => !specialCased.has(id) && !raw.items[id]!.IsLiquid && raw.items[id]!.CauldronCost > 0)
    .sort();
  const paradoxUnlock = unlocks.building(paradox[0]!) ?? null;
  recipes.push(...paradoxInputs.map((id) => paradoxRecipe(id, raw.items, paradox, paradoxUnlock)));
  markRaw(items, recipes);
  const canReach = reachable(items, recipes);
  const unreachable = Object.keys(items).filter((id) => !canReach.has(id)).sort();

  const buildings: Record<string, Building> = {};
  for (const id of usedBuildings) {
    const b = raw.buildings[id]!;
    const job = iconJob(BUILD.id, 'buildings', id, b.DisplayIcon);
    if (job) iconJobs.push(job);
    buildings[id] = normalizeBuilding(id, b, roles[id]!, job?.publicPath ?? null);
  }

  const upgrades = upgradeTracks(raw.upgradePoints, raw.improvements, raw.attributes);
  const data: GameData = {
    build: BUILD,
    items,
    recipes: Object.fromEntries(recipes.map((r) => [r.id, r])),
    buildings,
    upgrades,
    constants: { baseBeltSpeed: raw.attributes.ConveyerSpeed!.BaseValue },
  };

  const texts: RawText[] = [
    ...Object.keys(items).map((id) => raw.items[id]!.DisplayName),
    ...Object.keys(buildings).map((id) => raw.buildings[id]!.DisplayName),
    ...Object.values(raw.improvements).map((i) => i.DisplayName).filter((t) => upgrades.some((u) => u.nameKey === t.Key)),
  ];
  const { locales, missing } = buildLocales(texts, raw, ['ru', 'en']);
  // same display text on different items (Sand2…Sand7 "Refined Sand") → derived numbered keys
  const renamed = new Map([
    ...disambiguate(Object.values(items).map((i) => ({ id: i.id, nameKey: i.nameKey, order: raw.items[i.id]!.ID })), locales),
    ...disambiguate(Object.values(buildings).map((b) => ({ id: b.id, nameKey: b.nameKey, order: raw.buildings[b.id]!.ID })), locales),
  ]);
  for (const i of Object.values(items)) i.nameKey = renamed.get(i.id) ?? i.nameKey;
  for (const b of Object.values(buildings)) b.nameKey = renamed.get(b.id) ?? b.nameKey;
  // a recipe is named after its main product
  for (const r of recipes) r.nameKey = items[r.outputs[0]!.item]!.nameKey;

  const outDir = join(ROOT, 'public/data', BUILD.id);
  mkdirSync(outDir, { recursive: true });
  const gamedataPath = join(outDir, 'gamedata.json');
  writeFileSync(gamedataPath, stableJson(data));
  for (const [culture, locale] of Object.entries(locales)) writeFileSync(join(outDir, `locale.${culture}.json`), stableJson(locale));
  await writeIcons(BUILD.id, iconJobs);

  const bytes = statSync(gamedataPath).size;
  const referencedIcons = Object.keys(items).filter((id) => raw.items[id]!.DisplayIcon).length +
    [...usedBuildings].filter((id) => raw.buildings[id]!.DisplayIcon).length;
  const unexplained = writeReport({ data, locales, missing, raw, bytes, dropped, renamed, unreachable, loopLocked, icons: { produced: iconJobs.length, referenced: referencedIcons } });
  console.log(
    `gamedata.json ${(bytes / 1024).toFixed(1)} KB · items ${Object.keys(items).length} · recipes ${recipes.length} · buildings ${usedBuildings.size} · icons ${iconJobs.length}/${referencedIcons} · missing ru ${missing.ru!.length} en ${missing.en!.length}`,
  );
  if (bytes > MAX_BYTES) throw new Error(`gamedata.json ${bytes} B exceeds ${MAX_BYTES} B`);
  if (unexplained > 0) throw new Error(`${unexplained} unexplained oracle diffs — see research/05-normalize-report.md`);
}

await main();
