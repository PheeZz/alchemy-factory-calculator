// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { RawImprovement, RawLicense } from './load';
import { saleBonuses } from './sales';

const licence = (type: string, tier: number, buff: string): RawLicense => ({
  LicenseType: `ELicenseType::${type}`,
  LicenseTier: tier,
  LicenseText: { Key: `License_${type}` },
  UnlockBuff: buff,
});
const buff = (attribute: string, value: number): RawImprovement => ({
  DisplayName: { Key: 'x' },
  Effects: [
    { AttributeName: 'StoreReputation', ModificationType: 'EBeltTDModificationType::Add', ModValue: 8 },
    { AttributeName: attribute, ModificationType: 'EBeltTDModificationType::Increase', ModValue: value },
  ],
});

describe('saleBonuses', () => {
  it('accumulates Increase per licence tier into the multiplier excess; skips recipe-only licences', () => {
    const bonuses = saleBonuses(
      {
        G2: licence('General', 2, 'GeneralGoodsProfit2'),
        G1: licence('General', 1, 'GeneralGoodsProfit1'),
        M1: licence('Minting', 1, 'None'),
      },
      { GeneralGoodsProfit1: buff('GeneralGoodsProfit', 10), GeneralGoodsProfit2: buff('GeneralGoodsProfit', 14) },
      { GeneralGoodsProfit: { BaseValue: 100 } },
    );
    // 100 % → 110 % → 124 %: bonus 0, 0.10, 0.24.
    expect(bonuses).toEqual([
      { id: 'GeneralGoodsProfit', nameKey: 'License_General', sellTypes: ['groceries'], maxLevel: 2, values: [0, expect.closeTo(0.1, 12), expect.closeTo(0.24, 12)] },
    ]);
  });
});
