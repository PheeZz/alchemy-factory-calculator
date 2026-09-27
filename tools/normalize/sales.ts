import type { SaleBonus, SellType } from '../../src/shared/data/types';
import type { RawAttribute, RawImprovement, RawLicense } from './load';

// Which shop category each profit attribute pays on. The game's GetProfitMultiBySellType picks one
// attribute per EEnemySellType slot (Groceries, Jewelry, Remedies, Artcrafts, Liquid) plus one it adds
// for every type; the pairing below is by name (research/08-profit-and-shop.md).
const ATTRIBUTE_SELL_TYPES: Record<string, SellType[] | 'all'> = {
  GeneralGoodsProfit: ['groceries'],
  PotionProfit: ['remedies'],
  LiquidProfit: ['liquid'],
  JewelProfit: ['jewelry'],
  RelicProfit: ['artcrafts'],
  StoreProfit: 'all',
};

/**
 * Licence lines → sale bonuses. Each tier applies one improvement; the attribute follows the upgrade
 * rule (Base + ΣAdd) × (1 + ΣIncrease/100), and the bonus is its excess over the base (100 %).
 */
export function saleBonuses(
  licenses: Record<string, RawLicense>,
  improvements: Record<string, RawImprovement>,
  attributes: Record<string, RawAttribute>,
): SaleBonus[] {
  const lines = new Map<string, RawLicense[]>();
  for (const l of Object.values(licenses)) if (l.UnlockBuff !== 'None') lines.set(l.LicenseType, [...(lines.get(l.LicenseType) ?? []), l]);
  const out: SaleBonus[] = [];
  for (const tiers of lines.values()) {
    tiers.sort((a, b) => a.LicenseTier - b.LicenseTier);
    const effects = tiers.map((t) => improvements[t.UnlockBuff]?.Effects.find((e) => e.AttributeName in ATTRIBUTE_SELL_TYPES));
    const attribute = effects[0]?.AttributeName;
    if (!attribute || effects.some((e) => e?.AttributeName !== attribute)) continue;
    const base = attributes[attribute]?.BaseValue ?? 100;
    let add = 0;
    let increase = 0;
    const values = [0];
    for (const e of effects) {
      if (e!.ModificationType.endsWith('::Add')) add += e!.ModValue;
      else increase += e!.ModValue;
      values.push(((base + add) * (1 + increase / 100)) / base - 1);
    }
    out.push({ id: attribute, nameKey: tiers[0]!.LicenseText.Key ?? attribute, sellTypes: ATTRIBUTE_SELL_TYPES[attribute]!, maxLevel: tiers.length, values });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}
