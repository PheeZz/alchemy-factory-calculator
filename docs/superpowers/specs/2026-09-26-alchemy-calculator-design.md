# Alchemy Factory Calculator — дизайн MVP

Дата: 2026-09-26 · Игра: Alchemy Factory 1.0, билд 25321648 · Статус: утверждено (автономный режим)

## 1. Цель и рамки

Веб-калькулятор производственных цепочек Alchemy Factory. Для личного использования с заделом под публикацию на GitHub Pages.

**Пользователь задаёт** завод: несколько целей (предмет + шт/мин) **или** режим «от входа» (есть X/мин ресурса → максимум цели). **Получает** граф цепочки и сводку:
- машины на узел: точное дробное + округлённое вверх + загрузка %;
- потоки предметов по рёбрам, число конвейерных линий, предупреждение «порт машины упирается в скорость конвейера»;
- промежуточные продукты, излишки/побочка, исходное сырьё, импорт;
- топливо (нагрев) и удобрения;
- стоимость постройки (предметы + валюта) и стоимость покупного сырья в валюте.

**Управление:** выбор рецепта для предмета (альтернативы), выбор машины для рецепта (варианты: обычная/Enhanced и т.п.), «импорт» узла (скрыть поддерево — ресурс приходит с другого завода), глобальное топливо/удобрение завода + переопределение на узле, уровни 5 производственных линий апгрейдов (глобальный профиль игрока), сравнение «до/после» при смене уровней.

**Пресеты:** несколько заводов, хранение в localStorage, экспорт/импорт JSON, ссылка-шаринг (состояние сжато в URL).

**Локализация:** ru (основная, по умолчанию), en. Названия предметов/машин — из локализации игры.

### Вне MVP (следующие циклы, модель данных не должна им мешать)
- Тех-дерево (154 навыка): фильтр по изученному. В данных уже есть поле `unlockedBy`.
- Мульти-завод: связывание выхода одного завода с импортом другого.
- 3D-планировщик (r3f, glTF-модели, сетка из `GridConfigList`, порты из `InOutList`).
- Cauldron-комбинатор (выбор выхода по «стоимости» ингредиентов), катализаторы Advanced Athanor, паровое отопление (Steam Boiler/Heating Pad), рельсы/вагоны, Seed Plot (ручной).
  В MVP такие рецепты помечены `special` и солвер их не использует автоматически.

## 2. Архитектура

Статическое SPA: **Vite + React 19 + TypeScript (strict)**. Деплой — GitHub Pages (base path настраиваемый).

```
tools/extractor/          C# (CUE4Parse) — паки → сырой JSON таблиц + иконки PNG   [есть]
tools/normalize/          TS (Node) — сырой JSON → нормализованные данные + отчёт сверки
public/data/<build>/      gamedata.json, locale.ru.json, locale.en.json
public/icons/<build>/     webp 64px (items/, buildings/)
src/
  app/                    корень, провайдеры, роутинг-состояние, глобальные стили
  shared/
    data/                 типы контракта данных (GameData), загрузка
    i18n/                 словари UI ru/en + useT(), имя сущности по локали
    ui/                   дизайн-система (неон): Panel, Button, NumberInput, Select, Icon, Tooltip, ...
    lib/                  форматирование чисел/времени, lz-сжатие URL
  entities/               item, recipe, building — селекторы/хелперы чтения GameData
  features/
    solver/               ЧИСТЫЙ TS: план → LP → результат. Без React.
    upgrades/             профиль апгрейдов → множители
    factory/              стор заводов/пресетов (zustand + persist), шаринг
    graph/                граф React Flow + elkjs раскладка, узлы/рёбра с иконками
    summary/              таблицы сводки
    target-picker/        выбор предмета/цели
    node-inspector/       панель узла: рецепт, машина, топливо, импорт
  pages/calculator/       композиция экрана
```

Слоистость: `pages → features → entities → shared`. Солвер зависит только от `shared/data` типов.

## 3. Контракт данных (`public/data/<build>/gamedata.json`)

