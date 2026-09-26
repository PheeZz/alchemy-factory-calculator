# Alchemy Factory — Game Mechanics Research (for production-chain calculator)

Research date: 2026-09-26. All facts below carry a source URL. Facts from unofficial/fan sources are marked accordingly, and anything contradictory or unverified is flagged explicitly. **Do not silently trust any single fan-wiki number — cross-check in-game before hard-coding into the calculator.**

## 0. Identity, release status, engine (VERIFIED against Steam directly)

- **Developer:** D5 Copperhead. **Publisher:** Gamirror Games. Confirmed both from the live Steam store page HTML and from Steam's own news post text. — [Steam store page](https://store.steampowered.com/app/3669570/Alchemy_Factory/), [Steam news: "Version 1.0 Is Now Available"](https://store.steampowered.com/news/app/3669570/view/518601098272965336)
- **Release status:** Left Early Access and launched **Version 1.0 on September 8, 2026, 07:00 UTC**. Early Access had started **December 11, 2025**. — [Steam store page](https://store.steampowered.com/app/3669570/Alchemy_Factory/), [official news post](https://store.steampowered.com/news/app/3669570/view/518601098272965336)
- **Engine:** **Unreal Engine 5**, confirmed directly from an official hotfix note: *"Disabled Unreal Engine 5's NNE, which could prevent some players from launching the game."* (Hotfix v1.0.4950). — [Steam news via ISteamNews API, item "Hotfix v1.0.4950"](https://store.steampowered.com/news/app/3669570/)
  - Note: one AI-generated web-search summary claimed a specific sub-version "Unreal Engine 5.7.4" — that exact point-version could **not** be verified from any primary source and should be treated as unverified/likely fabricated. Only "Unreal Engine 5" (unspecified minor version) is confirmed.
- **Genres/tags (Steam):** Casual, Indie, Simulation, Strategy. Co-op (online/LAN), Steam Workshop (blueprints), 55 Steam achievements, Steam Cloud. — [Steam store page](https://store.steampowered.com/app/3669570/Alchemy_Factory/)
- **Popularity signals (official, from launch news):** >200,000 copies sold during EA, "Very Positive" rating, 89% positive from 2,000+ reviews, >7,000 community members, >3,500 Workshop blueprints uploaded, >8,000,000 cumulative player-hours during EA. — [Steam news: "Alchemy Factory Leaves Early Access on September 8"](https://store.steampowered.com/news/app/3669570/)
- **Official "About This Game" summary (verbatim, useful for scope):** *"Alchemy Factory is a medieval-themed automation game. Start with a small shop and team up with friends. Use conveyor belts, pipes, and magical devices to build automated production lines, then stock your shelves with potions, jewelry, and relics. Fulfill commissions, amass wealth, build your own medieval alchemy factory, and become a renowned alchemy tycoon!"* — [Steam store page](https://store.steampowered.com/app/3669570/Alchemy_Factory/)

## Source-quality warning (important)

Web search for this game surfaces an unusually large cluster of near-identical "wiki/guide" domains that appear within days of each other and read as programmatically generated / AI-written SEO content (heavy hedging, no real numbers, generic phrasing, occasional off-topic hosting domain reused for other games): `alchemyfactory.org`, `alchemy-factory-codex.com`*, `alchemyfactorywiki.wiki`, `alchemyfactoryguide.wiki`, `alchemyfactory.space`, `alchemyfactorywiki.site`, `alchemyfactory.best`, `alchemyfactorygame.wiki`, `alchemy-factory.online`, `alchemyfactorygu.wiki`, and even `dq7reimagined.com` (an unrelated-sounding domain hosting an Alchemy Factory guide — a strong tell of a content-farm network). Most of these produced **no concrete numbers** when fetched directly and mainly hedge ("check the in-game World tab", "official 1.0 materials don't publish a complete table").

**Exception: `alchemy-factory-codex.com`** stands apart and is treated here as the primary secondary source. Evidence it's a genuine, actively-maintained fan tool rather than a content farm:
- A real, granular changelog running Dec 2025 → June 2026 with specific bug fixes credited to named community members (thanks to "Rai", "Gavin", "Chris", "Cryokinesis", etc.) — [changelog](https://alchemy-factory-codex.com/changelog)
- A self-hosted FAQ that explicitly disclaims accuracy and non-affiliation: *"No, I'm just a fan of the game and made this website for fun."* and *"No. I make my best effort to have accurate data, but it's possible there are mistakes."* — [FAQ](https://alchemy-factory-codex.com/faq)
- Working calculators (Production Planner, Cauldron, Heating, Extractor, Herb, Paradox, Profit, Contracts, EXP, Floor Planner) that read as genuinely built tools, not templated text.

**Caveat on the codex's data currency:** its displayed "Game Version" is **0.5.4471 (Early Access)** — i.e. its recipe/device/fuel numbers were last confirmed on a **pre-1.0 build**. The official 1.0 patch (see §9) explicitly changed some of these numbers (Linseed Oil ratios, Obsidian recipe byproduct, all non-production-device tech-tree unlocks, heat costs of heating devices, reputation system entirely). **Any codex number should be treated as "Early Access baseline, needs 1.0 re-verification"**, which is exactly what the codex's own FAQ says.

No active Reddit community was found (`r/AlchemyFactory` search returned nothing); Steam Community discussions exist and were spot-checked (see §3).

---

## 1. Machines / Devices

Full device list with confirmed **Heat Speed** values (source: codex's live heating calculator config, cross-verified identically on 3 separate codex pages — devices list, heating calculator, game-mechanics upgrade panel). Heat Speed is the rate (units unspecified, presumably heat/sec) at which the device consumes heat while running; devices without a Heat Speed number are not heat-consumers. — [Devices list](https://alchemy-factory-codex.com/devices), [Heating Calculator](https://alchemy-factory-codex.com/heating-calculator)

**Footprint size (tiles), exact port counts/positions, and processing-speed-independent-of-recipe data were NOT found in any source** — the codex does not publish a footprint/port table, and the fan wikis explicitly say Valve/dev material doesn't either. This is a confirmed gap (see "Gaps" in final summary).

| Device | Category | Heat Speed | Notes |
|---|---|---|---|
| Table Saw | Raw Material Production | — | processes Logs → Plank etc. |
| Stone Crusher | Raw Material Production | — | Stone, Coal, Crude Shard, Salt+Sand, meteorite processing |
| Seed Plot | Raw Material Production | — | |
| Iron Smelter | Raw Material Production | 9 | Iron Ore → Iron Ingot; Pyrite Ore → Sulfur+Iron Ingot |
| Purchasing Portal | Raw Material Production | — | buys raw materials with money (see §7) |
| Nursery | Raw Material Production | — | grows herbs from seeds (see §4) |
| Bank Portal | Raw Material Production | — | |
| Dispatch Portal | Raw Material Production | — | used for contracts/quests |
| World Tree Nursery | Raw Material Production | — | consumes huge "nutrient" input, makes World Tree Leaf/Core |
| Grinder | Automated Processing | — | powders items (Sage→Sage Powder, Sand from Stone, etc.) |
| Enhanced Grinder | Automated Processing | — | |
| Crucible | Automated Processing | 4 | melts powders to ingots, makes Charcoal/Coke, Plant Ash |
| Stackable Crucible | Automated Processing | 6 | |
| Extractor | Automated Processing | — | makes liquids (Linseed Oil, Fruit Wine, Limewater, Brine, Fairy Tear) |
| Thermal Extractor | Automated Processing | 80 | has a "maximum production multiplier" stat (see Achievements) |
| Refiner | Automated Processing | — | multi-step shard/dust refinement chains (Refined Sand 1–5, Crude/Broken/Dull Shard, etc.) |
| Knowledge Altar | Automated Processing | — | breaks down items for EXP (post-1.0: "can now break down any item to gain experience; breaking Relics grants extra XP") |
| Cauldron | Automated Processing | — | special multi-recipe crafting device (see §8 quirks) |
| Paradox Crucible | Automated Processing | 1200 | makes Oblivion Essence / Vitality Essence — very high heat need |
| Processor | Advanced Crafting | — | makes gears/rivets/bearings/coins |
| Kiln | Advanced Crafting | 15 | Glass, Bronze/Silver/Copper/Gold Ingot (alt. recipes), Brick |
| Blender | Advanced Crafting | — | Soap, Perfumed Soap, Vitality Potion, Yeast Powder |
| Assembler | Advanced Crafting | — | Clay, Wooden Pulley, Bandage, Basic/Advanced Fertilizer, Turquoise, Silver Amulet, Gloom Spores, Unstable Catalyst |
| Alembic | Advanced Crafting | 108 | Lavender Essential Oil, Brandy, Sulfuric Acid |
| Athanor | Advanced Crafting | 32 | probabilistic byproduct recipes (Coke+Charcoal, Steel+Iron Ingot, Salt+Sand 2, Malachite+Crude Shard) |
| Advanced Blender | Advanced Crafting | — | Black Powder, Blast Potion, Panacea Potion, Growth Potion, Fertile Catalyst, Resonant Catalyst |
| Advanced Assembler | Advanced Crafting | — | Pocket Watch, Crown |
| Shaper | Advanced Crafting | — | makes Jupiter/Saturn/Mars relics |
| Advanced Shaper | Advanced Crafting | — | makes Venus/Mercury/Luna relics |
| Advanced Alembic | Advanced Crafting | 270 | Aqua Vitae, Quicksilver, Moon Tear |
| Advanced Athanor | Advanced Crafting | 360 | Copper/Impure Copper Powder split, Silver/Crude Silver Powder split, Gold Dust 3-way split, Obsidian/Volcanic Ash split, Lapis Lazuli 3-way split |
| Arcane Processor | Advanced Crafting | — | Eternal Catalyst, Fairy Dust, Star Dust |
| Arcane Shaper | Advanced Crafting | — | makes Sol relic (end-game) |
| Stone Furnace | Heating | 1 | provides heat to nearby heat-consuming devices |
| Blast Furnace | Heating | 4 | stronger heat provider |

Also confirmed to exist but not in the heat table: **Steam Heating Pad** (post-1.0/community-reported, "Heat Consuming Speed: 80 P/s", no idle consumption unlike furnaces which idle-consume fuel) and **Steam Boiler** — an alternate heat-distribution mechanism using pipes instead of adjacency to a furnace, no transfer-speed limit on the pipes. Only found via a WebSearch summary of Steam Community discussions + a fan guide title; **not independently verified by primary-source fetch** — flag as **unconfirmed/medium-confidence**. — [WebSearch summary of Steam Community discussions](https://steamcommunity.com/app/3669570/discussions/0/750542279460114393/), [alchemyfactory.best guide title](https://alchemyfactory.best/alchemy-factory-steam-boiler/)

Post-1.0 new devices (official patch notes, confirmed): **Brew Barrel** (new "Beverage" goods category device) and **Arcane Fountain** (a throwing/automatic-restock device that "automatically searches for suitable targets to throw at"). — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)

Other named non-production structures referenced across sources but not detailed: Automatic Cashier, Trash Barrel, Checkout Table, Workbench (now gates all non-production-device unlocks post-1.0), Track Sorter (conveyor logic device, has mirrorable route selection), Priority Merger, Wagon Launch Station, Curved Track, Transmuter (lets a player-character revert a transformation in multiplayer). — [Official patch notes / hotfixes via ISteamNews API](https://store.steampowered.com/news/app/3669570/)

## 2. Fuel system

Fuel values below are **Heat Value** per unit, taken identically from two separate codex pages (items/fuel table and the heating calculator's fuel dropdown) — internally consistent within the one source, version 0.5.4471 (Early Access; not yet re-verified against 1.0). — [Fuel items](https://alchemy-factory-codex.com/items/fuel), [Heating Calculator](https://alchemy-factory-codex.com/heating-calculator)

| Fuel | Heat Value | Price (copper) shown by codex |
|---|---|---|
| Plank | 20 | — |
| Charcoal | 40 | — |
| Charcoal Powder | 48 | — |
| Coal | 540 | — |
| Coke | 600 | — |
| Coke Powder | 660 | — |
| Logs | 2,000 | — |
| Black Powder | 6,000 | 660 |
| Coal Ore | 30,000 | — |
| Blast Potion | 24,000 | 2,557 |
| Panacea Potion | 320,000 | 30 |

Notes/quirks on fuel:
- Only **heat-consuming devices** need fuel (see Heat Speed column in §1); non-heat devices need no fuel.
- **"Fuel Efficiency" is a global upgrade** that scales *"Fuel Heat Value"* by a percentage (baseline 100%) — i.e., fuel burns more efficiently (gives more heat per unit) as this upgrade is leveled. — [game-mechanics/upgrade panel](https://alchemy-factory-codex.com/game-mechanics)
- Community guidance (medium confidence, one fan blog only): coal is barely more heat-efficient than the charcoal you'd have to burn to make more coal from ore, i.e. there's a real refining-cost tradeoff to model, not just raw heat-value comparison. — [NeonLightsMedia beginner's guide](https://www.neonlightsmedia.com/blog/alchemy-factory-beginners-guide-tips)
- Post-1.0 patch note: *"Removed the base heat cost of all heating devices."* — this changed how furnaces/heating devices consume fuel at baseline (idle heat draw likely reduced/removed) — confirmed official but exact new formula not published. — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)
- The codex's own FAQ states its heat-cost methodology (useful for building a calculator's cost model, but self-admittedly an approximation, not extracted game data): *"Since all heating devices need a furnace, I add 0.4 heat/sec for a crucible and 1 heat/sec for everything else. A stone furnace usually has 2 or 3 crucibles, so I took the average of 2.5. ... The heat cost is calculated by determining the length of time the recipe uses and the device used to get a total heat amount, then that amount is divided by the approximate cost per heat produced, which is about 20 heat per copper for most fuels."* — [FAQ](https://alchemy-factory-codex.com/faq)

## 3. Heating / temperature mechanics

- Heat-consuming devices (Iron Smelter, Crucible, Stackable Crucible, Thermal Extractor, Paradox Crucible, Kiln, Alembic, Athanor, Advanced Alembic, Advanced Athanor) each have a fixed **Heat Speed** (§1 table) — this is their consumption rate, and it is separately modified by the **"Factory Efficiency"** upgrade (*"Device Production, Heat Consuming Speed 100%"* baseline). — [game-mechanics upgrade panel](https://alchemy-factory-codex.com/game-mechanics)
- Heat is supplied by **Stone Furnace** (Heat Speed 1, i.e. weakest generator) and **Blast Furnace** (Heat Speed 4), which must apparently be adjacent/placed near consumers (classic "heat radius" pattern, common to this genre) — exact adjacency/radius rule **not confirmed** from any primary source.
- A **Steam Heating Pad / Steam Boiler** pipe-based alternative to direct furnace adjacency is reported by Steam Community discussion threads (piped heat/steam, no transfer-speed cap on the pipes themselves, but the system can starve itself if downstream consumption exceeds the boiler's production) — **medium confidence only**, not independently fetched from a primary source. — [WebSearch of Steam Community threads](https://steamcommunity.com/app/3669570/discussions/0/798967892166053054/)
- 1.0 patch note removed the idle/"base" heat cost of heating devices — meaning pre-1.0 calculators (like the codex, still on 0.5.4471) may currently **overstate heat/fuel cost per recipe** for anyone modeling 1.0 data. — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)

## 4. Fertilizer / farming / growing mechanics

**Plants (Nursery recipes)** — confirmed from the codex's recipes page, Early Access data (0.5.4471). Each entry: input seed rate → output plant amount/rate → growth Time. — [Recipes page, "Herbs" section](https://alchemy-factory-codex.com/recipes)

| Plant | Seed input | Output | Growth Time | Device |
|---|---|---|---|---|
| Flax | 1x Flax Seeds (0.15/min) | 200x Flax (30/min) | 400s | Nursery |
| Sage | 1x Sage Seeds (0.11/min) | 180x Sage (20/min) | 540s | Nursery |
| Redcurrant | 1x Redcurrant Seeds (0.07/min) | 150x Redcurrant (10/min) | 900s | Nursery |
| Chamomile | 1x Chamomile Seeds (0.05/min) | 140x Chamomile (7.5/min) | 1,120s | Nursery |
| Lavender | 1x Lavender Seeds (0.04/min) | 120x Lavender (5/min) | 1,440s | Nursery |
| Gentian (dual output) | 1x Gentian Seeds (0.03/min) | 80x Gentian (2.22/min) **+** 80x Gentian Nectar (2.22/min) | 2,160s | Nursery |
| World Tree Leaf/Core (dual output) | 6,000,000x nutrient (1,200,000/min) | 99x World Tree Leaf (19.8/min) **+** 1x World Tree Core (0.2/min) | 300s | World Tree Nursery |
| Gloom Fungus + Plank (byproduct pair, non-seed input) | 1x Rotten Log (0.15/min) | 40x Gloom Fungus (6/min) + 160x Plank (24/min) | 400s | Table Saw |

- Growth time clearly scales with plant rarity/tier (400s → 2,160s), and each Nursery output is a large batch (e.g. 200 Flax) per single growth cycle, not 1:1 with the seed.
- **Fertilizer** is a consumable that boosts nutrient delivery. Five tiers found, with **Nutrient Value** and **Nutrients/Sec** (both confirmed identically on two codex pages: options-panel sample list and the dedicated fertilizer item table): — [items/fertilizer](https://alchemy-factory-codex.com/items/fertilizer)

| Fertilizer | Nutrient Value (V) | Nutrients/Sec (V/s) |
|---|---|---|
| Basic Fertilizer | 144 | 12 |
| Advanced Fertilizer | 720 | 144 |
| Growth Potion | 6,480 | 2,160 |
| Fertile Catalyst | 24,000 | 6,000 |
| Panacea Potion | 200,000 | 20,000 |

- Fertilizer recipes (crafted, not just bought): Basic Fertilizer = 1x Plant Ash + 1x Quicklime Powder (Assembler, 4s); Advanced Fertilizer = 1x Basic Fertilizer + 1x Gloom Fungus (Assembler, 4s); Growth Potion, Fertile Catalyst, Panacea Potion are also full multi-input alchemy recipes reused as top-tier fertilizers (see §5/§8 for their crafting chains — they're dual-purpose items, both potions and fertilizers). — [Recipes page, "Fertilizer" section](https://alchemy-factory-codex.com/recipes)
- A global **"Fertilizer Efficiency"** upgrade scales *"Nutrient Value"* (baseline 100%). — [game-mechanics upgrade panel](https://alchemy-factory-codex.com/game-mechanics)
- The World Tree Nursery's "nutrient" input of 6,000,000 units at 1,200,000/min (i.e. 5 minutes per cycle) suggests "nutrient" is consumed as a bulk pooled resource (from fertilizer, presumably), not a discrete item — worth confirming in-game before modeling.

## 5. Conveyors / belts / logistics

**Confirmed base rate:** the global upgrade panel (same one embedded on every codex page, live-updates the site's calculators) explicitly labels the base belt-speed stat: **"Logistics Efficiency → Conveyor Belt Speed 60/min"** (i.e. 60 items/minute at baseline logistics-upgrade level). — [game-mechanics page / any codex page's upgrade panel](https://alchemy-factory-codex.com/game-mechanics)

This same 60/min figure is independently repeated by:
- A "historical" Steam Community discussion reference (per a fan wiki's summary; not independently primary-sourced) with an example of a talent-upgraded belt running **75/min**. — [alchemyfactory.space conveyor guide](https://alchemyfactory.space/automation/conveyor-speed) (low-confidence source, see warning above, but the number matches the higher-confidence codex figure)

**Important caveat, stated by the fan wiki itself and worth repeating for the calculator team:** *"Official 1.0 materials do not provide a complete table of automation-component rates, costs, capacities, or progression details... Do not assume that an old capacity number, upgrade effect, or machine rate still applies after the 1.0 release."* No belt-tier table (Belt 1/2/3, its individual throughput, unlock cost) was found anywhere. This is a confirmed gap.

Other logistics facts, from official 1.0 patch notes only (highest confidence):
- **Wagon System** — new in 1.0, a rail-based bulk-logistics alternative to conveyors: *"Wagons offer greater transport capacity but require more complex construction and careful planning."* Includes Wagon Launch Stations, Curved Tracks (collision-adjustable per a later hotfix), and players can "transform into a wagon" to ride rails. — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/), [Hotfix v1.0.4962](https://store.steampowered.com/news/app/3669570/)
- **Track Sorter** exists as a conveyor/rail-branching logic device; a hotfix fixed its mirrored variant having inverted route-selection results, and added clearer branch indicators — implying it supports multiple selectable output routes (splitter-like). — [Hotfix v1.0.4950](https://store.steampowered.com/news/app/3669570/)
- **Priority Merger** exists (a merger device with output priority logic) — a hotfix fixed a bug where it "could sometimes reduce conveyor efficiency." — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)
- A hotfix also fixed: *"conveyor route distribution could become unbalanced after conveyors were split and then merged"* — confirms splitters/mergers are core mechanics with their own balancing logic (like Factorio's belt-balancer problem). — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)
- No confirmed data on: number of input/output belt-lines a given machine accepts, inserter/arm mechanics (the "About This Game" text and patch notes never mention "inserters" — items seem to move directly via conveyor/pipe connections into device ports, more Satisfactory-like than Factorio-like).
- Vertical movement: "lifters" and multi-floor conveyor routing are supported (confirmed by official "About This Game" description: *"Build production chains at different heights and in every direction"* and *"multi-story shops with careful path planning"* post-1.0 customer-navigation rework). — [Steam store page](https://store.steampowered.com/app/3669570/Alchemy_Factory/), [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)

## 6. Upgrades / research / tech tree

Global upgrade list (confirmed, identical across every codex page's live upgrade panel) — each has a numeric "level 0 baseline" percentage/rate shown: — [game-mechanics page](https://alchemy-factory-codex.com/game-mechanics)

| Upgrade | Effect (baseline shown) |
|---|---|
| Logistics Efficiency | Conveyor Belt Speed 60/min |
| Throwing Efficiency | Catapult Fire Rate 60/min, Cannon Fire Rate 120/min |
| Factory Efficiency | Device Production / Heat Consuming Speed 100% |
| Alchemy Skill | Extractor Output 100% |
| Fuel Efficiency | Fuel Heat Value 100% |
| Fertilizer Efficiency | Nutrient Value 100% |
| Sales Ability | Shop Profit 100% |
| Negotiation Skill | Purchase Contract Amount 100% |
| Customer Management | Quest Rewards 100% |
| Relic Knowledge | Relic Withdrawal Bonus 100% |

- These read/write via a shared "Set All Levels" control on the codex, implying each upgrade has discrete numbered levels (not a single global slider) — exact per-level curve (e.g. level 5 = what % ) **not found**.
- **Upgrade reset cost** (spending points to respec), confirmed table from Game Mechanics page: reset count 1→cost 1, 2→2, 3→4, 4→8, 5→16, 6→32, 7→64, 8→100, 9→2 *(sic — the source table itself shows a drop back to 2 at reset #9, likely a display bug/currency-unit change in the source, flagged as-is)*, 10→5, 11+→10, capped at "maximum at 10 gold". — [Game Mechanics](https://alchemy-factory-codex.com/game-mechanics)
- **1.0 tech-tree rework (official, high confidence):** *"Research Tree: Removed all non-production devices from the Tech Tree. These devices must now be unlocked at the Workbench."* and *"Upgrades: Reworked shop sales upgrades and removed purchase contract upgrades. These bonuses have been integrated into the Shop Recognition system."* — this means the "Negotiation Skill / Purchase Contract Amount" row above is very likely **stale post-1.0** (removed/folded into Shop Recognition). — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)
- **Refined Sand tiering** (a repeated-refinement mini-tech-tree, confirmed numeric): *"There are 6 levels of refined sand ... Each level of refinement requires half as many refiners as the previous level. Once you have fully refined sand, refine it 8 more times to get to diamond. In total, it takes 2^14 = 16,384 sand to make one diamond, costing 65,536 [copper, presumably]. At level 7, you can buy Quartz Ore which refines into crude shard ... crude shard costs 44000/80 = 550 copper each. Compare that to refining from sand, which costs 4*2^7 = 512 [copper]."* This is a genuine alternate-recipe/cost-optimization example useful for calculator validation. — [Game Mechanics](https://alchemy-factory-codex.com/game-mechanics)
- **EXP / player-level system** (confirmed formula, credited by the codex author to a community member "faulty"): `exp_required(level) = floor(1.1 * lvl^2.4 + 10 * lvl^0.3 + 0.1 * 1.09^lvl - 7)`, cumulative EXP to reach level 100 = **1,202,034**. — [Game Mechanics](https://alchemy-factory-codex.com/game-mechanics)

## 7. Currency / economy

- **Three-tier currency, exact conversion (confirmed, consistent across two codex sources):** 1 Copper (base unit) = base; 1,000 Copper = 1 Silver; 100,000 Copper = 1 Gold (= 100 Silver). — [Game Mechanics](https://alchemy-factory-codex.com/game-mechanics)
  - Note: an earlier low-confidence fan-wiki summary claimed "1 gold = 100 silver = 100,000 copper" — this actually **matches** the codex's ratio once you note 1 silver = 1,000 copper (100 silver × 1,000 = 100,000 copper). Consistent, no conflict.
- Currency is a **physical, movable item in the world**, not just a UI number — money must be physically transported (e.g. via conveyor/wagon) to shops/banks. Confirmed only by a third-party beginner's guide (medium confidence, not primary-sourced), but plausible given the existence of a "Bank Portal" device and coin *recipes* (see below). — [NeonLightsMedia beginner's guide](https://www.neonlightsmedia.com/blog/alchemy-factory-beginners-guide-tips)
- **Coins are craftable items with real recipes** (high confidence, from the recipes page): Gold Coin = 1x Gold Ingot → 1x Gold Coin, 40s, Processor. Silver Coin = 1x Silver Ingot → 5x Silver Coin, 16s, Processor. Copper Coin = 1x Copper Ingot → 300x Copper Coin, 12s, Processor. There are also **reverse recipes** turning coins back into ingots (Gold Ingot 2 = 3x Gold Coin → 2x Gold Ingot in a Kiln; Copper Ingot 2 = 400x Copper Coin → 1x Copper Ingot in a Kiline) — i.e. coins and ingots are mutually convertible, a genuine alt-recipe loop. — [Recipes page](https://alchemy-factory-codex.com/recipes)
- **Raw materials acquisition:** the codex's "Raw Materials" item category lists 9 base items — **Logs, Limestone, Iron Ore, Pyrite Ore, Rock Salt, Coal Ore, Rotten Log, Quartz Ore, Meteorite** — all shown with **no listed Price** (dash), implying they are gathered/mined in the world rather than purchased outright, consistent with devices like "Stone Crusher" and "Iron Smelter" processing them directly and a "Purchasing Portal" device existing separately for buying goods. Quartz Ore is explicitly called out as *purchasable* at research tier 7 in the Refined Sand writeup above (contradicting a blanket "never buyable" assumption) — so acquisition method may be **per-item and tier-gated**, not uniform. — [Raw Materials items](https://alchemy-factory-codex.com/items/raw-materials), [Game Mechanics](https://alchemy-factory-codex.com/game-mechanics)
- **Contracts** (bulk sell agreements), confirmed table (Early Access data) from Game Mechanics page:

| Item | Units/contract | Reward (copper) | Daily max | Units/min | Level needed | Dispatch requirement |
|---|---|---|---|---|---|---|
| Bandage | 50 | 12 | 800 | 33.3 | 4 | — |
| Gloom Spores | 50 | 18 | 1,600 | 66.7 | 5 | 2,000 Bandage |
| Pocket Watch | 20 | 26 | 960 | 40.0 | 6 | 5,000 Gloom Spores |
| Fertile Catalyst | 20 | 60 | 1,200 | 50.0 | 7 | 3,000 Pocket Watch |
| Silver Amulet | 10 | 340 | 480 | 20.0 | 8 | 4,000 Fertile Catalyst |
| Moonlit Soap | 10 | 60 | 80 | 3.3 | 9 | 2,000 Silver Amulet |

- **Daily Quests**, confirmed (Game Mechanics page): appear daily at in-game 6:00. Three types — **Random** (expires in 3 in-game days / 72 real-world minutes, pays 130% market price), **Bulk** (5 days / 120 real-world minutes, 160% market price), **Urgent** (1 day / 24 real-world minutes, 200% market price). Implies a fixed real-time-to-game-day ratio of **24 real minutes = 1 in-game day**. — [Game Mechanics](https://alchemy-factory-codex.com/game-mechanics)
- **1.0 rework (official, high confidence):** the entire Reputation mechanic was replaced by **"Shop Recognition"**: *"Reworked the Reputation system into the Shop Recognition system. Customer feedback when making purchases no longer affects Reputation. Players can obtain various Shop Recognitions to increase their shop's reputation and profits."* Per third-party (medium confidence) explanation, this works via visiting an NPC shopkeeper, taking a "recognition quest" (e.g. "sell 30 mortars" / "sell 100 Healing Potions"), paying a fee, and receiving reputation. Also: *"Items are now sold at the price they have when the customer picks them up"* (a pricing-timing fix relevant to any profit calculator). — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)

## 8. Alternative recipes (same output, different machine/recipe)

Confirmed directly from the recipes page (high confidence, though frozen at EA v0.5.4471) — genuine alt-recipe pairs found:

- **Iron Ingot**: (a) Iron Ore → Iron Ingot @ Iron Smelter, 600s, 100x per Ore, 0.1/min input rate; (b) "Iron Ingot 2": Iron Sand → Iron Ingot @ Crucible, 6s, 1:1, 10/min.
- **Copper Ingot**: (a) Copper Powder → Copper Ingot @ Crucible; (b) "Copper Ingot 2": 400x Copper Coin → 1x Copper Ingot @ Kiln (a reverse-conversion recipe, see §7).
- **Silver Ingot**: (a) Silver Powder → Silver Ingot @ Crucible; (b) "Silver Ingot 2": 6x Silver Coin → 1x Silver Ingot @ Kiln.
- **Gold Ingot**: (a) Pure Gold Dust → Gold Ingot @ Crucible; (b) "Gold Ingot 2": 3x Gold Coin → 2x Gold Ingot @ Kiln.
- **Crude Shard**: (a) Quartz Ore → Crude Shard @ Stone Crusher; (b) "Crude Shard 2": Fully Refined Sand → Crude Shard @ Refiner.
- **Copper Powder**: (a) direct from Impure Copper Powder @ Refiner; (b) "Copper Powder 2": from Copper Ingot @ Grinder (i.e. de-crafting an ingot back to powder).
- **Silver Powder / Pure Gold Dust**: same de-crafting pattern as above ("Silver Powder 2" from Silver Ingot @ Grinder, "Pure Gold Dust 2" from Gold Ingot @ Grinder).
- **Brick**: appears twice with identical inputs/outputs/device (Clay → Brick @ Kiln) — likely a listing artifact rather than a genuine second recipe; flagged as **uncertain/needs confirmation**, not a real alt-recipe.
- **Growth Potion** and **Panacea Potion** each appear in *both* the "Potions" and "Fertilizer" item categories with identical recipes — these are dual-use items (drinkable potion AND fertilizer), not separate recipes.

— [Recipes page](https://alchemy-factory-codex.com/recipes)

## 9. Quirks important for a calculator: byproducts, probabilistic/split outputs, multi-output recipes, catalysts

This is probably the single most calculator-relevant finding: **several recipes output multiple items from one crafting cycle with an explicit percentage split**, which behaves like a probabilistic/ratio output a calculator must model as "N total output split proportionally," not as independent 100% yields. Confirmed directly from the recipes page (high confidence, EA data):

- **Coke and Charcoal** (Athanor, 3s): 6x Charcoal Powder → **1x Coke (50%)** + **2x Charcoal (50%)**.
- **Steel Ingot and Iron Ingot** (Athanor, 4s): 1x Iron Ingot + 1x Coke Powder → **1x Steel Ingot (25%)** + **1x Iron Ingot (75%)**.
- **Salt and Sand 2** (Athanor, 6s): Charcoal Powder + Quicklime Powder → **1x Salt (33.333%)** + **6x Sand (66.667%)**.
- **Copper Powder and Impure Copper Powder** (Athanor, 6s): Iron Sand + Soap Powder → **1x Copper Powder (50%)** + **1x Impure Copper Powder (50%)**.
- **Silver Powder and Crude Silver Powder** (Advanced Athanor, 6.4s): Copper Powder + Black Powder → **1x Silver Powder (20%)** + **1x Crude Silver Powder (80%)**.
- **Gold Dust and Impure Gold Dust** (Advanced Athanor, 8s, **3-way split**): Silver Powder + Volcanic Ash + Quicksilver → **1x Gold Dust (10%)** + **1x Impure Gold Dust (30%)** + **1x Crude Gold Dust (60%)**.
- **Lapis Lazuli and Shattered Crystal** (Advanced Athanor, 12s, **3-way split**): Impure Silver Powder + Shattered Crystal → **1x Lapis Lazuli (33.3%)** + **1x Shattered Crystal (33.3%)** + **1x Crude Shard (33.3%)**.
- **Malachite and Crude Shard** (Athanor, 12s): Impure Copper Powder + Clay Powder → **1x Malachite (50%)** + **1x Crude Shard (50%)**.
- **Obsidian and Volcanic Ash** (Advanced Athanor, 6s): Oblivion Essence + Shattered Crystal → **1x Obsidian (50%)** + **1x Volcanic Ash (50%)**.
- **Stone and Coal** (mega-recipe, from processing a single Meteorite, 3,000s/50min!): outputs Stone, Coal, Iron Sand, Shattered Crystal, Obsidian, Adamant, Ruby, Sapphire, Emerald **all simultaneously** — a genuine multi-output (not percentage-split, all guaranteed each cycle) recipe. Also **Gloom Fungus and Plank** from Rotten Log (Table Saw) is a guaranteed dual-output, not percentage-split.
- **1.0 patch changed one of these:** *"Changed the byproduct of Obsidian recipe from Volcanic Ash to Marble."* — confirms these percentage-split byproduct chains are an intentional, developer-tuned mechanic that gets rebalanced between patches, not incidental. — [Official 1.0 Patch Notes](https://store.steampowered.com/news/app/3669570/)

**"Cauldron" and "Advanced Cauldron" devices behave differently from all other machines** — rather than one fixed recipe, they appear to be a **combinatorial/discovery-based crafting device**: the codex has a dedicated "Cauldron Calculator" with "reverse lookup," "fill the bar" input-matching UI, "allow duplicate ingredients," and per-changelog-entry evidence of "3x flax recipe," items compared by *distance* in some internal item-graph (*"Fix cauldron recipes with the same distance, such as 129 -> turquoise and black powder"*). This strongly suggests Cauldron recipes are **discovered by combining N items whose stats sum/average to a target**, not simple fixed-ratio recipes — this needs first-hand confirmation before modeling, but a naive "one row = one recipe" calculator schema will not fit the Cauldron device. — [Changelog](https://alchemy-factory-codex.com/changelog), [Recipes page examples: Ruby, Sapphire, Emerald, Philosopher's Stone all use "Cauldron" with unusual fractional per-minute rates like 30.9s/38.2s/45.5s cycle times]

**Relics** are a distinct end-game item class (7 total, named after celestial bodies — Jupiter, Saturn, Mars, Venus, Mercury, Luna, Sol), each craftable via huge-batch recipes (hundreds to thousands of inputs per single relic) at Shaper/Advanced Shaper/Arcane Shaper devices, each also independently purchasable and each granting **EXP** with a "cost per EXP" efficiency ranking the codex computes: — [Relic items](https://alchemy-factory-codex.com/items/relic)

| Relic | Price (copper) | Obtainable EXP |
|---|---|---|
| Jupiter | 30 | 10 |
| Saturn | 150 | 71.5 |
| Mars | 280 | 126 |
| Venus | 10 | 510 |
| Mercury | 52 | 2,693 |
| Luna | 185 | 9,537.5 |
| Sol | 420 | 24,439 |

Sol (the top relic) requires 1x each of the other 6 relics plus 25x Perfect Diamond, 5x Eternal Catalyst, 5x World Tree Core, at the Arcane Shaper, 300s cycle — i.e. relics form their own late-game recursive production tree, not just a currency sink.

**Achievements:** confirmed count = 55 (matches Steam store page's stated achievement count), full list scraped from the codex — includes production milestones (e.g. "Produce 1M Planks", "Produce 1M Copper Coins", "Produce 1M Soaps"), speed/challenge runs ("Complete the game within 50 days"), and negative-constraint runs ("Complete the game without selling any goods to customers", "Complete the game without buying any land") — useful context for what a calculator's target audience might optimize for (megaproject throughput, not just raw efficiency). — [Achievements](https://alchemy-factory-codex.com/achievements), [Steam store page](https://store.steampowered.com/app/3669570/Alchemy_Factory/)

## 10. Version history this data applies to

- **Primary numeric dataset (§1 device list, §2 fuel, §4 fertilizer/plants, §5 conveyor base rate, §6 upgrades/EXP/refined-sand, §7 currency/contracts, §8 alt-recipes, §9 byproduct recipes)** is sourced from **alchemy-factory-codex.com**, self-labeled **Game Version 0.5.4471 (Early Access)**, with its changelog's last entry dated **June 4th 2026**. This predates the 1.0 launch (Sept 8, 2026) by ~3 months.
- **§0, §2 (heat-cost removal), §5 (Wagon System/Track Sorter/Priority Merger), §6 (tech-tree rework), §7 (Shop Recognition), §9 (Obsidian byproduct change)** are sourced from **official Steam patch notes**, specifically: "1.0 Patch Notes" (build immediately preceding/at launch), plus hotfixes **v1.0.4917, v1.0.4930, v1.0.4940, v1.0.4950, v1.0.4962** (all fetched via the official `ISteamNews` API, i.e. Valve/developer-authored text, highest-confidence tier in this report).
- **Practical implication for the calculator project:** treat every numeric recipe/rate value in §1–§9 (except the explicitly-cited official patch-note text) as an **Early-Access-era baseline that needs re-verification against the live 1.0 game** before being hard-coded. The 1.0 patch notes confirm at least these EA numbers are now wrong: Linseed Oil recipe ratios (reduced "by the same proportion," exact new numbers not published), Obsidian recipe's byproduct item, all "purchase contract" upgrade effects, and the base/idle heat cost of every heating device.

---

## Summary of confidence tiers (for calculator-building priority)

1. **Highest confidence (official Valve/developer text, via Steam API):** dev/publisher/release dates, engine, 1.0 feature list, exact 1.0 patch-note wording, hotfix contents.
2. **High confidence (alchemy-factory-codex.com, self-disclosed fan tool, real changelog, internally consistent across pages, but frozen at EA 0.5.4471):** device list + heat speeds, fuel heat values, fertilizer nutrient values, plant growth times, conveyor base speed (60/min), all recipe input/output/time/device data, currency conversion, contracts table, EXP formula, refined-sand math, relic prices/EXP.
3. **Medium/low confidence (third-party blogs/Steam Community discussion summaries, not independently primary-fetched):** Steam Heating Pad/Boiler pipe mechanics, "money is a physical item" claim, coal-vs-charcoal efficiency commentary, Shop Recognition NPC-quest flow detail.
4. **Explicitly unverified/likely wrong:** "Unreal Engine 5.7.4" specific point-version (only "Unreal Engine 5" is confirmed); any numeric belt-tier table beyond the single 60/min figure; any footprint/tile-size or port-count data for any device (not found anywhere).
