// Cross-checks the normalized data against community oracles and writes research/05-normalize-report.md.
// Oracles live in research/raw (gitignored): missing ones are skipped, never copied into the output.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import type { GameData, GameLocale, Recipe, UpgradeTrackId } from '../../src/shared/data/types';
import { fractionsOf } from './recipes';
import { ROOT, type Raw, type RawRecipe } from './load';

const RAW_ORACLES = join(ROOT, 'research/raw');
const REPORT = join(ROOT, 'research/05-normalize-report.md');
const TOLERANCE = 1e-3;
const ANY_MACHINE = '*';

/** Community formulas (alchemyfactorytools / starfi5h) the game data is checked against. */
export const COMMUNITY_FORMULAS: Record<UpgradeTrackId, (l: number) => number> = {
  conveyor: (l) => 60 + 15 * Math.min(l, 12) + 3 * Math.max(l - 12, 0),
  factorySpeed: (l) => 1 + 0.25 * Math.min(l, 12) + 0.05 * Math.max(l - 12, 0),
  alchemySkill: (l) => 1 + Array.from({ length: l }, (_, i) => (i < 2 ? 6 : i < 8 ? 8 : 10)).reduce((a, b) => a + b, 0) / 100,
  fuelEfficiency: (l) => 1 + 0.1 * l,
  fertilizerEfficiency: (l) => 1 + 0.1 * l,
};

type DiffClass = 'game' | 'code' | 'bug';
interface OracleRecipe {
  id: string;
  machine: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  time?: number;
  nutrientCost?: number;
}
interface Diff {
  source: string;
  recipe: string;
  kind: 'absent' | 'machine' | 'rates' | 'nutrient' | 'oracle-only';
  detail: string;
  cls?: DiffClass;
  note?: string;
}

const CLASS_LABEL: Record<DiffClass, string> = {
  game: 'game confirms us',
  code: 'formula lives in game code',
  bug: 'NORMALIZER BUG',
};

// Hand-reviewed explanations: recipe (or oracle recipe id for oracle-only rows) → why it differs.
const EXPLAINED: Record<string, Record<string, [DiffClass, string]>> = {
  starfi5h: {
    Sand8: ['game', 'starfi5h collapses Sand→Sand2…Sand8→Shard1 into one "Refined Sand" row (128 Sand → 1 Crude Shard, 381 s = 127 refiner batches); the game has 7 separate 2→1 rows'],
    Sand2: ['game', 'see Sand8: starfi5h has no per-step Refined Sand rows'],
    Sand3: ['game', 'see Sand8'],
    Sand4: ['game', 'see Sand8'],
    Sand5: ['game', 'see Sand8'],
    Sand6: ['game', 'see Sand8'],
    Shard1: ['game', 'see Sand8 (starfi5h 128 Sand → 1 Crude Shard is the same chain collapsed)'],
    Nursery_TreeStage3: ['game', 'starfi5h 5 970 000 nutrients per 99 Leaf + 1 Core; game TreeStage3 GrowthNutrientValue 60 000 × (99 + 1) = 6 000 000 (0.5 %)'],
    Nursery_TreeStage2: ['code', 'Mini World Tree: starfi5h 30 000 nutrients / Leaf, game TreeStage2 30 000 / Leaf; the stage → building pairing is C++ (see open questions)'],
    'World Tree_Mini': ['code', 'see Nursery_TreeStage2'],
    'Gentian_Mixture': ['code', 'starfi5h virtual item "Gentian Mixture" (not in game data)'],
    'Seed Plot (Gentian_Mixture)': ['code', 'starfi5h virtual item "Gentian Mixture"'],
    'Unstable Catalyst (Gentian Mixture)': ['code', 'starfi5h virtual Cauldron row with a virtual item'],
    'Steam Boiler (High)': ['code', 'Steam Boiler output is C++ (SteamBoilerComponent has no data); no DT row, not generated'],
    'Refined Sand': ['game', 'collapsed chain, see Sand8'],
    MoonlitSoap: ['game', 'DT CraftType Blend → Blender (faultyd3v row identical); starfi5h/joejoesgit put it on the Advanced Blender'],
    Mors_Alt: ['code', 'DT row Vitae → Mors (5 s); starfi5h\'s generic "Custom" row has no input — its concrete inputs are our Paradox_<item> rows'],
    Ruby_Alt: ['game', 'DT row uses Pure Gold Dust (GoldDust5), starfi5h Gold Dust (GoldDust3); special cauldron row anyway (output chosen by ingredient value in C++)'],
  },
  joejoesgit: {},
  faultyd3v: {},
};

