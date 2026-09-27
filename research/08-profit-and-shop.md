# 08 — Selling: what the shop buys (build 25321648)

- `DT_Enemies.SellType`: 116 of the 170 items are `Worthless` (raw goods, intermediates, catalysts,
  carts) — they have a `CostValue` but no shop buys them. The other 54 sell in five shop categories:
  Groceries 19, Jewelry 15, Remedies 8, Artcrafts 7 (relics), Liquid 5 (brewed drinks).
  Normalized as `Item.sellType?: 'groceries' | 'remedies' | 'jewelry' | 'liquid' | 'artcrafts' | null`.
- Sale price is `Item.value` (`CostValue`) × the licence multiplier below. Not modelled: shop
  reputation, daily profit coefficient (`GetDailyProfitCoef`), and contracts (`DT_SupplyContract`,
  `ContractProfit`).

## Licence bonuses (`GameData.saleBonuses`)

The profit "tracks" are not skill upgrades: `DT_UpgradePoints` never references them. They come from
shop licences — `DT_License` rows, one line per `LicenseType`, each tier with an `UnlockBuff` naming a
`DT_Improvements` row (plus a money price and a prerequisite licence/level):

| Licence line | Attribute | Shop category (`sellType`) | Tier bonuses (cumulative) |
|---|---|---|---|
| General (Sundries Recognition) | GeneralGoodsProfit | groceries | +10, 24, 40, 58, 80 % |
| Potion (Apothecary) | PotionProfit | remedies | same |
| Tavern | LiquidProfit | liquid | same |
| Jewellery | JewelProfit | jewelry | same |
| Relic Trading Warrant | RelicProfit | artcrafts | same |
| Alchemist (Licensed Alchemist) | StoreProfit | all | +10, 20, 30, 40 % |

(Minting and Supplier licences unlock coin recipes and contracts; ContractProfit is left out.)
Each attribute has `BaseValue` 100 (%) and follows the upgrade rule (Base + ΣAdd) × (1 + ΣIncrease/100).

Verified in the game binary (`BeltTDGameStateBase::GetProfitMultiBySellType`, jmap + objdump as in
06-steam.md): multiplier = attrA × 0.01 + attrB(sellType) × 0.01 − 1.0, where attrA is one attribute read
for every type and attrB is chosen by a switch over `EEnemySellType` (Groceries, Jewelry, Remedies,
Artcrafts, Liquid; Worthless/Vehicles get 0). So **bonuses add**: tier 5 groceries + tier 4 store =
1 + 0.8 + 0.4 = 2.2×, not 1.8 × 1.4. The attribute behind each slot is referenced by an FName read at
run time, so the pairing (store-wide = StoreProfit, slot → category attribute) is by name — high
confidence (names and counts match one to one) but not proven from the binary.

`rankProfitVariants` takes `saleLevels: Record<bonusId, tier>` and prices each item at
value × (1 + Σ bonuses covering its category).
- Sellable raw items: 9 (Ruby, Sapphire, Emerald, and hidden-only goods such as Iron Amulet). None has a
  buy price, so there is no "buy and resell" row in the real data; the profit ranking would include
  such a raw item only if it could be bought.

`rankProfitVariants` (src/features/solver/rank-profit.ts) solves every path of each sellable item at
60/min (hybrid, the path's recipe choices, the chosen fuel/fertilizer/heater) and reports per item and
per machine. Raw cost = Σ raw × (buyPrice ?? value), which already pays for the fuel the chain makes
and burns; the burned fuel's own sale value is reported separately (opportunity cost). Real data:
45 items, 50 paths, ~60–100 ms in node with the default 4 paths per item.
