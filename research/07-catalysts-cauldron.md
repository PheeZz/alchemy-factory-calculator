# 07 — Catalysts and the cauldron (build 25321648)

## Why the contract's `special: 'catalyst'` matches nothing

Catalysts are not recipes. The four catalyst items (Catalyst1 Unstable, Catalyst2 Fertile, Catalyst3
Resonant, Catalyst4 Eternal — named by their meshes `SM_*Catalyst`) are made by ordinary rows
(Assembler, Advanced Blender, Arcane Processor) and are *inserted into a machine* to change its batches.
So they are modelled as a node modifier, not as a recipe kind; `'catalyst'` stays unused in the enum.

## Data

- `DT_EnemyCrafting` rows carry `CatalystCost`, `ProductSequence` and `UnstableSequence`.
  `ProductSequence` is the per-cycle product index (0 main, 1/2 fail products) and matches the fail
  rates we already use. 9 rows have `CatalystCost > 0`: 5 Athanor (Coke, SteelIngot, Salt,
  CopperPowder2, Malachite) and 4 Advanced Athanor (SilverPowder3, Obsidian, LapisLazuli, GoldDust3).
- Game binary (jmap + objdump, method as in 06-steam.md):
  - `CraftFacilityComponent::GetCatalystCharges` / `GetCatalystSpeed` read an `int[4]` table in `.rdata`:
    **180, 240, 1500, 99999** charges per Unstable / Fertile / Resonant / Eternal item.
  - The catalyst code path is taken only when the facility's `FactoryCraftType` is 16 = `AdAthanor`.
    So catalysts work only in the Advanced Athanor. The Athanor rows' `CatalystCost` would only matter if
    the Advanced Athanor ran Athanor recipes; starfi5h says it does (with a per-recipe 32 heat/s), but that
    is C++ we have not traced, so those rows get no catalyst option.
  - `GetCatalystSpeed` scales by a 0.6 constant and the recipe time for display; consumption per batch is
    taken as `CatalystCost / charges`, which matches starfi5h's ChargeCost for every row it has.

## Effects

| Catalyst | Effect | Source |
|---|---|---|
| Unstable | product mix follows `UnstableSequence` (e.g. Gold Dust 20 % / Impure 80 %, Obsidian 100 %) | DT sequence; matches starfi5h `unstableOutputs` for all 4 rows |
| Fertile | all outputs × 2 | starfi5h (not traced in code) |
| Resonant | main and every fail product at full count each cycle | starfi5h; matches its `resonantOutputs` |
| Eternal | no material inputs | starfi5h (not traced in code) |

All four keep the machine speed. One catalyst per node is modelled; the game keeps an array of charges
per machine (`CatalystCharge`), so stacking is possible in game but not modelled.

## Contract and solver

- `Recipe.catalyst?: { cost, unstableOutputs, resonantOutputs }` on the 4 Advanced Athanor rows.
- `GameData.catalysts?: { item, charges, effect }[]`.
- `FactoryPlan.catalystFor?: Record<RecipeId, ItemId>`: the node gets the catalyst as an input
  (`cost / charges` items per batch) and the effect above; `SolveNode.catalyst` reports the rate.
  Example (tested): 1 Gold Dust/min = 10 batches plain; Unstable 5 batches + 27.8 catalysts/min;
  Fertile 5 + 20.8; Resonant 1 + 0.67; Eternal 10 batches, no Mercury/Silver/Ash.

## Cauldron

- 4 rows (Emerald_Alt, PhilosopherStone_Alt, Ruby_Alt, Sapphire_Alt), `special: 'cauldron'`, fixed
  3 inputs → 1 output, time from DT (30.9–60 s). In game the cauldron takes *any* 3 items and picks the
  output by summed `CauldronCost` (C++, `CauldronFacilityComponent`, capacity 3). A given triple always
  gives the same output, so the DT rows are linear recipes.
- Modelled as user-selectable: `recipeFor[Ruby] = 'Ruby_Alt'` makes Ruby instead of buying it, even
  though Ruby is raw (no automatic recipe). Not chosen automatically, so Ruby/Sapphire/Emerald/
  Philosopher's Stone stay purchasable raw items by default.
- Not modelled: cauldron heat (`CachedHeatPower` is computed in code from the output; the DT rows carry
  none and the Cauldron building has `HeatCost` 0 in data), and arbitrary triples.