```ts
type ItemId = string;      // игровой RowName из DT_Enemies, напр. "IronIngot"
type RecipeId = string;    // RowName из DT_EnemyCrafting
type BuildingId = string;  // RowName из DT_Buildings

interface GameData {
  build: { id: string; version: string };          // "25321648", "1.0.4962"
  items: Record<ItemId, Item>;
  recipes: Record<RecipeId, Recipe>;
  buildings: Record<BuildingId, Building>;
  upgrades: UpgradeTrack[];                         // 5 производственных линий
  constants: { baseBeltSpeed: number };             // 60 (DT_Attributes.ConveyerSpeed)
}

interface Item {
  id: ItemId; nameKey: string; icon: string | null;
  value: number;                 // цена в меди (1 серебро = 1000, 1 золото = 100000)
  buyPrice: number | null;       // если покупается (Purchasing Portal), в меди
  heatValue: number;             // >0 → топливо
  nutrientValue: number;         // >0 → удобрение
  liquid: boolean; maxStack: number; tags: string[];
  raw: boolean;                  // не производится ни одним не-special рецептом
}

interface Recipe {
  id: RecipeId; nameKey: string;
  buildings: BuildingId[];       // где крафтится (по CraftType), первый — по умолчанию
  inputs: Stack[];               // за ОДНУ партию (qty уже × FractionNum)
  outputs: OutputStack[];        // за партию, ожидаемые значения (fail/side учтены)
  timeSec: number;               // за партию при speedMult=1 (CraftingTime × FractionNum)
  heatPerSec: number | null;     // переопределение нагрева, если задан на рецепте
  nutrientPerBatch: number | null;
  alternate: boolean;
  special: null | 'cauldron' | 'catalyst' | 'seedPlot' | 'steam' | 'portal';
  unlockedBy: string | null;     // навык/верстак — на будущее
  yieldSkill: boolean;           // выход множится AlchemySkill (Extractor/Alembic)
}
interface Stack { item: ItemId; qty: number }
interface OutputStack extends Stack { chance: number }  // 1 для основного; qty — ожидаемое кол-во с учётом chance

interface Building {
  id: BuildingId; nameKey: string; icon: string | null;
  category: 'production' | 'heating' | 'logistics' | 'farming' | 'other';
  speedMult: number;             // 1, Enhanced = 2 и т.п.
  heatCost: number;              // тепло/с во время работы при speedMult=1 (0 — не греется)
  heatSlots: number | null;      // для нагревателей: сколько клеток-слотов даёт
  heatSlotsRequired: number;     // сколько слотов нагревателя занимает машина
  buildCost: Stack[];            // предметы
  buildCostMoney: number;        // в меди, если есть
  footprint: { cells: {x:number;y:number;z:number}[] };  // для 3D и площади
  ports: Port[];
}
interface Port { cell: {x:number;y:number;z:number}; side: 'left'|'right'|'up'|'bottom'|'top'|'base'; dir: 'in'|'out'|'both'; pipe: boolean }

interface UpgradeTrack {
  id: 'conveyor' | 'factorySpeed' | 'alchemySkill' | 'fuelEfficiency' | 'fertilizerEfficiency';
  nameKey: string; maxLevel: number;
  values: number[];              // значение множителя/скорости на уровне 0..maxLevel (из DT_Improvements)
}
```

Локали `locale.<lang>.json`: `Record<nameKey, string>` для игровых сущностей. UI-строки — в `src/shared/i18n/`.

**Правила нормализации** (tools/normalize, проверяются отчётом сверки):
- Партия = `qty × FractionNum`, время = `CraftingTime × FractionNum` (подтверждено: 1 Log → 200 Plank за 400 с).
- Fail/Side продукты → дополнительные `outputs` с ожидаемым qty; основной выход уменьшается на fail-rate, если игра так считает (сверить со starfi5h).
- `special`-рецепты и скрытые (`bHideInGame`) / недостижимые (не открываются навыками — ~10 шт) — помечаются, не удаляются.
- Значения апгрейдов берутся из `DT_UpgradePoints` → `DT_Improvements`; сверяются с формулами сообщества (belt 60+15·min(l,12)+3·max(l−12,0); speed 1+0.25·min(l,12)+0.05·max(l−12,0); fuel/fert 1+0.1·l; alchemy — таблица p_i).
- Enhanced-машины: `speedMult` из данных игры (если найден), иначе из starfi5h с пометкой в отчёте.
- Отчёт сверки `research/05-normalize-report.md`: расхождения по каждому рецепту с faultyd3v (кол-ва/время) и starfi5h (кол-ва/время/машины). Цель — 0 необъяснённых расхождений.

