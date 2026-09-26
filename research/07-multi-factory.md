# 07 — Linking factories

Pure bookkeeping over solved factories, no LP (`linkFactories(runs)` in `src/features/solver/link.ts`).

- Supply of an item by a factory = its flow into `target:<item>` plus `surplus:<item>`.
- Demand = its flow out of `import:<item>` for items in its `plan.imports`.
- Per item: `supplied`, `demanded`, `balance = supplied − demanded` (< 0 deficit).
- Flows: each supplier's output is split over the importers in proportion,
  `rate(i → j) = supply_i × demand_j / max(supplied, demanded)`. Flows never exceed either side, and a
  short item is shared pro rata. A factory never supplies itself (such pairs are dropped, not re-balanced).
