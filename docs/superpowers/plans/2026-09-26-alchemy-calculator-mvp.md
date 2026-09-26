# Alchemy Factory Calculator MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** статический веб-калькулятор цепочек Alchemy Factory (ru/en) на данных, извлечённых из файлов игры.

**Architecture:** Vite+React SPA по FSD. Данные: C#-экстрактор (есть) → TS-нормализатор → `public/data/<build>/`. Солвер — чистый TS + HiGHS (WASM) в Web Worker. UI — React Flow + elkjs, неоновая дизайн-система на Tailwind v4.

**Tech Stack:** pnpm, Vite 8, React 19.3, TypeScript 7 (strict), Tailwind 4.3, motion 13, @xyflow/react 12, elkjs 0.12, highs 1.15, zustand 5, lz-string, Vitest 5 + jsdom + Testing Library, tsx + sharp (скрипты данных).

**Spec:** `docs/superpowers/specs/2026-09-26-alchemy-calculator-design.md` (исполнители читают спеку целиком).

## Global Constraints

- Контракт данных и солвера — ровно типы из `src/shared/data/types.ts` и `src/features/solver/types.ts` (Task 0). Менять контракт — только через оркестратора.
- Источник истины по цифрам — файлы игры (`research/extracted/dt/...`). joejoesgit/starfi5h/faultyd3v — только оракулы для сверки; их данные не копировать в репозиторий.
- Локали: `ru` (по умолчанию, эталон ключей) и `en`. Любая UI-строка — через `useT()`.
- Никаких новых зависимостей без согласования с оркестратором: `package.json` не трогать; если зависимость нужна — остановиться и сообщить.
- Агенты не коммитят. Коммит делает оркестратор после ревью этапа.
- Комментарии — только «почему» (неочевидные решения, ограничения). Шорткаты помечать `// ponytail: <потолок>, <путь апгрейда>`.
- `prefers-reduced-motion` отключает анимации потоков, партиклы и motion-переходы.
- Сырые ассеты игры (`research/game-files`, `research/extracted`, `research/raw`) — никогда в git.
- Валидация каждого таска: `pnpm typecheck && pnpm test` зелёные (+ таск-специфичная команда).

## Review Focus

1. Рецепт с несколькими выходами (побочка/fail) + потребитель побочки в той же цепочке → побочка засчитывается, а не дублируется производством. Тест: Task 2 `multi-output byproduct reuse`.
2. Цикл топлива (Plank сжигается для производства Plank/Charcoal) → LP сходится, топливо = чистое производство минус собственный расход. Тест: Task 2 `self-fuel loop`.
3. Предмет без рецепта и не сырьё (или все рецепты `special`) → внятная ошибка с id предмета, UI предлагает «импорт». Тест: Task 2 `unreachable item error`.
4. Смена билда данных / старый пресет со стёртыми id → пресет загружается, отсутствующие id подсвечены, приложение не падает. Тест: Task 4 `stale preset ids`.
5. Невалидная/урезанная ссылка `#s=` → тост, текущее состояние не затёрто. Тест: Task 4 `broken share link`.

---

### Task 0: Каркас и контракты (оркестратор)

