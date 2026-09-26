// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildLocales } from './locale';

describe('buildLocales', () => {
  it('resolves StringTable keys through the locres namespace, falling back ru → en → key', () => {
    const { locales, missing } = buildLocales(
      [
        { TableId: '/Game/DataTables/ST_Localization_Names.ST_Localization_Names', Key: 'Ingredient_Name_Wood' },
        { TableId: '/Game/DataTables/ST_Localization_Names.ST_Localization_Names', Key: 'OnlyEn' },
      ],
      {
        stringTableNamespaces: { '/Game/DataTables/ST_Localization_Names.ST_Localization_Names': 'ST_Localization' },
        locres: {
          en: { ST_Localization: { Ingredient_Name_Wood: 'Logs', OnlyEn: 'English' } },
          ru: { ST_Localization: { Ingredient_Name_Wood: 'Бревна' } },
        },
      },
      ['ru', 'en'],
    );
    expect(locales.ru).toEqual({ Ingredient_Name_Wood: 'Бревна', OnlyEn: 'English' });
    expect(locales.en).toEqual({ Ingredient_Name_Wood: 'Logs', OnlyEn: 'English' });
    expect(missing.ru).toEqual(['OnlyEn']);
  });
});
