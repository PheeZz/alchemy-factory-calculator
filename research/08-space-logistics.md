# 08 — Footprint, build list, pipes, reverse calc (build 25321648)

## Footprint

`Building.footprint.cells` is the building's full 3D grid volume from `GridConfigList`, not just its
ground: Iron Smelter and Stone Stove are 3×3×3 = 27 cells, Stone Furnace 7×6×3 = 126, Advanced
Athanor 37 cells over 5 levels, World Tree Nursery 810 cells over 10 levels; Crucible is 2×1×1.
So `footprintOf` reports ground = x·y bounding box and cells = all cells.
A heated machine sits on its heater (4 Crucibles of 2 cells fit a 3×3 stove), so a heated node's ground
is its heaters' ground; its cells count both. `SolveNode.area` / `SolveTotals.area` = `{ floor, cells }`.
Belts, pipes and walkways are not counted.

## Build list

`totals.buildCost` already includes heaters (added with the heater round). Belts and pipes are separate
buildings costing per tile — Belt 1 Plank, Pipe 1 Iron Ingot (`DT_Buildings.CostList`) — and the solver
has no lengths, so the build list leaves them out.

## Pipes

No throughput for liquids exists in the data: `DT_PipeMeshConfig2` gives `MaxLiquidValue` 100 per pipe
cell (a buffer), the Liquid Container holds 10 000, and no attribute or upgrade track touches pipes
(the only transport speed attributes are `ConveyerSpeed` and `ConveyerLiftSpeed`). Community notes
treat pipes as effectively unlimited (a pre-1.0 report of a 6000/min cap per machine is unverified).
So liquid edges keep `belts: 0` and no pipe speed is invented.

## Reverse calculation

- "One belt of X" is already `mode: 'fromInput'` with `supplies: [{ item: X, rate: beltSpeed }]`.
- "I have N machines of recipe R": `FactoryPlan.machineCaps: Record<RecipeId, number>` bounds batches
  by N / (machines per batch), in any mode. With `maximize` it answers "how much can these machines
  make"; with fixed targets above the cap the plan is infeasible and the hint names the item.