// Oracle machines that are not buildings with recipes in the game tables.
const PSEUDO_MACHINES: Record<string, string> = {
  'Purchasing Portal': 'buying raw items = Item.buyPrice, not a recipe',
  'Bank Portal': 'money ↔ coin exchange, not a DT_EnemyCrafting row',
  'Cash Register': 'pre-1.0 coin stacking helper, not a game recipe',
};

function evalDb(file: string): { recipes: OracleRecipe[]; machines: Record<string, Record<string, unknown>> } | null {
  if (!existsSync(file)) return null;
  const ctx = { window: {} as { ALCHEMY_DB?: { recipes: Record<string, unknown>[]; machines: Record<string, Record<string, unknown>> } } };
  vm.runInNewContext(readFileSync(file, 'utf8'), ctx);
  const db = ctx.window.ALCHEMY_DB;
  if (!db) return null;
  return {
    machines: db.machines,
    recipes: db.recipes.map((r) => ({
      id: String(r.id),
      machine: String(r.machine),
      inputs: (r.inputs ?? {}) as Record<string, number>,
      outputs: (r.outputs ?? {}) as Record<string, number>,
      time: typeof r.baseTime === 'number' ? r.baseTime : undefined,
      nutrientCost: typeof r.nutrientCost === 'number' ? r.nutrientCost : undefined,
    })),
  };
}

interface FaultyRow {
  craftIdName: string;
  ingredientList: { name: string; qty: number }[];
  productInfo: { name: string; qty: number };
  craftType: number;
  craftTime: number;
  fractionNum: number;
  failRate1: number;
  failRate2: number;
  failProduct1: { name: string; qty: number };
  failProduct2: { name: string; qty: number };
  sideProduct: { name: string; qty: number };
}

interface FaultySeed {
  id: string;
  growthNutrientValue: number;
  product: { name: string; qty: number };
  sideProduct: { name: string; qty: number };
}

/** faultyd3v's stated rule applied literally: every Count × FractionNum, time × FractionNum. */
function faultyOracle(): { recipes: OracleRecipe[]; rows: Record<string, FaultyRow> } | null {
  const dir = join(RAW_ORACLES, 'faultyd3v-AlchemyFactoryData');
  if (!existsSync(join(dir, 'crafting.json'))) return null;
  const rows = JSON.parse(readFileSync(join(dir, 'crafting.json'), 'utf8')) as FaultyRow[];
  const types = JSON.parse(readFileSync(join(dir, 'machine_types.json'), 'utf8')) as Record<string, string>;
  const recipes = rows.map((r): OracleRecipe => {
    const n = r.fractionNum;
    const fail = r.failRate1 + r.failRate2;
    const outputs: Record<string, number> = { [r.productInfo.name]: r.productInfo.qty * n * (1 - fail) };
    for (const [p, rate] of [[r.failProduct1, r.failRate1], [r.failProduct2, r.failRate2]] as const)
      if (rate > 0 && p.name !== 'None') outputs[p.name] = (outputs[p.name] ?? 0) + p.qty * n * rate;
    if (r.sideProduct.name !== 'None') outputs[r.sideProduct.name] = (outputs[r.sideProduct.name] ?? 0) + r.sideProduct.qty * n;
    return {
      id: r.craftIdName,
      machine: types[String(r.craftType)] ?? String(r.craftType),
      inputs: Object.fromEntries(r.ingredientList.filter((i) => i.qty > 0).map((i) => [i.name, i.qty * n])),
      outputs,
      time: r.craftTime * n,
    };
  });
  const seeds = JSON.parse(readFileSync(join(dir, 'plantseeds.json'), 'utf8')) as FaultySeed[];
  for (const s of seeds) {
    if (s.product.name === 'None') continue;
    const outputs: Record<string, number> = { [s.product.name]: s.product.qty };
    if (s.sideProduct.name !== 'None') outputs[s.sideProduct.name] = s.sideProduct.qty;
    const units = s.product.qty + (s.sideProduct.name !== 'None' ? s.sideProduct.qty : 0);
    // the stage → building pairing is not in faultyd3v either
    recipes.push({ id: `Nursery_${s.id}`, machine: s.id.startsWith('TreeStage') ? ANY_MACHINE : 'Nursery', inputs: {}, outputs, nutrientCost: s.growthNutrientValue * units });
  }
  return { recipes, rows: Object.fromEntries(rows.map((r) => [r.craftIdName, r])) };
}

type Rates = Map<string, number>;

function ourRates(r: Recipe, speed: number): Rates {
  const m: Rates = new Map();
  for (const s of r.inputs) m.set(s.item, (m.get(s.item) ?? 0) - (s.qty * speed) / r.timeSec);
  for (const s of r.outputs) m.set(s.item, (m.get(s.item) ?? 0) + (s.qty * speed) / r.timeSec);
  return m;
}

