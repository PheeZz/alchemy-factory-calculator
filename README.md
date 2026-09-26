# Alchemy Factory Calculator

Калькулятор производственных цепочек для [Alchemy Factory](https://store.steampowered.com/app/3669570/Alchemy_Factory/) (1.0).
Production chain calculator for Alchemy Factory — RU / EN.

- Цели в шт/мин или режим «от входа», граф цепочки, машины (точно и с округлением), линии конвейера, топливо, удобрения, излишки, сырьё и стоимость.
- Альтернативные рецепты и машины, импорт узлов с другого завода, уровни улучшений.
- Солвер — линейное программирование (HiGHS) в Web Worker.

Данные извлечены из файлов игры (билд 25321648) — см. `research/04-extraction.md`, `tools/`.
Fan-made, not affiliated with D5 Copperhead / Gamirror Games. Game names and icons belong to their owners.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test
pnpm data       # regenerate public/data from extracted tables (needs research/extracted, gitignored)
```
