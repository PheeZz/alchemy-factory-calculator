# 07 — Rails and wagons (build 25321648)

## Found

- `Cart` is an item (Processor: 5 Iron Ingot → 1 in 30 s; tech node `Cart`, tier 3) placed as a wagon.
- `DT_Trolleys.Cart`: `Speed` = `MinSpeed` = `MaxSpeed` = 120 (engine units/s along the track).
- `DT_Railroads` (24 track pieces, spline/procedural/points) and `DT_RailroadConfig` only describe
  track geometry. Track buildings in `DT_Buildings` (Railroad, turns, ramps, Track{Start,End,Uploader,
  Downloader,Transfer,Filter,Merger}) cost Iron Ingot + Plank.
- Component defaults from the jmap CDOs: `TrackStartComponent` `GenerateTime` 10 s, `WagonCapacity` 4;
  `TrackUploaderComponent` / `TrackDownloaderComponent` `CargoCapacity` 4. A wagon carries one
  `CargoData` (`CargoName`, `CargoCount`, `IsFraction`); stations dwell (`StationDwellRemainingTime`)
  and brake (`TrolleyMotionState`).

## Why no `carts` on edges

A wagon line's throughput is (items per wagon × wagons) / round-trip time. Neither factor is in the data:
- items per wagon (`CargoCount` limit) is computed in code (`CargoLoadingData.MaxCount` at runtime);
- the round trip depends on the player's track length and the station dwell/braking, also code.

There is no fixed items/min per rail line comparable to a belt's 60/min, so `SolveEdge.carts` and
`FactoryPlan.logistics` are not added. Adding them honestly needs an in-game measurement of items per
wagon and the dwell time, plus the user's track length.
