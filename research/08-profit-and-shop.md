# 08 — Selling: what the shop buys (build 25321648)

- `DT_Enemies.SellType`: 116 of the 170 items are `Worthless` (raw goods, intermediates, catalysts,
  carts) — they have a `CostValue` but no shop buys them. The other 54 sell in five shop categories:
  Groceries 19, Jewelry 15, Remedies 8, Artcrafts 7 (relics), Liquid 5 (brewed drinks).
  Normalized as `Item.sellType?: 'groceries' | 'remedies' | 'jewelry' | 'liquid' | 'artcrafts' | null`.
- Sale price is taken as `Item.value` (`CostValue`). Not modelled: the per-category profit tracks in
  `DT_Improvements` (GeneralGoodsProfit, PotionProfit, LiquidProfit, JewelProfit, RelicProfit: +10, 14,
  16, 18 … % per level), StoreProfit (+10 %/level), shop reputation, and contracts (`DT_SupplyContract`).
- Sellable raw items: 9 (Ruby, Sapphire, Emerald, and hidden-only goods such as Iron Amulet). None has a
  buy price, so there is no "buy and resell" row in the real data; the profit ranking would include
  such a raw item only if it could be bought.

`rankProfitVariants` (src/features/solver/rank-profit.ts) solves every path of each sellable item at
60/min (hybrid, the path's recipe choices, the chosen fuel/fertilizer/heater) and reports per item and
per machine. Raw cost = Σ raw × (buyPrice ?? value), which already pays for the fuel the chain makes
and burns; the burned fuel's own sale value is reported separately (opportunity cost). Real data:
45 items, 50 paths, ~60–100 ms in node with the default 4 paths per item.