function oracleRates(o: OracleRecipe, toId: (name: string) => string, time: number): Rates {
  const m: Rates = new Map();
  for (const [n, q] of Object.entries(o.inputs)) m.set(toId(n), (m.get(toId(n)) ?? 0) - q / time);
  for (const [n, q] of Object.entries(o.outputs)) m.set(toId(n), (m.get(toId(n)) ?? 0) + q / time);
  return m;
}

const fmt = (x: number) => Number(x.toPrecision(4)).toString();

function diffRates(ours: Rates, theirs: Rates): string[] {
  const out: string[] = [];
  for (const item of new Set([...ours.keys(), ...theirs.keys()])) {
    const a = ours.get(item) ?? 0;
    const b = theirs.get(item) ?? 0;
    if (Math.abs(a - b) > TOLERANCE * Math.max(Math.abs(a), Math.abs(b))) out.push(`${item} ${fmt(a * 60)} vs ${fmt(b * 60)}/min`);
  }
  return out;
}

interface Names {
  item: (name: string) => string;
  building: (name: string) => string | undefined;
}

function nameMaps(data: GameData, en: GameLocale): Names {
  const items = new Map<string, string>();
  for (const [id, i] of Object.entries(data.items)) if (!items.has(en[i.nameKey] ?? id)) items.set(en[i.nameKey] ?? id, id);
  const buildings = new Map<string, string>();
  for (const [id, b] of Object.entries(data.buildings)) buildings.set(en[b.nameKey] ?? id, id);
  // oracle spellings that differ from the game's en strings
  const itemAlias: Record<string, string> = { 'Salt Water': 'SaltWater' };
  const buildingAlias: Record<string, string> = { Planting: 'SeedPlot', LiquidTap: 'BrewBarrel' };
  return {
    item: (n) => itemAlias[n] ?? items.get(n.replace(/ˈ/g, "'")) ?? data.items[n]?.id ?? `?${n}`,
    building: (n) => buildingAlias[n] ?? buildings.get(n),
  };
}

/** Compares every normalized recipe with an oracle's recipes that produce its main product. */
function compareOracle(source: string, oracle: OracleRecipe[], data: GameData, names: Names, matchById: boolean): Diff[] {
  const diffs: Diff[] = [];
  const matched = new Set<OracleRecipe>();
  for (const r of Object.values(data.recipes)) {
    const main = r.outputs[0]!.item;
    const candidates = oracle.filter((o) => (matchById ? o.id === r.id : Object.keys(o.outputs).some((n) => names.item(n) === main)));
    let best: { o: OracleRecipe; problems: string[]; kind: Diff['kind'] } | null = null;
    let exact = false;
    for (const o of candidates) {
      const machine = names.building(o.machine);
      const onOurMachine = o.machine === ANY_MACHINE || (machine !== undefined && r.buildings.includes(machine));
      let problems: string[];
      let kind: Diff['kind'] = 'rates';
      if (r.nutrientPerBatch !== null || o.nutrientCost !== undefined) {
        // nursery time is fertilizer-bound: compare nutrients per produced unit only
        kind = 'nutrient';
        const ours = (r.nutrientPerBatch ?? 0) / r.outputs.reduce((s, x) => s + x.qty, 0);
        const theirs = (o.nutrientCost ?? 0) / Object.values(o.outputs).reduce((s, x) => s + x, 0);
        problems = Math.abs(ours - theirs) > TOLERANCE * Math.max(ours, theirs) ? [`nutrient/unit ${fmt(ours)} vs ${fmt(theirs)}`] : [];
      } else if (o.time === undefined || o.time <= 0) {
        problems = ['oracle has no time'];
      } else {
        const speed = machine ? (data.buildings[machine]?.speedMult ?? 1) : 1;
        problems = diffRates(ourRates(r, speed), oracleRates(o, names.item, o.time));
      }
      if (!onOurMachine) {
        problems = [`machine ${o.machine} ∉ [${r.buildings.join(', ')}]`, ...problems];
        kind = 'machine';
      }
      if (problems.length === 0) {
        exact = true;
        matched.add(o);
        break;
      }
      if (!best || (onOurMachine && best.kind === 'machine') || (best.kind === kind && problems.length < best.problems.length)) best = { o, problems, kind };
    }
    if (candidates.length === 0) diffs.push({ source, recipe: r.id, kind: 'absent', detail: 'no oracle recipe for this product' });
    else if (best && !exact) {
      matched.add(best.o);
      diffs.push({ source, recipe: r.id, kind: best.kind, detail: `vs "${best.o.id}" (${best.o.machine}): ${best.problems.join('; ')}` });
    }
  }
  for (const o of oracle) {
    if (matched.has(o)) continue;
    const covered = Object.values(data.recipes).some((r) =>
      matchById ? r.id === o.id : Object.keys(o.outputs).some((n) => names.item(n) === r.outputs[0]!.item) && r.buildings.includes(names.building(o.machine) ?? ''),
    );
    if (!covered) diffs.push({ source, recipe: o.id, kind: 'oracle-only', detail: `${o.machine}: ${Object.entries(o.inputs).map(([k, v]) => `${v} ${k}`).join(' + ') || '∅'} → ${Object.entries(o.outputs).map(([k, v]) => `${v} ${k}`).join(' + ')}` });
  }
  return diffs;
}

