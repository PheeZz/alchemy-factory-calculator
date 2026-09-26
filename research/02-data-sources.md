# 02: Recipe data sources for Alchemy Factory

Researched on 2026-09-26. Game: **Alchemy Factory**, Steam appid `3669570`, by D5 Copperhead / Gamirror Games.
The game left Early Access with **1.0 on 2026-09-08**. The latest patch is **hotfix v1.0.4962 (2026-09-15)**, per the Steam news API.

Downloaded files are in `research/raw/<source>/`. Every URL in this report was fetched while writing it.
Where something could not be verified, the report says so.

---

## TL;DR: ranking

| # | Source | Type | Game version | Updated | Recipes / items | Raw download | License |
|---|---|---|---|---|---|---|---|
| 1 | **faultyd3v/AlchemyFactoryData** | Game-file datamine (JSON) | **1.0.4894** | 2026-09-08 | 161 crafting rows (incl. 28 `_Alt`) / 180 items / 280 buildings | yes | **none** |
| 2 | **starfi5h/AlchemyFactoryCalculator** (`develop`) | Hand-curated calculator DB (JS object) | **1.0.4952** (DB v56) | 2026-09-14 (repo 2026-09-25) | 211 recipes / 157 items / 40 machines | yes | **none** |
| 3 | alchemyfactorytools/alchemyfactorytools.github.io | Clean JSON extract of #2 v55 + mechanics notes | 1.0.4950 | 2026-09-20 | 211 / 157 / 40 | yes | none |
| 4 | moldy530/alchemy-factory-planner (= alchemyfactorytools.com) | JSON generated from #1 by a sync script | 1.0.4894 | 2026-09-25 | 161 / 180 / 39 devices | yes | none |
| 5 | alchemy-factory-codex.com | Website (Astro), data in a JS module | **0.5.4471 (EA)** | ToS 2026-01-10; banner still shows 0.5 | 142 / 151 / 35 | JS module only | ToS: "large-scale reuse requires permission" |
| 6 | JoeJoesGit/AlchemyFactoryCalculator | Original calculator DB (JS object) | pre-1.0 ("v105 patch") | 2026-01-17 | 160 / 154 / 33 | yes | none |
| 7 | spaltfcy/alchemyfactory-calculator | TS data files (JA/EN) | pre-1.0 (Codex-derived) | 2026-06-02 | 146 recipes | yes | **MIT** |
| 8 | InfernoIV/alchemy-factory-calculator | CSV | pre-1.0 | 2026-05-18 | 175 CSV rows | yes | none |
| 9 | Others: Vercel planner, BWIKI, SEO wikis, Steam guides | see below | mostly 0.5 | — | partial | no / blocked | — |

**Recommendation.** Use **#1 (datamine)** as the canonical base: it is closest to the game files and covers items, buildings, crafting, skills, quests and upgrades.
Layer **#2 (starfi5h)** on top for what the datamine lacks or encodes opaquely:
- Enhanced/Advanced machine variants and their times
- Advanced Athanor unstable/resonant outputs, stated explicitly
- Nursery/Seed Plot nutrient model
- Thermal Extractor rows
- Machine footprints (L/W/H)
- Heating slots
- Belt/skill formulas (in its engine JS)

#2 is also the most recent version (1.0.4952). Neither source is licensed, so ask the authors before redistributing the data, or re-derive it from the game.

---

## 1. faultyd3v/AlchemyFactoryData (game-file datamine) ⭐ canonical