**Files:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/styles.css`, `src/shared/data/types.ts`, `src/features/solver/types.ts`, `src/shared/i18n/{index.ts,ru.ts,en.ts}`, `src/test/setup.ts`.

- [ ] pnpm-проект, все зависимости стека установлены, скрипты: `dev`, `build`, `preview`, `typecheck` (`tsc -b --noEmit`), `test` (`vitest run`), `data` (`tsx tools/normalize/index.ts`).
- [ ] Типы контракта — дословно из спеки §3 и §4.
- [ ] i18n-скелет: `ru.ts` — `as const` словарь; `en.ts: typeof ru`-совместимый (ключи обязаны совпасть — ошибка tsc иначе); `useT()`.
- [ ] `pnpm typecheck && pnpm test && pnpm build` зелёные. Коммит `chore: scaffold app and data/solver contracts`.

### Task 1: Нормализатор данных + иконки (агент, opus)

**Files:** Create `tools/normalize/{index.ts,load.ts,items.ts,recipes.ts,buildings.ts,upgrades.ts,locale.ts,report.ts}`, `tools/normalize/*.test.ts`; Modify `tools/extractor/Program.cs` (режим экспорта текстур), `tools/extractor/Extractor.csproj`; Output `public/data/25321648/{gamedata.json,locale.ru.json,locale.en.json}`, `public/icons/25321648/{items,buildings}/*.webp`, `research/05-normalize-report.md`.

**Interfaces:** Produces `GameData` (из `src/shared/data/types.ts`) в `gamedata.json`; `Record<nameKey,string>` в локалях; иконки по пути `icons/<build>/<kind>/<id>.webp`, в `Item.icon`/`Building.icon` — относительный путь от `public/`.

- [ ] Тест-первым: `recipes.test.ts` — на 3 реальных строках `DT_EnemyCrafting` (Plank/Log, LinseedOil, StarDust) проверить нормализованные партия/время/машина. Семантику `FractionNum` установить по оракулам (faultyd3v: `1 Log → 200 Plank за 400 с`) и зафиксировать в тесте и в отчёте.
- [ ] Маппинг `CraftType` (`EBeltTDCraftType::*`) → здания: из jmap-енама / `DT_Buildings` (ScriptClass/компоненты) + сверка с `machine_types.json` faultyd3v. Enhanced-варианты и их `speedMult`.
- [ ] Предметы (`DT_Enemies`): value/buyPrice/heat/nutrient/liquid/stack/tags; `raw` = нет не-special рецепта с этим выходом.
- [ ] Постройки (`DT_Buildings`): heatCost, buildCost (`CostList`), footprint из `GridConfigList`, ports из `InOutList`, heatSlots (нагреватели: Stone Furnace 9, Blast Furnace 42, Heating Pad 9 — сверить), heatSlotsRequired, category.
- [ ] Апгрейды: 5 треков из `DT_UpgradePoints`→`DT_Improvements`, `values[0..max]`; тест сверяет с формулами сообщества (спека §3).
- [ ] Растения: `DT_PlantSeedConfig` → рецепты с `nutrientPerBatch`; Seed Plot → `special:'seedPlot'`.
- [ ] Локали: ключи `ST_Localization_*` + `Game.locres` для `ru` и `en` (CUE4Parse: экспорт locres или `TryChangeCulture`). Fallback en→ключ.
- [ ] Иконки: экстрактор режим `icons` → PNG `research/extracted/icons/`; нормализатор → webp 64px (sharp). Помнить: CUE4Parse на Linux пишет имена с `\` — нормализовать; SkiaSharp.NativeAssets.Linux.NoDependencies **2.88.9** (ровно под CUE4Parse-Conversion).
- [ ] Отчёт `research/05-normalize-report.md`: каждое расхождение с faultyd3v/starfi5h/joejoesgit (кол-во, время, машина) с классификацией: «игра подтверждает нас», «баг нормализатора» (исправить), «формула в коде игры» (описать). Цель — 0 багов нормализатора.
- [ ] Валидация: `pnpm data && pnpm test tools/normalize` + ссылочная целостность (каждый item/recipe/building id существует) + размер `gamedata.json` ≤ 500 КБ.

### Task 2: Солвер + апгрейды (агент, opus)

**Files:** Create `src/features/solver/{index.ts,model.ts,build-lp.ts,highs.ts,worker.ts,postprocess.ts,errors.ts}`, `src/features/solver/*.test.ts`, `src/features/solver/fixtures/*.ts`, `src/features/upgrades/{multipliers.ts,multipliers.test.ts}`.

**Interfaces:** Consumes `GameData`, `FactoryPlan`, `UpgradeLevels`. Produces `solve(data: GameData, plan: FactoryPlan, levels: UpgradeLevels): Promise<SolveResult>` (чистая, для тестов, HiGHS в том же потоке) и `createSolverClient(): { solve(...): Promise<SolveResult>; dispose(): void }` (Web Worker). `getMultipliers(data, levels): { beltSpeed:number; speed:number; alchemy:number; fuel:number; fertilizer:number }`. Ошибки — `SolverError { code: 'unreachable'|'infeasible'|'unbounded'|'timeout'; item?: ItemId }`.

- [ ] Тест-первым на маленьких рукописных фикстурах `GameData` (5–10 предметов): 
  - `linear chain` — A→B→C, 60/мин C → точные x_r, machinesExact, ceil, utilization;
  - `multi-output byproduct reuse` — рецепт даёт B и побочку D, D нужен другому узлу → D не производится отдельно, излишек D корректен;
  - `self-fuel loop` — Plank-цепочка сама себя греет → баланс сходится;
  - `seed loop` — растение возвращает семена;
  - `import hides subtree` — предмет в `imports` → его рецепты не участвуют, есть ребро `import:<item>`;
  - `fromInput maximize` — supply 100/мин → максимум цели;
  - `unreachable item error` — нет рецепта, не сырьё → `SolverError{code:'unreachable', item}`;
  - `upgrades scale` — factorySpeed уровень 6 → машин в 2.5 раза меньше; conveyor 6 → beltSpeed 150, линии пересчитаны;
  - `port warning` — вход на машину > beltSpeed → `portWarnings`;
  - `optimize raw` — два альтернативных рецепта, выбирается дешёвый по сырью.
- [ ] Реализация по спеке §4 (переменные, баланс, топливо/удобрения линейно, цели). HiGHS: `highs` npm, формат LP-строки или `lp`-модель; в Node-тестах загружать без воркера.
- [ ] `postprocess.ts`: узлы, распределение рёбер производитель→потребитель пропорционально, `belts = ceil(perMin/beltSpeed)`, totals (raw, imports, surplus, byproducts, buildCost по ceil-машинам, money, heat).
- [ ] Числовая гигиена: значения < 1e-9 → 0; округление только в отображении.
- [ ] Валидация: `pnpm test src/features && pnpm typecheck`.

### Task 3: Дизайн-система и UI-оболочка (агент, opus + frontend-design)

**Files:** Create `src/shared/ui/*` (Panel, Button, IconButton, NumberInput, Select, SearchCombobox, Tooltip, Tabs, Sheet, Toast, ItemIcon, GlowBadge, ParticlesBackground), `src/app/styles.css` (токены темы), `src/features/graph/{GraphView.tsx,nodes/*.tsx,edges/*.tsx,layout.ts,layout.test.ts}`, `src/features/target-picker/*`, `src/features/node-inspector/*`, `src/features/summary/*`, `src/features/upgrades/UpgradesPanel.tsx`, `src/features/factory/{store.ts,store.test.ts,FactoryList.tsx}`, `src/pages/calculator/CalculatorPage.tsx`, `src/shared/i18n/{ru,en}.ts` (строки UI).

**Interfaces:** Consumes типы контракта; до Task 4 работает на фикстуре `src/features/graph/fixtures/demo-result.ts` (реалистичный `SolveResult` на 8–12 узлов с импортом, излишком, топливом) и `demo-gamedata.ts`. Produces `useFactoryStore` (zustand+persist: `factories`, `activeId`, `levels`, `lang`, actions `setTarget/addTarget/removeTarget/setRecipe/setBuilding/toggleImport/setFuel/setFuelFor/setFertilizer/setMode/setSupply/setLevels/...`), `<CalculatorPage data result status onRetry/>`.

- [ ] Визуальный язык по спеке §5: токены (фон, стекло, неон циан/маджента/янтарь/изумруд), свечение только на акцентах, tabular-nums, контраст AA, шрифты с кириллицей (подключить через `@fontsource` — если нет в зависимостях, сообщить оркестратору).
- [ ] Граф: elkjs layered LR в `layout.ts` (тест: узлы не перекрываются, порядок слоёв сырьё→цель), кастомные узлы (иконки машины+выхода, «4× (3,4) · 85%», значок топлива, импорт/излишек/цель стилизованы), рёбра (иконка предмета, «120/мин · 2 линии», анимированный поток со скоростью ~ потоку; реже при reduced-motion), выбор узла → инспектор.
- [ ] Адаптив: ≥1024 — 3 колонки + нижняя сводка; <1024 — граф на весь экран, панели в Sheet/Tabs.
- [ ] Партиклы: canvas ≤60 частиц, пауза при `visibilitychange`, выкл при reduced-motion.
- [ ] Стор: persist с `version` + `migrate`; тест `store.test.ts` (добавление цели, импорт-тоггл, persist round-trip).
- [ ] a11y: нативные элементы, фокус-кольца, клавиатура в комбобоксе и графе (Tab по узлам).
- [ ] Валидация: `pnpm typecheck && pnpm test && pnpm build`; скриншоты desktop 1440 и mobile 390 через Playwright (`pnpm dev` + MCP playwright) приложить путями в отчёт.

### Task 4: Интеграция (оркестратор/агент после Task 1–3)

**Files:** `src/shared/data/load.ts`, `src/features/solver/useSolve.ts`, `src/features/factory/share.ts` (+`share.test.ts`), `src/features/factory/io.ts` (export/import JSON, +тест), `src/app/App.tsx`, `src/features/solver/golden.test.ts`.

- [ ] Загрузка `gamedata.json` + локали активного языка (fetch от `import.meta.env.BASE_URL`), экран ошибки с повтором.
- [ ] `useSolve`: debounce 150 мс, воркер, отмена устаревших, статусы.
- [ ] Шаринг `#s=` (lz-string), тесты: round-trip, `broken share link` → тост, состояние цело.
- [ ] `stale preset ids` тест: пресет с отсутствующими id → загружается, id помечены.
- [ ] Golden-тесты на реальных данных: ≥10 целей разных машин; ожидания посчитаны вручную по формулам (спека §4) и сверены со starfi5h; расхождения задокументированы в отчёте.
- [ ] Коммит этапа.

### Task 5: Ревью и полировка (агенты-ревьюеры + оркестратор)

- [ ] Code Reviewer (opus): корректность солвера/нормализатора, контракт, фильтр «что сломается у пользователя».
- [ ] UI-ревью по скриншотам (читаемость, перегруз, адаптив, reduced-motion), Accessibility Auditor.
- [ ] Фиксы по находкам, повторная валидация, e2e smoke (Playwright): выбрать предмет → граф → сменить рецепт → импорт → ссылка открывает то же.
- [ ] GitHub Pages: `vite base` из env, workflow `.github/workflows/pages.yml` (без пуша — только файл).
- [ ] Обновить vault `alchemy-factory/` (progress, решения).