const involvesFractional = (row: RawRecipe | undefined, raw: Raw) =>
  !!row && [...row.IngredientList, row.ProductInfo].some((c) => fractionsOf(raw.items[c.IngredientName]) > 1);

/** Auto-rules first, then the hand-reviewed table; whatever is left stays unexplained. */
function classify(d: Diff, data: GameData, raw: Raw, dropped: string[] = []): Diff {
  const recipe = data.recipes[d.recipe];
  const row = raw.recipes[d.recipe];
  const manual = EXPLAINED[d.source]?.[d.recipe];
  if (manual) return { ...d, cls: manual[0], note: manual[1] };
  if (recipe?.hidden)
    return { ...d, cls: 'game', note: 'bHideInGame row (placeholder for a fail product or cut content), not obtainable in 1.0' };
  if (d.kind === 'oracle-only' && dropped.includes(d.recipe))
    return { ...d, cls: 'game', note: 'hidden row whose product item does not exist in DT_Enemies; dropped by the normalizer' };
  // compared rows differ in input: oracles list only a few Paradox inputs (starfi5h computes the rest with the same formula)
  if (d.recipe.startsWith('Paradox_') && !d.detail.includes(`(${d.recipe.slice('Paradox_'.length)})`))
    return { ...d, cls: 'code', note: 'generated Paradox Crucible input (C++ "any item → Oblivion Essence"); the oracle has no row for this input' };
  if (d.source === 'faultyd3v' && involvesFractional(row, raw))
    return { ...d, cls: 'game', note: 'fractional item (MaximumStack < 0): Counts are 1/|MaximumStack| parts; starfi5h agrees with us' };
  if (d.kind === 'oracle-only') {
    const machine = d.detail.split(':')[0]!;
    if (PSEUDO_MACHINES[machine]) return { ...d, cls: 'code', note: PSEUDO_MACHINES[machine] };
    if (machine === 'Enhanced Grinder' || machine === 'Thermal Extractor')
      return { ...d, cls: 'game', note: `covered: our Grind/Extract recipes list ${machine} as a second building (speedMult from GrindingSpeed)` };
    if (machine === 'Advanced Athanor')
      return { ...d, cls: 'code', note: 'Advanced Athanor running Athanor recipes (catalyst batches) is C++ behaviour; DT maps it only to AdAthanor rows' };
  }
  if (d.source === 'joejoesgit') return { ...d, cls: 'game', note: 'pre-1.0 oracle (Jan 2026): 1.0 changed recipes, names and batch sizes' };
  return d;
}