- **URL:** https://github.com/faultyd3v/AlchemyFactoryData
- **Type:** repository of JSON dumps from game assets. It has no README, but the field names are Unreal/game-internal (`craftType`, `EBeltTDCraftType`, `iconPath: /Ingredients/T_UI_...`). The internal project name is "BeltTD".
- **License:** none (GitHub reports no license).
- **Game version:** latest commit `v1.0.4894` on 2026-09-08. Earlier commits: `v0.4.5.4471` (2026-06-03), `v4299`, `v4049`, `v3924`. The author updates it roughly every patch.
- **Raw URLs** (base `https://raw.githubusercontent.com/faultyd3v/AlchemyFactoryData/main/`):
  `crafting.json`, `items.json`, `buildings.json`, `machine_types.json`, `enums.json`, `plantseeds.json`, `skills.json`, `upgrades.json`, `quests.json`, `loreExp.json`
- **Downloaded:** `raw/faultyd3v-AlchemyFactoryData/` (all 10 files, ~600 KB)

**Schema.** Each file is a list of objects unless noted.
- `crafting.json` (161 rows):
  - Basic fields: `craftIdName`, `craftId`, `ingredientList[{name,qty}]`, `productInfo{name,qty}`, `craftType` (the machine; see `machine_types.json`), `craftTime`, `fractionNum`.
  - Probabilistic output: `failRate1/2`, `failProduct1/2`.
  - Other outputs and variants: `sideProduct`, `alternate`.
  - Advanced Athanor catalyst mechanics: `ProductSequence`, `UnstableSequence`, `CatalystCost`.
- `machine_types.json`: a dict mapping `craftType` id to machine name. There are 25 entries, 0–24: Table Saw, Stone Crusher, Iron Smelter, Planting, Grinder, Extractor, Crucible, Refiner, Kiln, Processor, Assembler, Blender, Adv. Blender, Alembic, Adv. Alembic, Athanor, Adv. Athanor, Adv. Assembler, Shaper, Adv. Shaper, Arcane Shaper, Paradox Crucible, Cauldron, Arcane Processor, LiquidTap (= Brew Barrel).
- `items.json` (180):
  - Identity: `id`, `name` (internal), `displayName`, `ingredientTags`, `iconPath`.
  - Money: `value`, `cost`, `gameValue{Gold,Silver,Copper}`, `baseCost`.
  - Cauldron: `cauldronCost/Target/Multi`.
  - Heat and nutrients: **`hv` = heat value**, **`nv` = nutrient value**, **`ns` = nutrient speed**.
  - Flags and stack: `maxStack`, `liquid`, `portal`, `catalystCharges`.
- `buildings.json` (280): `idName`, `name`, **`hc` = heat consumption/s**, `craftingType`, `costList` (build cost), `furnitureType`, `alterBuildOption` (mirrored `_Sym` variants), `hide`.
- `plantseeds.json` (9): `growthSeconds`, `growthNutrientValue`, `product`, `sideProduct`.
- `skills.json` (284): tech tree. Fields: `predecessors`, `unlockCost`, `unlockResearchPoints`, **`unlockItems`**, `unlockConstructions`.
- `upgrades.json` (gear), `quests.json` (main quests with required products and rewards), `enums.json` (8 UE enums), `loreExp.json` (level curve).