## 4. Солвер (`src/features/solver`, чистый TS)

### Вход
```ts
interface FactoryPlan {
  targets: { item: ItemId; rate: number }[];               // шт/мин
  mode: 'targets' | 'fromInput';
  supplies: { item: ItemId; rate: number }[];              // для fromInput: доступный вход, шт/мин
  maximize?: ItemId;                                       // для fromInput
  recipeFor: Record<ItemId, RecipeId>;                     // ручной выбор рецепта; нет → рецепт по умолчанию
  buildingFor: Record<RecipeId, BuildingId>;
  imports: ItemId[];                                       // скрытые поддеревья: берутся извне
  fuel: ItemId | null; fuelFor: Record<RecipeId, ItemId>;  // глобально + переопределение
  fertilizer: ItemId | null; fertilizerFor: Record<RecipeId, ItemId>;
  optimize: null | 'raw' | 'machines' | 'money';           // null = гибрид с ручными выборами
}
interface UpgradeLevels { conveyor: number; factorySpeed: number; alchemySkill: number; fuelEfficiency: number; fertilizerEfficiency: number }
```

### Модель
- Переменные: `x_r ≥ 0` — партий/мин рецепта r (в гибриде — только выбранные рецепты достижимых предметов; в `optimize` — все не-special рецепты), `imp_i ≥ 0` — импорт/сырьё, `sur_i ≥ 0` — излишек.
- Баланс для каждого предмета: `Σ out(r,i)·x_r − Σ in(r,i)·x_r − fuel_i − fert_i + imp_i − sur_i = target_i`.
- `imp_i` разрешён только для сырья (`raw`), предметов из `imports` и (в `fromInput`) предметов из `supplies` с `imp_i ≤ supply_i`.
- Топливо линейно: машин `m_r = x_r · timeSec / (60 · speed_r)`; тепло/с = `m_r · heatCost_b · speed_r` = `x_r · timeSec · heatCost_b / 60`; топливо шт/мин = `тепло/с · 60 / (heatValue_f · fuelMult)`. Потребление добавляется в баланс предмета-топлива (оно может производиться в цепочке → циклы решаются LP).
- Удобрения аналогично через `nutrientPerBatch · x_r / (nutrientValue · fertMult)`.
- `speed_r = building.speedMult · factorySpeedMult`; выход `yieldSkill`-рецептов × alchemyMult.
- Цель: `targets` → min `Σ w_i·imp_i + ε·Σ sur_i` (w — стоимость сырья по режиму); `fromInput` → max `produce(maximize)`.
- LP-движок: **HiGHS (highs-js, WASM)**, ленивая загрузка, в Web Worker. Инфизибл/анбаунд → понятная ошибка с указанием предмета (нет рецепта и не сырьё → предложить «импорт»).

### Выход
```ts
interface SolveResult {
  nodes: { id: string; recipe: RecipeId; building: BuildingId; batchesPerMin: number;
           machinesExact: number; machines: number; utilization: number;
           fuel?: { item: ItemId; perMin: number }; fertilizer?: { item: ItemId; perMin: number };
           portWarnings: { item: ItemId; perMachine: number; beltSpeed: number }[] }[];
  edges: { from: string; to: string; item: ItemId; perMin: number; belts: number }[];  // from/to: node id | 'import:<item>' | 'target:<item>' | 'surplus:<item>'
  totals: { raw: Stack[]; imports: Stack[]; surplus: Stack[]; byproducts: Stack[];
            buildCost: Stack[]; buildCostMoney: number; rawMoneyPerMin: number;
            machines: { building: BuildingId; count: number }[]; heatPerSec: number };
  beltSpeed: number;
}
```
Рёбра строятся распределением потоков производителей по потребителям пропорционально (детерминированно). Линии конвейера = `ceil(perMin / beltSpeed)`. Порт-предупреждение: вход/выход на одну машину > beltSpeed при числе портов этого направления (из `ports`), делённом поровну.