function table(rows: string[][]): string {
  if (rows.length <= 1) return '_none_\n';
  const [head, ...body] = rows;
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  return [`| ${head!.join(' | ')} |`, `|${head!.map(() => '---').join('|')}|`, ...body.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n') + '\n';
}

export interface ReportInput {
  data: GameData;
  locales: Record<string, GameLocale>;
  missing: Record<string, string[]>;
  raw: Raw;
  bytes: number;
  dropped: string[];
  /** item/building id → derived nameKey for colliding display names. */
  renamed: Map<string, string>;
  /** Items the solver cannot derive from raw items. */
  unreachable: string[];
  /** Same sweep before the Paradox Crucible recipes were added. */
  loopLocked: string[];
  icons: { produced: number; referenced: number };
}

/** Writes the report; returns the number of unexplained diffs plus normalizer bugs. */
export function writeReport({ data, locales, missing, raw, bytes, dropped, renamed, unreachable, loopLocked, icons }: ReportInput): number {
  const en = locales.en ?? {};
  const names = nameMaps(data, en);
  const diffs: Diff[] = [];
  const drift: string[][] = [['recipe', 'field', 'faultyd3v 1.0.4894', 'build 25321648']];

  const faulty = faultyOracle();
  if (faulty) {
    // faultyd3v already uses RowNames; en-name lookup would confuse e.g. Mercury (Quicksilver) with MercuryP
    diffs.push(...compareOracle('faultyd3v', faulty.recipes, data, { ...names, item: (n) => n }, true));
    for (const [id, row] of Object.entries(raw.recipes)) {
      const f = faulty.rows[id];
      if (!f) continue;
      const ours = { in: row.IngredientList.map((i) => `${i.Count} ${i.IngredientName}`).join(' + '), out: `${row.ProductInfo.Count} ${row.ProductInfo.IngredientName}`, t: row.CraftingTime, n: row.FractionNum };
      const theirs = { in: f.ingredientList.map((i) => `${i.qty} ${i.name}`).join(' + '), out: `${f.productInfo.qty} ${f.productInfo.name}`, t: f.craftTime, n: f.fractionNum };
      for (const k of ['in', 'out', 't', 'n'] as const) if (String(ours[k]) !== String(theirs[k])) drift.push([id, k, String(theirs[k]), String(ours[k])]);
    }
  }
  const starfi5h = evalDb(join(RAW_ORACLES, 'starfi5h-AlchemyFactoryCalculator/alchemy_db.js'));
  if (starfi5h) diffs.push(...compareOracle('starfi5h', starfi5h.recipes, data, names, false));
  const joejoes = evalDb(join(RAW_ORACLES, 'joejoesgit-AlchemyFactoryCalculator/alchemy_db.js'));
  if (joejoes) diffs.push(...compareOracle('joejoesgit', joejoes.recipes, data, names, false));

  const classified = diffs.map((d) => classify(d, data, raw, dropped));
  const unexplained = classified.filter((d) => !d.cls || d.cls === 'bug');

  const upgradeRows = [['track', 'level', 'game data', 'community formula', 'match']];
  let upgradeMismatch = 0;
  for (const t of data.upgrades)
    t.values.forEach((v, l) => {
      const f = COMMUNITY_FORMULAS[t.id](l);
      const ok = Math.abs(v - f) < 1e-9;
      if (!ok) upgradeMismatch++;
      if (!ok || l === t.maxLevel || l === 12) upgradeRows.push([t.id, String(l), fmt(v), fmt(f), ok ? '✓' : '✗']);
    });

  const slotRows = [['building', 'heatCost', 'ours (foundation cells)', 'starfi5h slotsRequired / slots']];
  for (const b of Object.values(data.buildings)) {
    if (b.heatCost === 0 && b.heatSlots === null) continue;
    const m = starfi5h?.machines[en[b.nameKey] ?? ''];
    const theirs = m ? (m.slotsRequired ?? m.slots) : undefined;
    const ours = b.heatSlots ?? b.heatSlotsRequired;
    slotRows.push([b.id, fmt(b.heatCost), String(ours), theirs === undefined ? '—' : `${String(theirs)}${Number(theirs) === ours ? ' ✓' : ' ✗'}`]);
  }

  const craftTypes = new Map<string, Set<string>>();
  for (const [id, r] of Object.entries(data.recipes)) {
    const t = raw.recipes[id]?.CraftType.split('::')[1] ?? (r.nutrientPerBatch !== null ? 'PlantSeedConfig' : 'Paradox (generated, C++)');
    craftTypes.set(t, new Set([...(craftTypes.get(t) ?? []), r.buildings.join(', ')]));
  }

  const usedByProductive = new Set<string>();
  for (const r of Object.values(data.recipes)) {
    if (r.special !== null) continue;
    for (const s of [...r.inputs, ...r.outputs]) usedByProductive.add(data.items[s.item]!.nameKey);
    for (const b of r.buildings) usedByProductive.add(data.buildings[b]!.nameKey);
  }
  const coverage = (culture: string) => {
    const miss = new Set(missing[culture] ?? []);
    const covered = [...usedByProductive].filter((k) => !miss.has(k)).length;
    return `${covered}/${usedByProductive.size} (${fmt((100 * covered) / usedByProductive.size)} %)`;
  };

  const bySource = (source: string) =>
    table([
      ['recipe', 'kind', 'detail', 'class', 'explanation'],
      ...classified.filter((d) => d.source === source).map((d) => [d.recipe, d.kind, d.detail, d.cls ? CLASS_LABEL[d.cls] : '**UNEXPLAINED**', d.note ?? '']),
    ]);
  const summary = ['faultyd3v', 'starfi5h', 'joejoesgit'].map((s) => {
    const ds = classified.filter((d) => d.source === s);
    const count = (c: DiffClass) => ds.filter((d) => d.cls === c).length;
    return [s, String(ds.length), String(count('game')), String(count('code')), String(count('bug')), String(ds.filter((d) => !d.cls).length)];
  });
  const hidden = Object.values(data.recipes).filter((r) => r.hidden).map((r) => r.id);
  const paradox = Object.values(data.recipes).filter((r) => r.id.startsWith('Paradox_'));
  const paradoxSample = ['Limestone', 'Wood', 'Gentian', 'SilverCoin', 'Flax']
    .map((i) => data.recipes[`Paradox_${i}`])
    .filter((r): r is Recipe => r !== undefined)
    .map((r) => `${r.inputs[0]!.item} ${fmt(r.timeSec)} s`);
  const producers = (item: string) => Object.values(data.recipes).filter((r) => r.outputs.some((o) => o.item === item));
  const unreachableRows = [
    ['item', 'raw', 'buyPrice', 'producers'],
    ...unreachable.map((id) => [id, String(data.items[id]!.raw), String(data.items[id]!.buyPrice), producers(id).map((r) => `${r.id}${r.hidden ? ' (hidden)' : r.special ? ` (${r.special})` : ''}`).join(', ') || '—']),
  ];
  const rawNoPrice = [
    ['item', 'producers'],
    ...Object.values(data.items)
      .filter((i) => i.raw && i.buyPrice === null)
      .map((i) => [i.id, producers(i.id).map((r) => `${r.id}${r.hidden ? ' (hidden)' : r.special ? ` (${r.special})` : ''}`).join(', ') || '— (no recipe in DT)'])
      .sort(([a], [b]) => a!.localeCompare(b!)),
  ];
  const renamedRows = [['id', 'derived nameKey', 'ru', 'en'], ...[...renamed].map(([id, key]) => [id, key, locales.ru?.[key] ?? '', locales.en?.[key] ?? ''])];
  const special = Object.values(data.recipes).filter((r) => r.special !== null).map((r) => `${r.id} (${r.special})`);

  const md = `# 05 — Normalizer report (build ${data.build.id}, v${data.build.version})

Generated by \`pnpm data\` (tools/normalize). Do not edit by hand — edit \`tools/normalize/report.ts\`.

## Output

- \`public/data/${data.build.id}/gamedata.json\`: ${(bytes / 1024).toFixed(1)} KB — ${Object.keys(data.items).length} items, ${Object.keys(data.recipes).length} recipes, ${Object.keys(data.buildings).length} buildings, ${data.upgrades.length} upgrade tracks.
- Locales: ru ${Object.keys(locales.ru ?? {}).length} keys (fallbacks: ${missing.ru?.length ?? 0}), en ${Object.keys(locales.en ?? {}).length} keys (fallbacks: ${missing.en?.length ?? 0}). Coverage of items + buildings used by non-special recipes: ru ${coverage('ru')}, en ${coverage('en')}.
- Icons: ${icons.produced} webp 64 px produced / ${icons.referenced} referenced by included items and buildings.

## Method

1. \`tools/extractor\` (CUE4Parse 1.2.2, jmap reflection of this build) exports \`DT_*\` tables, the building blueprints (\`/Game/Blueprints/Buildings\`, for CDO components), \`Game.locres\` for every culture and the UI textures (\`Arts/UI/{Ingredients,Furnitures,Buildings,Interaction}\`). See research/04-extraction.md.
2. \`tools/normalize\` maps rows to the contract in \`src/shared/data/types.ts\` with pure functions (items/recipes/buildings/upgrades/locale/unlocks) and cross-checks with the oracles below.
3. Oracles (never copied): faultyd3v (dump of the same tables, v1.0.4894), starfi5h (hand-kept, v1.0.4952), joejoesgit (pre-1.0, Jan 2026). Recipes are compared as **per-minute rates per item** (so batch size does not matter) on the oracle's machine, speedMult applied; nursery rows by nutrients per produced unit.

## Batch semantics (FractionNum) — decision

**An item with a negative \`MaximumStack\` is fractional: recipe Counts of it are in 1/|MaximumStack| parts.** One batch = FractionNum crafting cycles; every Count is multiplied by FractionNum and divided by the item's part count; time = CraftingTime × FractionNum.

Evidence:
- Plank (\`WoodBoard\`): 1 Logs → 1 Plank, 2 s, FractionNum 200; Logs \`MaximumStack\` −200 → **1 Logs → 200 Plank in 400 s** = starfi5h and faultyd3v's own example — which its literal rule (every Count × FractionNum → 200 Logs) contradicts.
- Star Dust: 60 Jupiter + 20 Saturn + 15 Mars → 1, 60 s, FractionNum 5; Jupiter/Saturn/Mars stacks −300/−100/−75 → **1 + 1 + 1 → 5 Star Dust in 300 s** = starfi5h. faultyd3v's literal rule (every Count × FractionNum) would give 300 Jupiter + 100 Saturn + 75 Mars → 5, i.e. 300× too many relics: the rule only holds for non-fractional items.
- Jupiter: 4 Plank + 6 Small Gear + 2 Pulley → 1 part, FractionNum 300 → 1200 + 1800 + 600 → 1 Jupiter in 600 s = starfi5h. Sol: 1 of each relic + 25 Perfect Diamond + 5 Eternal Catalyst + 5 World Tree Core → 1 Sol in 300 s = starfi5h.
- Logs \`HeatValue\` 10 is per part too: 10 × 200 = 2000 per Logs (= codex/starfi5h), Coal Ore 250 × 120 = 30 000. \`CostValue\`/\`StockCost\` are per whole item (Logs 200 = buy price).
- Pinned in \`tools/normalize/recipes.test.ts\` (unit) and \`integrity.test.ts\` (generated data).

## Fail / side products — decision

\`FailRate1/2\` + \`ProductSequence\` are a deterministic cycle (Coke \`[1,0]\`, Steel \`[1,1,1,0]\`, Lapis \`[2,1,0]\`): on a fail cycle the fail product **replaces** the main product. So the main output is scaled by 1 − ΣFailRate and each fail product by its rate; \`SideProduct\` is always produced. \`OutputStack.chance\` = that per-cycle probability (1 − ΣFailRate for the main product; 1 when there is no fail), \`qty\` = expected amount per batch. Verified against every starfi5h Athanor/Advanced Athanor row (e.g. Steel: 4 Iron + 4 Coke Powder → 1 Steel + 3 Iron).

## Machines (CraftType → buildings)

From each building blueprint's CDO: \`CraftFacilityComponent.FactoryCraftType\`, \`GrindFacilityComponent.FactoryType\` (+ \`GrindingSpeed\` → speedMult: Enhanced Grinder 2), \`BuildingProduceComponent.FactoryType\` (unset = first enumerator TableSaw). Components that hard-code the type in C++: \`ExtractFacilityComponent\` → Extract (Extractor, Thermal Extractor), \`ParadoxFacilityComponent\` → Paradox, \`CauldronFacilityComponent\` → Cauldron, \`SeedPlotActor\` → Plant. Hidden \`_Sym\` mirrors are dropped. First building = slowest, then lowest game ID.

${table([['CraftType', 'buildings'], ...[...craftTypes.entries()].sort().map(([t, bs]) => [t, [...bs].join(' / ')])])}
Heaters: buildings with \`BuildingConsumeComponent\` (Stone Furnace, Blast Furnace, Steam Heating Pad); heatSlots = cells of their base.

## Upgrades (DT_UpgradePoints → DT_Improvements) vs community formulas

Value = (Base + ΣAdd) × (1 + ΣIncrease/100) of the attribute (ConveyerSpeed, FactorySpeed, ExtractorSkill, FuelEfficiency, FertilizerEfficiency); conveyor in items/min, others as multiplier. 13 levels per track. Mismatches: **${upgradeMismatch}** (only level 12, 13 and mismatches listed).

${table(upgradeRows)}
## Heat slots vs starfi5h

Game data has no explicit "slots" number. Heater slots = base cells (Stone Furnace 3×3 = 9, Blast Furnace 7×6 = 42, Steam Heating Pad 9) — all match starfi5h. Machine \`heatSlotsRequired\` = foundation cells at the bottom layer; starfi5h's numbers are empirical and differ for 5 machines (formula lives in game code: placement/heat-sharing on the heater is C++; only furnace counts in build cost depend on it, the fuel model does not).

${table(slotRows)}
## Oracle diffs

Classes: **game confirms us** (raw game rows support our value), **formula lives in game code** (behaviour not in data tables; described), **NORMALIZER BUG** (must be fixed). Unexplained + bugs: **${unexplained.length}**.

${table([['oracle', 'diffs', 'game confirms us', 'game code', 'bugs', 'unexplained'], ...summary])}
### faultyd3v (literal "× FractionNum" rule, fail handling as ours)

${bySource('faultyd3v')}
Raw drift between faultyd3v's v1.0.4894 dump and build ${data.build.id} (same row, different value): ${drift.length - 1}.

${table(drift)}
### starfi5h (v1.0.4952)

${bySource('starfi5h')}
### joejoesgit (pre-1.0)

${bySource('joejoesgit')}
## Oblivion Essence (Mors) / Vitality Essence (Vitae) — Paradox Crucible

The DT has only \`Vitae\` (1 Mors → 1 Vitae, 5 s) and \`Mors_Alt\` (1 Vitae → 1 Mors, 5 s), both on the Paradox Crucible — a closed loop, so 23 items downstream (Obsidian, Marble, Luna, Sol, Catalyst2…4, …) were infeasible. The real source is C++: \`ParadoxFacilityComponent\` (jmap: \`IngredientName\`, \`IngredientStack\`, \`IngredientTotalValue\`, \`ParadoxProcessTime\`, \`CachedProductName\`) accepts **any** item and outputs Oblivion Essence. Time per item = 1500 / (whole-item \`CauldronCost\`): computed from DT_Enemies it reproduces starfi5h's in-game \`paradoxTime\` for all 28 items it lists (e.g. ${paradoxSample.join(', ')}); the 1500 constant is C++.

Modelled as ${paradox.length} generated recipes \`Paradox_<item>\` (1 item → 1 Mors, not special, unlocked with the Paradox Crucible) for every non-liquid item reachable from raw items, except Mors and Vitae whose DT rows take precedence. \`Paradox_Limestone\` is the default (non-alternate); the rest are alternates, so the optimizer can pick the cheapest input.

## Reachability sweep

Starting from raw items (the solver may always import them) and applying productive recipes (not special, not hidden), items still not derivable: **${unreachable.length}**. They are infeasible without an explicit import.

${table(unreachableRows)}
Without the Paradox Crucible rows the same sweep leaves ${loopLocked.length} items locked in the Vitae ↔ Mors loop: ${loopLocked.join(', ')}.

Raw items without a buy price: their only producers are hidden / special (or none), so the solver gets them only by import. No non-raw item has only hidden / special producers — \`raw\` is defined as "no productive recipe".

${table(rawNoPrice)}

## Duplicate display names

Items or buildings sharing a display text in ru or en get a **derived** nameKey \`<gameKey>#<id>\` whose text is the game string + a roman numeral in game-ID order (not a game string).

${table(renamedRows)}
## Special / hidden recipes

- \`special\` (kept, solver ignores): ${special.join(', ')}. Cauldron rows: output is chosen from ingredient value by C++ (see mechanics.json), heat is output-dependent. Plant rows = Seed Plot (manual, 1 seed consumed per cycle, not sped up).
- \`hidden: true\` (= \`unlockedBy: null\`, ${hidden.length}): ${hidden.join(', ')} — all are \`bHideInGame\` rows. Every other recipe resolves to a skill: its own non-deprecated skill node, else the skill that unlocks its default building (1.0 deprecated the coin/ingot-alt nodes, they fall back to the machine), nursery rows take the later of machine and seed unlock.
- Dropped (reference an item that does not exist in DT_Enemies): ${dropped.join(', ') || 'none'}.
- No DT rows exist for Steam (Steam Boiler), Purchasing/Bank Portal or catalyst-modified Advanced Athanor outputs, so none were generated (\`steam\`, \`portal\`, \`catalyst\` specials are unused in this build). Raw buying is \`Item.buyPrice\` (\`AllowPortalSupply\` + \`StockCost\`).

## Open questions

1. Nursery time: growth is fertilizer-bound — batch time = nutrientPerBatch / \`Item.nutrientSpeed\` of the fertilizer / speed (DT_Enemies \`NutrientSpeed\`: Basic 12, Advanced 144, Growth Potion 2160, Fertile Catalyst 6000, Panacea 20 000). \`Nursery_*\` \`timeSec\` keeps \`GrowthSeconds\` (the Seed Plot cycle) only as a fallback.
2. Nursery seeds are not consumed (starfi5h: seed is a build cost); contract has no per-recipe build item, so seeds do not appear in nursery inputs.
3. Mini World Tree ↔ TreeStage2 and World Tree Nursery ↔ TreeStage3 pairing is inferred (C++), consistent with starfi5h.
4. Advanced Athanor also runs Athanor recipes in-game (starfi5h "… Advanced Athanor" rows, 32 heat/s); not in DT, not added.
5. \`heatSlotsRequired\` differs from starfi5h for Crucible, Kiln, Alembic, Athanor, Advanced Alembic (see table).
6. Paradox Crucible output amount (1 Mors per input item regardless of stack) and the 1500 constant come from starfi5h's in-game measurements; not verifiable from tables.
7. Thermal Extractor yield bonus (up to +200 % by build height) is C++; the data keeps it a plain Extract machine with 80 heat/s.
`;
  writeFileSync(REPORT, md);
  return unexplained.length + upgradeMismatch;
}
