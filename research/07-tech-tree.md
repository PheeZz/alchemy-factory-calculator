# 07 — Tech tree (build 25321648)

## Source

- `DT_SkillPoints` — the research tree: 154 rows, of which 40 are `Deprecated` (1.0 moved décor and
  devices to the Workbench or dropped them). `DT_SkillMerge` = `DT_SkillPoints` + `DT_UpgradePoints`
  (the 130 improvement rows behind the 5 upgrade tracks), so it adds nothing.
- `DT_Workbench` — 75 buildings gated by a prerequisite skill (`UnlockSkillName`), with no cost of their
  own (`UnlockCost` empty in every row).
- `DT_License`, `DT_Quests` — shop licences and main quests. They gate selling and give rewards;
  they do not unlock recipes or machines, so the calculator ignores them.

Row fields used: `Tier` (0–9, = the game's 10 levels), `Predecessors`, `UnlockCost` (money vector
X gold / Y silver / Z copper, same encoding as item prices), `UnlockResearchPoints`, `UnlockItem`
(`ConfigType` Ingredients | ConstructOptions | CraftingRecipes + `ConfigName`), `LevelUnlockItems`
(raw items that become purchasable), `ExtraUnlockConstructions`, `Deprecated`.

- 114 live nodes, one root (`Level1`), tiers 0–9. Types: 10 level nodes (`Level1`…`Level10`, each unlocks
  a batch of buyable raw items), 36 building nodes, 68 recipe nodes.
- Every node of a tier costs the same: money 100, 230, 570, 1600, 4400 copper (tiers 0–4), 12, 43, 136
  silver (5–7), 5, 21 gold (8–9); research points 30, 57, 90, 129, 174, 225, 282, 345, 414, 489.
  No node costs items.

## Normalized contract (`GameData.tech?: TechNode[]`)

`{ id, nameKey, icon, cost: Stack[] (always empty), costMoney (copper), researchPoints, requires, unlocks: { recipes, buildings, items }, stage }`

- `requires`: `Predecessors` with deprecated nodes bridged to their own live predecessors.
- `unlocks.recipes`: recipes whose own node this is; nursery rows sit under the level node that sells
  their seed. 210 non-special recipes have no node of their own (Charcoal, IronIngot, Paradox_*, boiler
  settings, deprecated coin/alt rows, …): they are gated only by their machine.
- `unlocks.buildings`: every building the node unlocks, including logistics and décor not in
  `GameData.buildings` (their names/icons are exported for the tree view) and Workbench items.
- `unlocks.items`: `LevelUnlockItems`.
- `Recipe.unlockedBy` is unchanged (the later of recipe node and machine node) and always names a live node.
- `nameKey`/`icon`: of the unlocked entity; `null` for level nodes (show "Level N" from `stage`).

## Solver

`FactoryPlan.unlocked?: string[] | null` (null/absent = all open). `techClosure(data, ids)` adds all
prerequisites. With a closure `open`:

- a recipe listed under a node is used automatically only if that node is open (manual `recipeFor`
  still wins, like hidden recipes);
- a machine is usable only if some node that unlocks it is open (`buildingFor` falls back to an open one);
- a raw item can be bought only if its level node is open (explicit `plan.imports` are not gated);
- heaters follow the same rule.

A target that becomes unreachable throws `SolverError('unreachable', item, …, requiredTech)`.
`requiredTechFor(data, plan)` solves the plan with everything open and returns the owners of its
recipes, machines, heaters and bought raw items, with prerequisites, minus what is already open,
ordered by tier. Example: Iron Ingot with Coal from Level 1 → Grinder, TableSaw, Level2, Mortar,
Processor, StoneCrusher, Assembler, HealingPotion, IronSmelter, Level3, StoneStove, Blender, Clay,
Crucible, Glass, Kiln, Level4, VitalityPotion, Level5 (Coal Ore is sold from Level 5).
This is minimal for the planner's default recipe path, not across all alternatives.