**Important semantics (verified by cross-checking against #2, #4 and #5):**
- Real batch = `qty × fractionNum`, and real time = `craftTime × fractionNum`.
- Example: `Wood→WoodBoard qty 1, craftTime 2, fractionNum 200` means 1 Log → 200 Plank in 400 s. The other sources say the same.
- The same pattern holds for Stone (150 per limestone, 450 s) and Coal (120 per ore, 360 s).
- Probabilistic recipes are stored per unit. Steel Ingot is `1 Iron + 1 Coke Powder → Steel`, 4 s, `failRate1 0.75 → Iron Ingot`. starfi5h stores the expected-value batch instead: `4+4 → 1 Steel + 3 Iron`, 16 s.

**Gaps and caveats:**
- **Contains unreachable content.** 10 outputs are not unlocked by any `skills.json.unlockItems` entry, and starfi5h does not have them either: Refined Sand (`Sand7`), Fully Refined Sand (`Sand8`), Iron Amulet, Copper Amulet, Advanced Bandage (`FineBandage`), Wagon (`Cart`), Amethyst, Charisma Potion, Floating Potion (`InvisbilityPotion`), Refined Gold Dust (`GoldDust4`).
  - These are most likely cut or unused content. Filter them out by skill unlock; this is an inference, not verified in-game.
- Machine-tier speed is not in the dump. Enhanced Grinder has the same `craftingType` as Grinder, and no speed field is exposed. starfi5h shows the Enhanced Grinder is 2× faster.
- Also missing: belt speeds, footprints, the heating-device slot model, and skill effect formulas (only the unlock graph is present).
- Internal names differ from UI names (`WoodBoard`=Plank, `Wood`=Logs, `FlaxSeed`=Flax Seeds). Map them through `items.json.displayName`.

---

## 2. starfi5h/AlchemyFactoryCalculator (curated calculator DB) ⭐ most current

- **Repo:** https://github.com/starfi5h/AlchemyFactoryCalculator. The default branch is **`develop`**; `main` lags behind it.
- **Live app:** https://starfi5h.github.io/AlchemyFactoryCalculator/ (EN/中文)
- **Type:** a hand-maintained JS object (`window.ALCHEMY_DB = {...}`) with comments, editable in-app through its "Database Editor".
  - It is a fork of JoeJoesGit (#6) with a Cauldron calculator, node Planner, Wiki tab and i18n added.
- **License:** none. The README says "Fork freely", but that is not a license.
- **Version:** `"version": 56, "date": "2026.09.14", "gameVersion": "1.0.4952"`. Last commit 2026-09-25, very active.
- **Raw URL:** https://raw.githubusercontent.com/starfi5h/AlchemyFactoryCalculator/develop/js/alchemy_db.js
  - This is JS, not JSON, because it contains comments and unquoted `L:`/`W:`/`H:` keys. Eval it with `window` stubbed. See #3 for a ready JSON extract of v55.
- **Downloaded:** `raw/starfi5h-AlchemyFactoryCalculator/alchemy_db.js`, `README.md`

**Schema:**
- `items` (157, keyed by display name):
  - Basics: `id`, `category`, `tier`, `maxStack`, `liquid`, `charges`, `exp`.
  - Prices: `buyPrice`, `sellPrice`, `wholesalePrice`, `baseCost`.
  - Heat: `heat` (fuel value).
  - Cauldron and paradox: `cauldronCost/Target/Multi`, `paradoxTime`.
  - Nutrients: `nutrientCost`, `nutrientValue`, `maxFertility`.
- `machines` (40, keyed by name):
  - `buildCost{}`, `tier`, `heatCost` (heat/s; `-1` means per recipe), `slotsRequired` (slots needed on a furnace).
  - Heaters: `slots`, `isGenerator`, `heatSelf`.
  - Nurseries: `fertility`.
  - Footprint: `L`, `W`, `H`.
- `recipes` (211, list):
  - Core: `id`, `machine`, `inputs{}`, `outputs{}`, `baseTime`, `heatCost`.
  - Nursery: `nutrientCost`, `sharedOutputs`, `buildCost` (the seed).
  - Advanced Athanor: `ChargeCost`, `unstableOutputs`, `resonantOutputs`.
  - Other: `customInputSlot`.

**Coverage beyond the datamine:**
- Enhanced Grinder rows (18) and Thermal Extractor rows (5)
- Seed Plot (7) and Nursery variants
- World Tree Nursery / Miniature World Tree
- Purchasing Portal (19) and Bank Portal (7) pseudo-recipes for buying raws and coins
- Steam Boiler
- Brew Barrel (5, the 1.0 beverages)
- Paradox Crucible (5)

**Mechanics code:**
- Belt speed, skill multipliers ("Logistics Efficiency", "Factory Efficiency", fuel/alchemy skills) and cauldron math are in the other JS files under `js/`, such as `alchemy_calc_engine.js`. They were not downloaded; fetch them from the same raw base if needed.

**Caveats:** manual data, so typos and naming quirks exist. For example, `Philosopherˈs Stone` uses U+02C8 instead of an apostrophe. Some item-level field names (`baseCost`, `cauldronCost`) match the datamine, which suggests partial derivation from it, but the README does not say so.

**Forks** are mirrors with no divergent data: `xVilho` (v56, 3 commits behind), `fluffy-labs` (v51 / 0.5.4539, stale), `suguru-toyohara`, `iiloni` (404 now).

---

## 3. alchemyfactorytools/alchemyfactorytools.github.io (clean JSON of #2 + mechanics)

- **URL:** https://github.com/alchemyfactorytools/alchemyfactorytools.github.io. Site: https://alchemyfactorytools.github.io/
- **Type:** an optimizer and dataset repo. `data/alchemy_db.json` is described in its README as a "verbatim extract of starfi5h DB v55, gameVersion 1.0.4950". It also carries hand-written `mechanics.json` with sources cited: Steam patch-note gids and starfi5h engine code.
- **License:** none. Its own README says moldy530 "has NO LICENSE — reference only".
- **Updated:** 2026-09-20.
- **Raw URLs** (base `https://raw.githubusercontent.com/alchemyfactorytools/alchemyfactorytools.github.io/main/data/`):
  - `alchemy_db.json`: same schema as #2, as plain JSON
  - `mechanics.json`: keys `cauldron`, `advancedAthanorCatalysts`, `heatAndFuel`, `steam`, `fertilizer`, `logistics`, `economy`, `throughputModel`, `unlocks`, `thermalExtractor`
  - `skills.json`: 5 production skill tracks with formulas taken from the starfi5h engine
  - `contracts.json`: recorded on v0.5
- **Downloaded:** `raw/alchemyfactorytools-github-io/` (these 4 files plus `README.md`)

**Useful facts it records** (not independently verified here):
- Belt base speed is **60 items/min**.
- Splitter ratios.
- 1.0 removed the base heat cost of heating devices.
- `outputsPerMin = 60/(baseTime/speedMult) × batchYield`; Seed Plot ignores speedMult.

**Known gaps it lists:**
- Steam Heating Pad consumption is unknown.
- Seed Plot yields are unverified.
- The Wagon/rail system (new in 1.0) is not in any dataset.
- Mercury and Luna moved to the Advanced Shaper without a patch-note entry.

---

## 4. moldy530/alchemy-factory-planner → alchemyfactorytools.com

- **Repo:** https://github.com/moldy530/alchemy-factory-planner. Live: https://alchemyfactorytools.com (repo homepage). Next.js app with an LP solver.
- **License:** none.
- **Version:** commit "sync game data with v1.0.4894 release" on 2026-09-25.
- **Data provenance:** `scripts/sync-data.ts` fetches `https://raw.githubusercontent.com/faultyd3v/AlchemyFactoryData/main/{items,buildings,crafting,plantseeds}.json`. It then:
  - flattens `fractionNum` into batch counts,
  - maps `craftType` to kebab-case device ids,
  - adds a manual `data/device-metadata.json` holding parent/child relations for Enhanced/Advanced machines.
- **Raw URLs** (base `https://raw.githubusercontent.com/moldy530/alchemy-factory-planner/main/data/`): `recipes.json`, `items.json`, `devices.json`, `device-metadata.json`. The sync script is at `.../main/scripts/sync-data.ts`.
- **Downloaded:** `raw/moldy530-alchemy-factory-planner/` (4 data files, `sync-data.ts`, `README.md`)

**Schema:**
- `recipes.json` (161): `{id, inputs[{id,name,count}], outputs[{id,name,count}], time, crafted_in, category}`. Batch-level, so `fractionNum` is already applied.
- `items.json` (180): `{id, name, category, cost, base_cost, heat_value, nutrient_value, nutrients_per_seconds, required_nutrients, cauldron_*}`.
- `devices.json` (39): `{id, name, category, heat_consuming_speed, heat_self, slots, slots_required, parent}`.

**Value:** the most convenient clean JSON of the datamine. It still contains the unreachable recipes from #1.

---

## 5. alchemy-factory-codex.com (website with the best human-readable coverage, but stale)

- **URL:** https://alchemy-factory-codex.com/. Pages: `/recipes`, `/items/all`, `/devices`, `/production-planner`, `/cauldron-calculator`, `/heating-calculator`, `/herb-calculator`, `/paradox-calculator`, and others. Available in multiple languages (e.g. `/ja/`).
- **Type:** Astro static site with ads and Ko-fi. The data is bundled into one ES module:
  **https://alchemy-factory-codex.com/_astro/devices.DQoGRurT.js**
  - It exports `items` (151), `recipes` (142) and `devices` (35).
  - The hashed filename changes on redeploy. Find the current one via `/production-planner/` → `ProductionPlannerPage...js` → `import ... from "./devices.<hash>.js"`.
- **Version:** the site banner says "Game Version: **0.5.4471 (Early Access)**", so it has not been updated for 1.0.
- **License / ToS** (https://alchemy-factory-codex.com/terms-of-service/, last updated 2026-01-10): "You may quote small excerpts with attribution. **Large-scale reuse requires permission.**" It also forbids scraping that overloads the site. Use it as a reference and cross-check, not as shipped data.
- **API:** none. The HTML is static, and the one JS module is the only machine-readable form.
- **Downloaded:** `raw/alchemy-factory-codex/`: the original module `devices.DQoGRurT.js`, plus extracted `items.json`, `recipes.json`, `devices.json` (for local reference only).

**Schema:**
- `recipes`: `{id, inputs[{name,count}], outputs[{name,count}], time, crafted_in, category, exclude?}`
- `items`: `{id, name, id_num, cost, price, category[], heat_value, base_cost, fraction_num, nutrient_value, nutrients_per_seconds, required_nutrients, obtainable_exp, cauldron_*}`
- `devices`: `{id, name, category, heat_consuming_speed}`

**Derivatives of the Codex:**
- `jackwolffr/SatisfactoryModelerAddons` saved Codex HTML pages and parses them.
- The Vercel planner (#9) embeds Codex-scraped data.
- `spaltfcy` (#7) derives `paradoxTimeSec` from Codex values.
- `chwaee/AlchemyFactoryCalculator` has a hand-typed catalog labelled "Codex 0.5.4471 / 1.0 launch data".
- `forgeroutetrack/AlchemyFactoryEditor` (German layout editor) cites Codex 0.5.4471 plus in-game tests.

---

## 6. JoeJoesGit/AlchemyFactoryCalculator (original calculator, stale)

- **URL:** https://github.com/JoeJoesGit/AlchemyFactoryCalculator. Live: https://joejoesgit.github.io/AlchemyFactoryCalculator/
- **License:** none. Last push 2026-02-02. DB `"timestamp": "2026-01-17T14:48:00" // v105 Patch`, which is pre-1.0.
- **Raw URLs:** `https://raw.githubusercontent.com/JoeJoesGit/AlchemyFactoryCalculator/main/alchemy_db.js` (items 154, machines 33, recipes 160) and `.../alchemy_constants.js` (belt fraction table and item-ID registry).
- **Downloaded:** `raw/joejoesgit-AlchemyFactoryCalculator/` (`alchemy_db.js`, `alchemy_constants.js`, `CHANGELOG.md`)
- **Schema:** the predecessor of #2's schema (items `buyPrice`/`heat`/`nutrientCost`; recipes `{id, machine, inputs, outputs, baseTime}`). Superseded by #2.

## 7. spaltfcy/alchemyfactory-calculator (MIT, Japanese)

- **URL:** https://github.com/spaltfcy/alchemyfactory-calculator. **License: MIT**, the only permissively licensed dataset found.
- **Updated:** 2026-06-02. Pre-1.0 and Codex-based; the README mentions deriving from Codex values.
- **Raw data:** `https://raw.githubusercontent.com/spaltfcy/alchemyfactory-calculator/main/src/data/{recipes,items,machines,heat,fertilizer,economy,paradox,abilityTables}.ts` (TypeScript literals).
- **Recipe shape:** `{id, name{ja,en}, machineId, timeSec, inputs[{itemId,amount}], outputs[{itemId,amount}]}`, 146 recipes. It includes JA names, which are useful for i18n.
- **Downloaded:** `raw/spaltfcy-alchemyfactory-calculator/`

## 8. InfernoIV/alchemy-factory-calculator (CSV)

- **URL:** https://github.com/InfernoIV/alchemy-factory-calculator. No license. Updated 2026-05-18 (pre-1.0).
- **Raw:** `https://raw.githubusercontent.com/InfernoIV/alchemy-factory-calculator/main/data/{recipes,cauldron,recipes_cauldron}.csv`
- **Schema:**
  - `recipes.csv` (175 rows): `recipe-name, chance, output-amount, output-resource, time, device, input-1-amount, input-1-resource, … input-9-*`
  - `cauldron.csv`: `resource, value, target_value, multiplier, heat_need`
- **Downloaded:** `raw/infernoiv-alchemy-factory-calculator/`

---

## 9. Other sources (low value, blocked, or not machine-readable)

| Source | Finding |
|---|---|
| **alchemy-factory-planner.vercel.app** | Vite single bundle `/assets/index-B0n6F06M.js` (710 KB) with an embedded item→recipes object: ~186 items, ~157 recipe entries with per-min `rate`. All links point to alchemy-factory-codex.com, so it is **derived from the Codex (0.5)**. Not extracted, since it adds nothing over #5. The source repo was not found. |
| **BWIKI 炼金工厂WIKI** https://wiki.biligame.com/alchemyfactory/ | MediaWiki 1.37 with **SemanticMediaWiki**, DPL and Scribunto. `api.php?action=query&meta=siteinfo` works: 568 pages, **only 10 counted "articles"**, 246 images. `list=allpages` works and returns Chinese item pages. Fetching page content (`prop=revisions`, `action=raw`, SMW `browsebysubject`) **was answered with an anti-bot HTML challenge** after a few requests, so it cannot be bulk-exported without a browser. Looks sparse. There is no Cargo (`action=cargotables` is rejected). |
| **Fandom** | `alchemyfactory.fandom.com/api.php` → **HTTP 410 (Gone)**. `alchemy-factory.fandom.com/api.php` → **404**. No Fandom wiki exists. |
| **wiki.gg** | `alchemyfactory.wiki.gg` returns only a bot challenge. Web search found no Alchemy Factory wiki on wiki.gg. **Not found.** |
| alchemyfactory.org, alchemy-factory.wiki, alchemyfactory.wiki, alchemyfactory.boats, alchemyfactorygame.wiki | SEO/article sites (Next.js) with no API or data files. alchemy-factory.wiki's "All Recipes List" article has about 51 table rows, explicitly for **0.5.4471**, and the content appears to be derived from the Codex. **Unreliable, do not use as data.** |
| Steam guides (https://steamcommunity.com/app/3669570/guides/) | 22 guides listed; none is a full machine-readable recipe list. Relevant ones: "Diagrammes de fabrication" (id 3632470622, crafting diagrams) and "Котёл в 1.0: как он работает + все значения" (id 3802610989, cauldron values for 1.0). The guide pages themselves returned **HTTP 429**, so their contents were not verified. |
| Steam discussions (695376346894834691, 750542551165969761) | These only link JoeJoes, XDPierre and the Codex. |
| Google Sheets | No Alchemy Factory spreadsheet found. The search hits were for other games. |
| Reddit r/AlchemyFactory | Could not be searched: reddit.com blocks both the fetch tool and the JSON API. **Not checked.** |
| GitLab / Codeberg | Not searched specifically. Web searches surfaced no Alchemy Factory projects there. |
| XDPierre/AlchemyFactoryCalculator (MIT) | Python CLI with a small inline recipe dict (~16 entries). Dec 2025. Negligible. |
| giannithebest1/GTB-s-Alchemy-Factory-Manager | C# app. `SeedData.cs` is **placeholder data** (e.g. "Mana Potion", "Herb Mash"), not real game data. |
| realisotope/alchemy-factory-blueprints (GPL-3.0) | `src/lib/blueprintMappings.js` maps save/blueprint internal names to display names. Useful later for blueprint import, not for recipes. |
| oOHiyoriOo/beltTD-save-tools (MIT) | Save-file inspector in Python. It could help re-derive data from saves; not examined in depth. |
| GrantClark1999/alchemy-factory | Empty repo (LICENSE only). |

**Steam news API** (patch notes, live and keyless):
- `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=3669570&count=40&format=json`
- The latest 40 items are saved to `raw/steam-news/news_3669570.json`. Use them to detect new game versions and diff them against the datamine version.

---

## What each source provides (fields)

| Field | #1 datamine | #2 starfi5h | #4 moldy530 | #5 Codex |
|---|---|---|---|---|
| Inputs / outputs / amounts | ✓ (per-unit × `fractionNum`) | ✓ (batch) | ✓ (batch) | ✓ (batch) |
| Craft time | ✓ | ✓ | ✓ | ✓ |
| Machine | ✓ (`craftType`) | ✓ (+ Enhanced/Thermal variants) | ✓ | ✓ |
| Probabilistic / side products | ✓ (`failRate`, `sideProduct`) | ✓ (expected-value batches) | flattened | flattened |
| Adv. Athanor catalyst modes | raw sequences | ✓ unstable/resonant outputs | ✗ | ✗ |
| Fuel heat value | ✓ `hv` | ✓ `heat` | ✓ | ✓ |
| Machine heat/s, furnace slots | `hc` only | ✓ `heatCost`, `slotsRequired`, `slots` | ✓ | heat only |
| Nutrients / fertilizer | ✓ `nv`/`ns`, plantseeds | ✓ | ✓ | ✓ |
| Belt speed | ✗ | engine code (60/min base + skill) | ✗ | ✗ |
| Power | not a game mechanic found in any source (heat plays that role) | — | — | — |
| Build costs | ✓ `costList` | ✓ `buildCost` | ✗ | ✗ |
| Footprint | ✗ | ✓ L/W/H | ✗ | ✗ |
| Prices / costs | ✓ value/cost/baseCost/cauldron* | ✓ buy/sell/wholesale/baseCost | ✓ | ✓ |
| Tech unlocks | ✓ `skills.json` | tier only | ✗ | ✗ |
| Localized names | EN only | EN + zh-CN (`alchemy_i18n.js`) | EN | multi-lang site |

## Gaps (true for all sources)

1. **Wagon/rail logistics** shipped in 1.0 and is not in any dataset.
2. **Belt speeds** exist only as the community figure "60/min base" plus skill formulas. They are not in the datamine; verify them in-game.
3. **Machine speed multipliers** for Enhanced/Advanced tiers are not in the datamine; only starfi5h encodes them, as duplicate recipe rows.
4. **Steam Heating Pad consumption** and **Seed Plot yields** are unverified, per #3's own notes.
5. **Licensing:** the two authoritative sources (#1, #2) have **no license**. The only permissive one is spaltfcy (MIT), and it is pre-1.0.
6. The datamine contains **unreachable recipes**; filter them using `skills.json` unlocks.
