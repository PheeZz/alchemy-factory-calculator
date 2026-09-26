// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildLocales, disambiguate } from './locale';

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

describe('disambiguate', () => {
  it('numbers colliding names in game order and leaves unique ones alone', () => {
    const locales: Record<string, Record<string, string>> = {
      ru: { Sand: 'Очищенный песок', Stone: 'Камень' },
      en: { Sand: 'Refined Sand', Stone: 'Stone' },
    };
    const derived = disambiguate(
      [
        { id: 'Sand3', nameKey: 'Sand', order: 623 },
        { id: 'Sand2', nameKey: 'Sand', order: 622 },
        { id: 'Stone', nameKey: 'Stone', order: 1 },
      ],
      locales,
    );
    expect([...derived]).toEqual([['Sand2', 'Sand#Sand2'], ['Sand3', 'Sand#Sand3']]);
    expect(locales.ru!['Sand#Sand3']).toBe('Очищенный песок II');
    expect(locales.en!['Sand#Sand2']).toBe('Refined Sand I');
  });
});
