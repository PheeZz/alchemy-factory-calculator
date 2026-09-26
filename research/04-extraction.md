# 04 — Извлечение данных из файлов игры (билд 25321648, v1.0.49xx)

## Пайплайн (воспроизводимый)
1. Паки с Windows-ПК (`192.168.88.229`, SSH по ключу): `…\Steam\steamapps\common\Alchemy Factory\AlchemyFactory\Content\Paks\*` → `research/game-files/Paks/` (IoStore, **без шифрования**, Oodle).
2. Рефлексия: игра запущена + загружен сейв → `C:\Users\pheezz\af-tools\jmap_dumper.exe --pid <Shipping pid> af.jmap` (jmap v0.2.0). Конверсия в `.usmap` падает (`TryFromIntError`) — не нужна, CUE4Parse читает `.jmap` напрямую. Файл: `research/game-files/mappings/af-<buildid>.jmap`.
   - Публичный `Mappings.usmap` (Nexus mod 5) собран до 1.0 → строки изменённых таблиц **молча пустые**. Не использовать.
3. Экспорт: `tools/extractor` (CUE4Parse 1.2.2.202609, net10) в Docker `linux/amd64`:
   `docker run --rm --platform linux/amd64 -v "$PWD/tools/extractor:/src" -v "$PWD/research/game-files:/gf:ro" -v "$PWD/research/extracted:/out" -v af-nuget:/root/.nuget -w /src mcr.microsoft.com/dotnet/sdk:10.0 sh -c "<команды ниже>"`
   Режим — первый аргумент (`extractor <json|locres|icons> <paks> <out> [jmap] [фильтры…]`):
   - таблицы: `dotnet run -c Release -- json /gf/Paks /out/dt /gf/mappings/af-25321648.jmap /Content/DataTables/`
   - блюпринты построек (CDO-компоненты: CraftType, GrindingSpeed, нагреватели): `dotnet run -c Release -- json /gf/Paks /out/bp /gf/mappings/af-25321648.jmap /Content/Blueprints/Buildings/`
   - локализация (`Localization/Game/<culture>/Game.locres` → `/out/locres/<culture>.json`, `{namespace: {key: text}}`): `dotnet run -c Release -- locres /gf/Paks /out/locres`
   - иконки (Texture2D → PNG в `/out/icons/…`, пишем байты сами — экспортёр CUE4Parse на Linux даёт имена с `\`): `dotnet run -c Release -- icons /gf/Paks /out/icons /gf/mappings/af-25321648.jmap /Content/Arts/UI/Ingredients/ /Content/Arts/UI/Furnitures/ /Content/Arts/UI/Buildings/ /Content/Arts/UI/Interaction/`
4. Нормализация: `pnpm data` (tools/normalize) → `public/data/25321648/`, `public/icons/25321648/`, отчёт `research/05-normalize-report.md`.

## Где что лежит (игра выросла из tower defense, модуль `BeltTD`)
| Таблица | Строк | Что это |
|---|---|---|
| `DT_Enemies` (`BeltTDEnemyConfig`) | 180 | **Предметы**: стек, цена, HeatValue, NutrientValue/Speed, теги, liquid |
| `DT_EnemyCrafting` (`BeltTDCraftingConfig`) | 161 | **Рецепты**: IngredientList, ProductInfo, CraftType(=тип машины), CraftingTime, FractionNum, FailRate/Product 1-2, SideProduct, bAlternate, ProductSequence |
| `DT_Buildings` (`BeltTDBuildingConfig`) | 280 | Постройки: HeatCost, CostList, **GridConfigList (клетки X/Y/Z)**, **InOutList (порты по клеткам: Left/Right/Up/Bottom, In/Out, вертикаль, трубы, MaxLiquidValue)**, Dilation |
| `DT_Attributes` | 34 | Глобальные атрибуты с BaseValue: ConveyerSpeed 60, ConveyerLiftSpeed 60, FactorySpeed 100, FuelEfficiency 100, FertilizerEfficiency 100, Extractor/Alembic/AthanorSkill, *Profit … |
| `DT_UpgradePoints` / `DT_SkillPoints` / `DT_SkillMerge` (`BeltTDSkillConfig`) | 130/154/284 | Тех-дерево и апгрейды (модификаторы атрибутов) |
| `DT_Improvements` | 194 | Эффекты улучшений |
| `DT_Workbench` | 75 | Разблокировки построек на верстаке |
| `DT_PlantSeedConfig` | 9 | Растения: GrowthSeconds, GrowthNutrientValue, GrowthNum, SideGrowthNum |
| `DT_Railroads` / `DT_Trolleys` | 24/1 | Рельсы/вагоны 1.0: Speed/Min/Max |
| `DT_BeltMeshBuildings` / `DT_PipeMeshConfig2` | 81/64 | Конвейерные/трубные сегменты с InOut |
| `DT_Quests`, `DT_SupplyContract`, `DT_Loans`, `DT_GridZones`, `DT_License`, `DT_Customers` | — | Экономика |
| `DT_TempCrafting`, `DT_TempEnemy` | 111/136 | Старые/временные — игнорировать |
| `ST_Localization_*` + `Localization/Game/<culture>/Game.locres` | — | Тексты; есть `en`, `ru` и ещё 8 культур |

## Открытое
- `LocalizedString` в экспорте китайский (`TryChangeCulture("en")` не применился) → режим `locres` читает `Game.locres` напрямую; ключ = `TableNamespace` строковой таблицы (`ST_Localization`) + `Key`. Решено.
- Формулы, зашитые в C++ (как FractionNum/скорость/heat складываются в рантайме), сверять с faultyd3v/starfi5h и в игре.
