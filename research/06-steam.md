# 06 — Steam: Steam Boiler and Steam Heating Pad (build 25321648)

There is no DT row for steam. The numbers below come from the game binary (`AlchemyFactory-Win64-Shipping.exe`), located through the jmap reflection dump, with DT data used where it exists. `pnpm data` emits them as `SteamBoiler_{Low,Mid,High}` recipes (tools/normalize/recipes.ts).

## Numbers

| | value | status |
|---|---|---|
| Boiler, power 0 "Low" (the game's default) | 30 Steam / 6 s = 5 Steam/s, **100 heat/s** | from code |
| Boiler, power 1 "Mid" | 100 Steam / 4 s = 25 Steam/s, **500 heat/s** | from code |
| Boiler, power 2 "High" | 300 Steam / 2 s = 150 Steam/s, **3000 heat/s** | from code; = starfi5h "Steam Boiler (High)" |
| Boiler heat per Steam | **20** at every setting | from code |
| Boiler heat source | sits on a heater like a Crucible (`Building.Heating` tag, DT `HeatCost` 0, draw computed in code); 3×3 base → 9 heater slots | DT + code |
| Boiler idle draw | none when no Steam is taken (steam line full) | community, verified in-game 2026-09-14 (mechanics.json); code has a `bBoilingActive` flag |
| Steam item | liquid (Gas tag), `HeatValue` **20** per unit | DT_Enemies |
| Heating Pad | a heater like the furnaces (`BuildingConsumeComponent`, `ConsumeLiquid = true`), burns Steam as a liquid fuel; 3×3 = **9 slots**; no base draw (DT `HeatCost` 0, 1.0 removed base heat) | BP + DT |
| Pad: Steam per heat | 1 Steam = 20 heat → round trip boiler → pad is **1:1** (no loss) | Steam `HeatValue` 20 + code ratio (below); the pre-1.0 "~0.6 efficiency" does not apply to 1.0 |
| Fuel Efficiency upgrade on Steam at the pad | **unverified** — the solver applies `fuelMult` to every fuel, so the steam route gains `fuelMult` twice (at the boiler's furnace and at the pad) | open |
| Pipes | `MaxLiquidValue` 100 per pipe cell (buffer, not throughput); pad ports 1000/100 | DT_Buildings / DT_PipeMeshConfig2; community: throughput effectively unlimited |

## Evidence

The runtime image base in the jmap is `0x7ff73f660000`, and the PE ImageBase is `0x140000000`. File addresses below = the jmap `func` address − runtime base + ImageBase. Disassembled with Apple `objdump -d` (LLVM, handles PE/x86-64):

```
objdump -d --no-show-raw-insn --start-address=0x144a2e5e0 --stop-address=0x144a2e660 research/game-files/AlchemyFactory-Win64-Shipping.exe
```

- **`SteamBoilerComponent`** (jmap). Fields: `OutputSteamCount @0x240`, `BoilingPower @0x248`, `ProcessingSteamCount @0x250` (double), `BoilingTotalTime @0x258` (double), `bBoilingActive @0x260`. All CDO values are 0; the defaults are set in code.
- **`SetBoilingPower`** at `0x144a2e5e0`: `BoilingPower = power`, then
  - power 2 → `ProcessingSteamCount = 0x4072c00000000000` (300.0), `BoilingTotalTime = 0x4000000000000000` (2.0)
  - power 1 → 100.0 / 4.0
  - otherwise → 30.0 / 6.0

  The component init (`0x144a226a9`) writes power 0 with 30.0 / 6.0, so Low is the default.
- **`GetBoilerHeatConsumeSpeed`**: exec thunk `0x1449b0100` calls `0x144a1c240`, which computes `ProcessingSteamCount / BoilingTotalTime * [0x146c82f78]`, and `[0x146c82f78]` = 20.0. That gives 20 heat per Steam.
- **`BuildingConsumeComponent`** (furnaces and the pad):
  - `GetSteamConsumingRate` (`0x1449ec220`) = `[this+0x270] * 30.0`.
  - `GetHearConsumingRate` (`0x1449eba90`) = the same field `* 10.0`.
  - The ratio is 3 Steam per heat unit. With Steam shown per minute and heat per second, that is 60 / 3 = **20 heat per Steam**, consistent with Steam `HeatValue` 20. The display units are an inference.
- **Blueprints** (`research/extracted/bp`): `BP_SteamBoiler` has only a `SteamBoilerComponent` and no `BuildingConsumeComponent`, so it is not a heater. `BP_SteamHeatingPad` has a `BuildingConsumeComponent` with `ConsumeLiquid: true`. Its base is 3×3 (9 cells), the same as the Stone Furnace.
- **Cross-checks:**
  - starfi5h "Steam Boiler (High)": 3000 heat/s, 2 s → 300 Steam. Identical to our High.
  - mechanics.json: "20 heat per Steam unit at the boiler", "only High is in DB v55", no idle burn. Consistent.
  - Its `STEAM_EFFICIENCY = 0.6` is a pre-1.0 measurement. 1.0 changed heating, and the code above gives 20 heat in → 20 heat out.

## Model in the existing contract (implemented)

- **Recipes** `SteamBoiler_Low | _Mid | _High`:
  - `buildings: ['SteamBoiler']`, `inputs: []`, `outputs: Steam 30 | 100 | 300`, `timeSec 6 | 4 | 2`, `heatPerSec 100 | 500 | 3000`.
  - Not special, `unlockedBy: 'SteamBoiler'`.
  - `SteamBoiler_High` is the default (non-alternate). Heat per Steam is the same at every setting, so High needs the fewest boilers. The in-game default is Low.
- **Heat and fuel:** the boiler's fuel = heat/batch ÷ (fuel `heatValue` × `fuelMult`). The existing solver formula needs no change, because `heatPerSec` overrides the building's 0.
- **Steam as fuel:** choosing `Steam` as the fuel of heated machines makes them consume `heat / 20` Steam, which the boiler recipes produce. The pad is already a heater (category `heating`, `heatSlots` 9).
- **Building:** `SteamBoiler` is added (category `production`, `heatSlotsRequired` 9). Every building tagged `Building.Heating` with DT `HeatCost` 0 (Cauldron, Advanced Cauldron, Steam Boiler) now reports its foundation cells as `heatSlotsRequired`.
- **Steam** is no longer `raw`.

## Constraints for the solver/UI

1. **The boiler must never burn Steam.** Force a non-Steam fuel override for `SteamBoiler_*`. Otherwise Steam → boiler → Steam is a loop that nets 0 at `fuelMult` 1 and creates free energy (an unbounded LP) at `fuelMult` > 1.
2. The Fuel Efficiency multiplier on Steam at the pad is unverified (see the table). Until it is measured in-game, the steam route is modelled as `fuelMult` applied at both ends.