## 5. UI

**Экран калькулятора (desktop ≥1024):** слева — список заводов + цели (выбор предмета с поиском по ru/en и иконками, rate), апгрейды; центр — граф; справа — инспектор выбранного узла (рецепт/альтернативы, машина, топливо/удобрение, «импорт»); снизу — сводка (сырьё, излишки, машины, стоимость, тепло) раскрывающейся панелью. **Mobile:** граф на весь экран, панели — bottom sheets/табы.

**Граф:** React Flow, раскладка elkjs слева→направо (сырьё → цель). Узел: иконка машины + иконка выхода, «4× Crucible (3,4) · 85%», топливо значком. Ребро: иконка предмета + «120/мин · 2 линии», анимированный поток (скорость анимации ~ поток), цвет по типу (жидкость/тепло/обычное). Импорт/излишек — отдельные стилизованные узлы.

**Визуальный язык «алхимический неон»:** тёмный фон (глубокий индиго/почти чёрный), неоновые акценты: циан (потоки), маджента/фиолет (алхимия, выбор), янтарь (тепло/топливо), изумруд (удобрения/растения). Свечение (box-shadow/drop-shadow), стекло (backdrop-blur) панелей, микроанимации (motion), фоновые партиклы — лёгкий canvas (≤ 60 частиц, пауза вне вкладки), всё выключается при `prefers-reduced-motion`. Читаемость важнее эффектов: контраст текста WCAG AA, свечение только на акцентах, числа — моноширинный tabular font. Шрифты: заголовки — декоративный с кириллицей (напр. «Cormorant»/«Philosopher»), текст — Inter/Manrope.

**Стек UI:** Tailwind CSS v4 (токены темы в CSS-переменных), motion, @xyflow/react, elkjs, zustand, lz-string. Компоненты — свои лёгкие в `shared/ui` (без тяжёлых kit-ов), доступные (нативные элементы, фокус, клавиатура).

**i18n:** собственный лёгкий модуль: словари `ru.ts`/`en.ts` (ru — эталон типов, en обязан совпадать по ключам), `useT()`, язык в сторе, авто по `navigator.language` при первом запуске, по умолчанию ru.

## 6. Хранение и шаринг
- zustand `persist` → localStorage: профиль апгрейдов, заводы (`FactoryPlan` + имя + id), язык, UI-настройки. Версия схемы + миграции.
- Экспорт/импорт JSON всех заводов. Ссылка `#s=<lz-string(JSON завода)>`.
- Данные игры версионированы по build; при смене build сохранённые id, которых нет, подсвечиваются.

## 7. Ошибки
- Загрузка данных — экран ошибки с повтором.
- Солвер: инфизибл → сообщение с предметом и кнопкой «пометить как импорт». Таймаут воркера → сообщение.
- Невалидная ссылка/JSON → тост, состояние не трогаем.

## 8. Тестирование
- Vitest. Солвер: юнит-тесты на маленьких фикстурах (линейная цепочка, мультивыход, цикл топлива, цикл семян, импорт, fromInput, апгрейды) + **золотые кейсы на реальных данных**, сверенные со starfi5h (≥10 рецептов разных машин).
- Нормализатор: отчёт сверки + тест, что 0 необъяснённых расхождений и все ссылки (item/recipe/building) валидны.
- UI: typecheck, линт, сборка; smoke-проверка в браузере (Playwright) ключевого сценария: выбрать предмет → граф → сменить рецепт → импорт → шаринг-ссылка открывает то же.
- Бандл: ленивые HiGHS и elkjs; целевой initial JS ≤ 300 КБ gzip (без данных).

## 9. Ассеты и публикация
- Иконки: экстрактор → PNG → webp 64px в `public/icons/<build>/`. Коммитятся (производные, малые).
- 3D-модели: не в MVP; когда будут — отдельный gitignored каталог, в публичной сборке по умолчанию выключены (фолбэк — коробки по футпринту).
- Сырые паки, jmap, выгрузки таблиц — никогда в git.
