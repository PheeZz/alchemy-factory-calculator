// @vitest-environment node
// Checks the committed output of `pnpm data` (public/data, public/icons, report).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameData, GameLocale } from '../../src/shared/data/types';
import { reachable } from './items';
import { ROOT } from './load';
import { COMMUNITY_FORMULAS } from './report';

const dir = join(ROOT, 'public/data/25321648');
const read = <T>(file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
const data = read<GameData>('gamedata.json');
const locales = { ru: read<GameLocale>('locale.ru.json'), en: read<GameLocale>('locale.en.json') };

describe('gamedata.json referential integrity', () => {
  it('every referenced item / building exists and ids match their keys', () => {
    const bad: string[] = [];
    for (const [id, r] of Object.entries(data.recipes)) {
      if (r.id !== id) bad.push(`recipe key ${id}`);
      if (r.buildings.length === 0) bad.push(`${id}: no building`);
      for (const b of r.buildings) if (!data.buildings[b]) bad.push(`${id}: building ${b}`);
      for (const s of [...r.inputs, ...r.outputs]) if (!data.items[s.item]) bad.push(`${id}: item ${s.item}`);
      if (!(r.timeSec > 0)) bad.push(`${id}: timeSec`);
    }
    for (const [id, b] of Object.entries(data.buildings)) {
      if (b.id !== id) bad.push(`building key ${id}`);
      for (const s of b.buildCost) if (!data.items[s.item]) bad.push(`${id}: build item ${s.item}`);
    }
    for (const [id, i] of Object.entries(data.items)) if (i.id !== id) bad.push(`item key ${id}`);
    expect(bad).toEqual([]);
  });

  it('tech tree: acyclic, references resolve, recipes/unlockedBy point at live nodes', () => {
    const tech = data.tech ?? [];
    const ids = new Set(tech.map((n) => n.id));
    const bad: string[] = [];
    for (const n of tech) {
      for (const p of n.requires) if (!ids.has(p)) bad.push(`${n.id}: requires ${p}`);
      for (const r of n.unlocks.recipes) if (!data.recipes[r]) bad.push(`${n.id}: recipe ${r}`);
      if (n.nameKey && !(n.nameKey in locales.en)) bad.push(`${n.id}: name ${n.nameKey}`);
    }
    for (const r of Object.values(data.recipes)) if (r.unlockedBy && !ids.has(r.unlockedBy)) bad.push(`${r.id}: unlockedBy ${r.unlockedBy}`);
    // Every node is reachable from the roots through `requires` (no cycles, one tree).
    const done = new Set<string>();
    for (let grew = true; grew; ) {
      grew = false;
      for (const n of tech) if (!done.has(n.id) && n.requires.every((p) => done.has(p))) done.add(n.id), (grew = true);
    }
    expect(bad).toEqual([]);
    expect(done.size).toBe(tech.length);
    expect(tech.length).toBeGreaterThan(100);
  });

  it('catalysts: Advanced Athanor rows only, known catalyst items', () => {
    for (const c of data.catalysts ?? []) expect(data.items[c.item]).toBeDefined();
    const rows = Object.values(data.recipes).filter((r) => r.catalyst);
    expect(rows.map((r) => r.id).sort()).toEqual(['GoldDust3', 'LapisLazuli', 'Obsidian', 'SilverPowder3']);
    for (const r of rows) expect(r.buildings).toContain('AdvancedAthanor');
  });

  it('every nameKey exists in both locales; ≥ 98 % real text for what non-special recipes use', () => {
    const keys = [...Object.values(data.items), ...Object.values(data.buildings), ...data.upgrades, ...Object.values(data.recipes)].map((x) => x.nameKey);
    for (const locale of Object.values(locales)) expect(keys.filter((k) => !(k in locale))).toEqual([]);
    const used = new Set<string>();
    for (const r of Object.values(data.recipes)) {
      if (r.special) continue;
      for (const s of [...r.inputs, ...r.outputs]) used.add(data.items[s.item]!.nameKey);
      for (const b of r.buildings) used.add(data.buildings[b]!.nameKey);
    }
    for (const locale of Object.values(locales)) {
      const translated = [...used].filter((k) => locale[k] !== k).length;
      expect(translated / used.size).toBeGreaterThanOrEqual(0.98);
    }
  });

  it('hidden ⇔ not unlockable; fertilizers carry a nutrient speed', () => {
    expect(Object.values(data.recipes).filter((r) => r.hidden !== (r.unlockedBy === null)).map((r) => r.id)).toEqual([]);
    const fertilizers = Object.values(data.items).filter((i) => i.nutrientValue > 0);
    expect(fertilizers.map((i) => [i.id, i.nutrientSpeed])).toEqual(
      expect.arrayContaining([['BasicFertilizer', 12], ['AdvancedFertilizer', 144], ['GrowthPotion', 2160], ['Catalyst2', 6000], ['PanaceaElixir', 20000]]),
    );
    expect(fertilizers.every((i) => i.nutrientSpeed > 0)).toBe(true);
  });

  it('every non-raw item is derivable from raw items (no closed loops like Vitae ↔ Mors)', () => {
    const can = reachable(data.items, Object.values(data.recipes));
    expect(Object.keys(data.items).filter((id) => !can.has(id))).toEqual([]);
  });

  it('item and building display names are unique per locale', () => {
    for (const locale of Object.values(locales))
      for (const group of [Object.values(data.items), Object.values(data.buildings)]) {
        const texts = group.map((x) => locale[x.nameKey]);
        expect(texts.filter((t, i) => texts.indexOf(t) !== i)).toEqual([]);
      }
  });

  it('every icon path points at a produced webp', () => {
    const icons = [...Object.values(data.items), ...Object.values(data.buildings)].map((x) => x.icon).filter((p): p is string => p !== null);
    expect(icons.length).toBeGreaterThan(200);
    expect(icons.filter((p) => !existsSync(join(ROOT, 'public', p)))).toEqual([]);
  });

  it('stays under 500 KB', () => {
    expect(statSync(join(dir, 'gamedata.json')).size).toBeLessThanOrEqual(500 * 1024);
  });
});

describe('gamedata.json pinned game semantics', () => {
  it('FractionNum: 1 Logs → 200 Plank / 400 s; 1+1+1 relics → 5 Star Dust / 300 s', () => {
    expect(data.recipes.WoodBoard).toMatchObject({ inputs: [{ item: 'Wood', qty: 1 }], outputs: [{ item: 'WoodBoard', qty: 200 }], timeSec: 400 });
    expect(data.recipes.StarDust).toMatchObject({
      inputs: [{ item: 'Jupiter', qty: 1 }, { item: 'Saturn', qty: 1 }, { item: 'Mars', qty: 1 }],
      outputs: [{ item: 'StarDust', qty: 5 }],
      timeSec: 300,
    });
  });
  it('upgrade tracks equal the community formulas', () => {
    expect(data.upgrades.map((t) => t.id).sort()).toEqual(Object.keys(COMMUNITY_FORMULAS).sort());
    for (const t of data.upgrades) t.values.forEach((v, l) => expect(v).toBeCloseTo(COMMUNITY_FORMULAS[t.id](l), 5));
    expect(data.constants.baseBeltSpeed).toBe(60);
  });
  it('steam: boiler recipes turn 20 heat into 1 Steam, the pad burns Steam at 20 heat', () => {
    expect(data.items.Steam).toMatchObject({ raw: false, liquid: true, heatValue: 20 });
    expect(data.recipes.SteamBoiler_High).toMatchObject({ outputs: [{ item: 'Steam', qty: 300 }], timeSec: 2, heatPerSec: 3000, buildings: ['SteamBoiler'] });
    expect(data.buildings.SteamHeater).toMatchObject({ category: 'heating', heatSlots: 9 });
  });
  it('raw = not produced by any usable recipe', () => {
    expect(data.items.Wood!.raw).toBe(true);
    expect(data.items.WoodBoard!.raw).toBe(false);
    expect(data.items.Flax!.raw).toBe(false); // nursery, not only the special Seed Plot row
  });
  it('the oracle cross-check has no unexplained diffs', () => {
    expect(readFileSync(join(ROOT, 'research/05-normalize-report.md'), 'utf8')).toContain('Unexplained + bugs: **0**');
  });
});
